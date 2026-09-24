import { calendarDate, moneyAmount, positiveMoney } from "@/lib/validation";
import { getPortfolioOwner, sameOrigin } from "@/app/owner";
import { getDb } from "@/db";
import { loans, borrowers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
const messageSchema=z.object({messageTemplate:z.string().trim().min(1).max(1200)});
const termsSchema=z.object({name:z.string().trim().min(2).max(120),phone:z.string().trim().max(25),principal:positiveMoney,interestMode:z.enum(["none","fixed","balance","manual"]),rate:z.number().min(0).max(1000),monthlyCharge:moneyAmount,installment:positiveMoney,firstDue:calendarDate,frequencyDays:z.number().int().min(1).max(365),dueMode:z.enum(["interval","semi_monthly"]),notes:z.string().max(1000)});
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(req))return Response.json({error:"Solicitud rechazada"},{status:403});const owner=await getPortfolioOwner();if(!owner)return Response.json({error:"Sesión requerida"},{status:401});
 const {id}=await params;const body=await req.json().catch(()=>null);const isMessage=body&&Object.prototype.hasOwnProperty.call(body,"messageTemplate");const parsed=(isMessage?messageSchema:termsSchema).safeParse(body);if(!parsed.success)return Response.json({error:"Revisa los datos antes de guardar"},{status:400});
 try{const db=getDb();const match=await db.select({id:loans.id,borrowerId:loans.borrowerId}).from(loans).where(and(eq(loans.id,id),eq(loans.owner,owner))).limit(1);if(!match.length)return Response.json({error:"Préstamo no encontrado"},{status:404});const update=isMessage?parsed.data:{...parsed.data,scheduleKnown:1};await db.update(loans).set(update).where(and(eq(loans.id,id),eq(loans.owner,owner)));
 if(!isMessage && "name" in parsed.data && match[0].borrowerId){await db.update(borrowers).set({name:parsed.data.name,phone:parsed.data.phone}).where(and(eq(borrowers.id,match[0].borrowerId),eq(borrowers.owner,owner)));await db.update(loans).set({name:parsed.data.name,phone:parsed.data.phone}).where(and(eq(loans.borrowerId,match[0].borrowerId),eq(loans.owner,owner)))}
 return Response.json(update)}catch{return Response.json({error:"No se pudieron guardar los cambios"},{status:500})}
}
