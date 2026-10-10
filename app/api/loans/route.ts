import { termsSchema, termErrors, validationError } from '@/lib/validation';
import { cents } from '@/lib/portfolio';
import { getPortfolioOwner, sameOrigin, sha256 } from '@/app/owner';
import { getDb } from '@/db';
import { loans, borrowers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { databaseError } from '@/lib/api-errors';
const schema=termsSchema.extend({borrowerId:z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/).optional(),operationKey:z.string().uuid(),consent:z.boolean().default(false),reminderDays:z.number().int().min(0).max(30).default(0)});
export async function POST(req:Request){
 if(!sameOrigin(req))return Response.json({error:'Solicitud rechazada'},{status:403});
 const owner=await getPortfolioOwner();if(!owner)return Response.json({error:'Sesión requerida'},{status:401});
 const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return Response.json({error:validationError(parsed)},{status:400});
 const p=parsed.data,requestHash=await sha256(JSON.stringify(p)),db=getDb();
 const previous=async()=>{const [r]=await db.select().from(loans).where(and(eq(loans.owner,owner),eq(loans.operationKey,p.operationKey))).limit(1);return r?Response.json(r.requestHash===requestHash?r:{error:'La clave de operación ya se utilizó con otros datos'},{status:r.requestHash===requestHash?200:409}):null;};
 try{
 const retry=await previous();if(retry)return retry;
 const error=termErrors(p);if(error)return Response.json({error},{status:400});
 let borrowerId=p.borrowerId;
 if(borrowerId){const [found]=await db.select().from(borrowers).where(and(eq(borrowers.id,borrowerId),eq(borrowers.owner,owner))).limit(1);if(!found)return Response.json({error:'Persona no encontrada'},{status:404});p.name=found.name;p.phone=found.phone;}
 else borrowerId=crypto.randomUUID();
 const record={...p,borrowerId,id:crypto.randomUUID(),owner,principalCents:cents(p.principal),requestHash,consent:p.consent?1:0,createdAt:new Date().toISOString(),changeReason:'Alta del préstamo'};
 const insert=db.insert(loans).values(record).returning();
 const saved=p.borrowerId?await insert:(await db.batch([db.insert(borrowers).values({id:borrowerId,owner,name:p.name,phone:p.phone,createdAt:record.createdAt}),insert]))[1];
 return Response.json(saved[0],{status:201});
 }catch(error){const retry=await previous();return retry||databaseError(error);}
}
