import { positiveMoney, moneyAmount, receivedDate, validationError } from '@/lib/validation';
import { cents } from '@/lib/portfolio';
import { getPortfolioOwner, sameOrigin, sha256 } from '@/app/owner';
import { getDb } from '@/db';
import { loans, payments } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { databaseError } from '@/lib/api-errors';
export const paymentSchema=z.object({amount:positiveMoney,paidAt:receivedDate,allocation:z.enum(['combined','unverified','interest','principal','split']),principalAmount:moneyAmount.default(0),interestAmount:moneyAmount.default(0),note:z.string().max(500)});
export function splitParts(p:z.infer<typeof paymentSchema>){
 const amountCents=cents(p.amount),principalCents=p.allocation==='principal'?amountCents:p.allocation==='split'?cents(p.principalAmount):0,interestCents=p.allocation==='interest'?amountCents:p.allocation==='split'?cents(p.interestAmount):0;
 if(p.allocation==='split'&&principalCents+interestCents!==amountCents)return null;
 return {amountCents,principalCents,interestCents};
}
const schema=paymentSchema.extend({loanId:z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/),operationKey:z.string().uuid()});
export async function POST(req:Request){
 if(!sameOrigin(req))return Response.json({error:'Solicitud rechazada'},{status:403});const owner=await getPortfolioOwner();if(!owner)return Response.json({error:'Sesión requerida'},{status:401});
 const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return Response.json({error:validationError(parsed)},{status:400});
 const p=parsed.data,db=getDb(),requestHash=await sha256(JSON.stringify(p));
 const previous=async()=>{const [r]=await db.select().from(payments).where(and(eq(payments.owner,owner),eq(payments.operationKey,p.operationKey))).limit(1);return r?Response.json(r.requestHash===requestHash?r:{error:'La clave de operación ya se utilizó con otros datos'},{status:r.requestHash===requestHash?200:409}):null;};
 try{
 const retry=await previous();if(retry)return retry;
 const [loan]=await db.select().from(loans).where(and(eq(loans.id,p.loanId),eq(loans.owner,owner))).limit(1);if(!loan)return Response.json({error:'Préstamo no encontrado'},{status:404});
 const parts=splitParts(p);if(!parts)return Response.json({error:'Capital e interés deben sumar el monto recibido'},{status:400});
 const {principalAmount,interestAmount,...input}=p;
 const [record]=await db.insert(payments).values({...input,...parts,id:crypto.randomUUID(),owner,requestHash,changeReason:'Registro de cobro'}).returning();return Response.json(record,{status:201});
 }catch(error){return await previous()||databaseError(error);}
}
