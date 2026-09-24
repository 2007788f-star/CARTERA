import { calendarDate, moneyAmount, positiveMoney } from "@/lib/validation";
import { getPortfolioOwner, sameOrigin } from "@/app/owner";
import { getDb } from "@/db";
import { loans, payments } from "@/db/schema";
import { and, eq, sum } from "drizzle-orm";
import { z } from "zod";
const schema=z.object({loanId:z.string().uuid(),amount:positiveMoney,paidAt:calendarDate,allocation:z.enum(["combined","interest","principal"]),note:z.string().max(500)});
export async function POST(req:Request) {
 if(!sameOrigin(req))return Response.json({error:"Solicitud rechazada"},{status:403});const owner=await getPortfolioOwner();if(!owner)return Response.json({error:"Sesión requerida"},{status:401});
 const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return Response.json({error:"Revisa el pago"},{status:400});
 try {const db=getDb();const found=await db.select({id:loans.id,principal:loans.principal}).from(loans).where(and(eq(loans.id,parsed.data.loanId),eq(loans.owner,owner))).limit(1);if(!found.length)return Response.json({error:"Préstamo no encontrado"},{status:404});if(parsed.data.allocation==="principal"){const totals=await db.select({paid:sum(payments.amount)}).from(payments).where(and(eq(payments.loanId,parsed.data.loanId),eq(payments.owner,owner),eq(payments.allocation,"principal")));if(parsed.data.amount>found[0].principal-Number(totals[0]?.paid||0)+0.005)return Response.json({error:"El abono a capital supera el capital pendiente registrado"},{status:400})}const record={...parsed.data,id:crypto.randomUUID(),owner};await db.insert(payments).values(record);return Response.json(record,{status:201});}
 catch{return Response.json({error:"No se pudo guardar el pago"},{status:500});}
}
