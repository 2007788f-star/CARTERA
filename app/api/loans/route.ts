import { calendarDate, moneyAmount, positiveMoney } from "@/lib/validation";
import { getPortfolioOwner, sameOrigin } from "@/app/owner";
import { getDb } from "@/db";
import { loans, borrowers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
const schema = z.object({borrowerId:z.string().uuid().optional(),name:z.string().trim().min(2).max(120),phone:z.string().trim().max(25),principal:positiveMoney,interestMode:z.enum(["none","fixed","balance","manual"]),rate:z.number().min(0).max(1000),installment:positiveMoney,firstDue:calendarDate,frequencyDays:z.number().int().min(1).max(365),dueMode:z.enum(["interval","semi_monthly"]),monthlyCharge:moneyAmount,notes:z.string().max(1000),consent:z.boolean(),reminderDays:z.number().int().min(0).max(30)});
export async function POST(req:Request) {
 if(!sameOrigin(req))return Response.json({error:"Solicitud rechazada"},{status:403});const owner=await getPortfolioOwner(); if(!owner)return Response.json({error:"Sesión requerida"},{status:401});
 const parsed=schema.safeParse(await req.json().catch(()=>null)); if(!parsed.success)return Response.json({error:"Revisa los datos del préstamo"},{status:400});
 const p=parsed.data;
 try {const db=getDb();let borrowerId=p.borrowerId;
 if(borrowerId){const found=await db.select({id:borrowers.id,name:borrowers.name,phone:borrowers.phone}).from(borrowers).where(and(eq(borrowers.id,borrowerId),eq(borrowers.owner,owner))).limit(1);if(!found.length)return Response.json({error:"Persona no encontrada"},{status:404});p.name=found[0].name;p.phone=found[0].phone}
 else borrowerId=crypto.randomUUID();
 const record={...p,borrowerId,id:crypto.randomUUID(),owner,consent:p.consent?1:0,createdAt:new Date().toISOString()};
 const insertLoan=db.insert(loans).values(record).returning();
 const saved=p.borrowerId?await insertLoan:(await db.batch([
  db.insert(borrowers).values({id:borrowerId,owner,name:p.name,phone:p.phone,createdAt:record.createdAt}),
  insertLoan
 ]))[1];
 return Response.json(saved[0],{status:201});}
 catch{return Response.json({error:"No se pudo guardar el préstamo"},{status:500});}
}
