import {getCurrentUser,sameOrigin} from '@/app/owner';
import {hashPassword,verifyPassword} from '@/app/password';
import {getDb} from '@/db';
import {users,sessions} from '@/db/schema';
import {eq} from 'drizzle-orm';
import {z} from 'zod';
const schema=z.object({action:z.enum(['secondary','password']),email:z.string().email().max(254).optional(),password:z.string().min(12).max(200),currentPassword:z.string().min(1).max(200)});
export async function GET(){const actor=await getCurrentUser();if(!actor)return Response.json({error:'Sesión requerida'},{status:401});return Response.json({actor,administrators:await getDb().select({id:users.id,email:users.email}).from(users)},{headers:{'Cache-Control':'no-store'}});}
export async function POST(req:Request){if(!sameOrigin(req))return Response.json({error:'Solicitud rechazada'},{status:403});const actor=await getCurrentUser();if(!actor)return Response.json({error:'Sesión requerida'},{status:401});const p=schema.safeParse(await req.json().catch(()=>null));if(!p.success)return Response.json({error:'Revisa los datos. La nueva contraseña requiere 12 caracteres.'},{status:400});const db=getDb(),[user]=await db.select().from(users).where(eq(users.id,actor));if(!user||!await verifyPassword(p.data.currentPassword,user.passwordHash))return Response.json({error:'Contraseña actual incorrecta'},{status:403});
 if(p.data.action==='secondary'&&(actor!=='primary'||!p.data.email))return Response.json({error:'Solo el acreedor principal configura el segundo acceso'},{status:403});
 const id=p.data.action==='secondary'?'secondary':actor,passwordHash=await hashPassword(p.data.password);
 try{if(p.data.action==='secondary'){await db.batch([db.insert(users).values({id,email:p.data.email!.trim().toLowerCase(),passwordHash,createdAt:new Date().toISOString()}).onConflictDoUpdate({target:users.id,set:{email:p.data.email!.trim().toLowerCase(),passwordHash}}),db.delete(sessions).where(eq(sessions.userId,id))]);}else{await db.batch([db.update(users).set({passwordHash}).where(eq(users.id,id)),db.delete(sessions).where(eq(sessions.userId,id))]);}return Response.json({ok:true});}catch{return Response.json({error:'No se pudo guardar. El correo puede estar en uso.'},{status:409});}
}
