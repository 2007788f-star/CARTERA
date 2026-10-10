import { termsSchema, termErrors, financialKeys, validationError } from '@/lib/validation';
import { cents, today } from '@/lib/portfolio';
import { loanStatus } from '@/lib/loan-schedule';
import { getPortfolioOwner, sameOrigin } from '@/app/owner';
import { getDb } from '@/db';
import { loans, borrowers, payments } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { databaseError } from '@/lib/api-errors';
const revision={revision:z.number().int().min(0)};
const messageSchema=z.object({messageTemplate:z.string().trim().min(1).max(1200),...revision});
const editSchema=termsSchema.extend({...revision,reason:z.string().trim().min(5).max(500)});
const stateSchema=z.object({action:z.enum(['close','reopen']),...revision,reason:z.string().trim().min(5).max(500)});
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(req))return Response.json({error:'Solicitud rechazada'},{status:403});const owner=await getPortfolioOwner();if(!owner)return Response.json({error:'Sesión requerida'},{status:401});
 const {id}=await params,body=await req.json().catch(()=>null) as Record<string,unknown>|null,parsed=(body?.action?stateSchema:body?.messageTemplate!==undefined?messageSchema:editSchema).safeParse(body);
 if(!parsed.success)return Response.json({error:validationError(parsed)},{status:400});
 try{
 const db=getDb(),[row]=await db.select().from(loans).where(and(eq(loans.id,id),eq(loans.owner,owner))).limit(1);if(!row)return Response.json({error:'Préstamo no encontrado'},{status:404});
 const p=parsed.data;if(p.revision!==row.revision)return Response.json({error:'El préstamo cambió. Actualiza la cartera.'},{status:409});
 const movements=await db.select().from(payments).where(and(eq(payments.loanId,id),eq(payments.owner,owner)));
 let update;
 if('action' in p){
 if(p.action==='close'&&(!loanStatus(row,movements,today()).settled||movements.some(x=>!x.voidedAt&&x.paidAt>today())))return Response.json({error:'Para cerrar, liquida capital, cuotas vencidas y cobros por conciliar'},{status:409});
 update={closedAt:p.action==='close'?today():null,revision:row.revision+1,changeReason:p.reason};
 }else if('messageTemplate' in p)update={messageTemplate:p.messageTemplate,revision:row.revision+1,changeReason:'Actualización del recordatorio'};
 else{
 // Old imported calendars may be confirmed while unknown; ordinary agreements
 // with movements cannot be retroactively rewritten.
 const changed=financialKeys.some(key=>p[key]!==row[key]);
 if(changed&&row.scheduleKnown&&movements.length)return Response.json({error:'Las condiciones con movimientos están protegidas. Conserva el acuerdo original y registra uno nuevo si se renegocia.'},{status:409});
 if(changed||!row.scheduleKnown){const error=termErrors(p);if(error)return Response.json({error},{status:400});}
 const {reason,...terms}=p;update={...terms,principalCents:cents(p.principal),scheduleKnown:1,revision:row.revision+1,changeReason:reason};
 }
 const changeToken=crypto.randomUUID();update={...update,changeToken};
 const query=db.update(loans).set(update).where(and(eq(loans.id,id),eq(loans.owner,owner),eq(loans.revision,p.revision))).returning();
 if('name' in p&&row.borrowerId){
 // A missing revision aborts the batch through the NOT NULL guard, so related
 // writes never commit if another device changed the selected loan.
 const results=await db.batch([query,
 db.insert(borrowers).values({id:sql`CASE WHEN EXISTS(SELECT 1 FROM loans WHERE id=${id} AND change_token=${changeToken}) THEN ${row.borrowerId} ELSE NULL END`,owner,name:row.name,phone:row.phone,createdAt:row.createdAt}).onConflictDoNothing({target:borrowers.id}),
 db.update(borrowers).set({name:p.name,phone:p.phone}).where(and(eq(borrowers.id,row.borrowerId),eq(borrowers.owner,owner))),
 db.update(loans).set({name:p.name,phone:p.phone,revision:sql`${loans.revision}+1`,changeReason:'Actualización de datos de la persona'}).where(and(eq(loans.borrowerId,row.borrowerId),eq(loans.owner,owner),sql`${loans.id}<>${id}`))]);
 return results[0][0]?Response.json(results[0][0]):Response.json({error:'El préstamo cambió. Actualiza la cartera.'},{status:409});
 }
 const [saved]=await query;return saved?Response.json(saved):Response.json({error:'El préstamo cambió. Actualiza la cartera.'},{status:409});
 }catch(error){return databaseError(error);}
}
