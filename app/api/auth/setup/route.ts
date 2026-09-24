import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/app/password";
import { sameOrigin } from "@/app/owner";
import { z } from "zod";

const input=z.object({email:z.string().email().max(254),password:z.string().min(12).max(200),setupKey:z.string().min(24)});
export async function POST(req:Request){
 if(!sameOrigin(req))return Response.json({error:"Solicitud rechazada"},{status:403});
 const parsed=input.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return Response.json({error:"Revisa el correo, la clave de instalación y la contraseña (mínimo 12 caracteres)"},{status:400});
 // Una instancia nueva requiere una clave configurada fuera del código.
 if(!env.SETUP_KEY || parsed.data.setupKey!==env.SETUP_KEY)return Response.json({error:"Clave de instalación incorrecta"},{status:403});
 const db=getDb();const existing=await db.select({id:users.id}).from(users).limit(1);
 if(existing.length)return Response.json({error:"La cuenta inicial ya existe"},{status:409});
 try{await db.insert(users).values({id:"primary",email:parsed.data.email.trim().toLowerCase(),passwordHash:await hashPassword(parsed.data.password),createdAt:new Date().toISOString()});return Response.json({ok:true},{status:201})}
 catch{return Response.json({error:"No se pudo crear la cuenta"},{status:409})}
}
