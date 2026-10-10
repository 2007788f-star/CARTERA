import { getPortfolioOwner, sameOrigin } from '@/app/owner';
import { getDb } from '@/db';
import { payments } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { paymentSchema, splitParts } from '../route';
import { validationError } from '@/lib/validation';
import { databaseError } from '@/lib/api-errors';
const correction=paymentSchema.extend({revision:z.number().int().min(0),reason:z.string().trim().min(5).max(500)});
const voidSchema=z.object({action:z.literal('void'),revision:z.number().int().min(0),reason:z.string().trim().min(5).max(500)});
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(req))return Response.json({error:'Solicitud rechazada'},{status:403});const owner=await getPortfolioOwner();if(!owner)return Response.json({error:'Sesión requerida'},{status:401});
 const {id}=await params,body=await req.json().catch(()=>null) as Record<string,unknown>|null,parsed=(body?.action==='void'?voidSchema:correction).safeParse(body);
 if(!parsed.success)return Response.json({error:validationError(parsed)},{status:400});
 try{
 const db=getDb(),[row]=await db.select().from(payments).where(and(eq(payments.id,id),eq(payments.owner,owner))).limit(1);
 if(!row)return Response.json({error:'Movimiento no encontrado'},{status:404});
 if(row.voidedAt||row.revision!==parsed.data.revision)return Response.json({error:'El movimiento cambió o ya está anulado. Actualiza la cartera.'},{status:409});
 const p=parsed.data;let update;
 if('action' in p)update={voidedAt:new Date().toISOString(),revision:row.revision+1,changeReason:p.reason};
 else {const parts=splitParts(p);if(!parts)return Response.json({error:'Capital e interés deben sumar el monto recibido'},{status:400});update={amount:p.amount,paidAt:p.paidAt,allocation:p.allocation,note:p.note,...parts,revision:row.revision+1,changeReason:p.reason};}
 const [saved]=await db.update(payments).set(update).where(and(eq(payments.id,id),eq(payments.owner,owner),eq(payments.revision,p.revision))).returning();
 return saved?Response.json(saved):Response.json({error:'Otro dispositivo cambió este cobro. Actualiza la cartera.'},{status:409});
 }catch(error){return databaseError(error);}
}
