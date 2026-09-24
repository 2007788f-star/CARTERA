import { getPortfolioOwner, sameOrigin } from "@/app/owner";
import { getDb } from "@/db";
import { payments, loans } from "@/db/schema";
import { and, eq, sum } from "drizzle-orm";
import { z } from "zod";
const schema=z.object({allocation:z.enum(["interest","principal","combined","unverified"])});
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(req))return Response.json({error:"Solicitud rechazada"},{status:403});const owner=await getPortfolioOwner();if(!owner)return Response.json({error:"Sesión requerida"},{status:401});const {id}=await params;
 const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return Response.json({error:"Clasificación inválida"},{status:400});
 try{const db=getDb();const row=await db.select().from(payments).where(and(eq(payments.id,id),eq(payments.owner,owner))).limit(1);if(!row.length)return Response.json({error:"Movimiento no encontrado"},{status:404});
 if(parsed.data.allocation==="principal"&&row[0].allocation!=="principal"){const loan=await db.select({principal:loans.principal}).from(loans).where(and(eq(loans.id,row[0].loanId),eq(loans.owner,owner))).limit(1);const totals=await db.select({paid:sum(payments.amount)}).from(payments).where(and(eq(payments.loanId,row[0].loanId),eq(payments.owner,owner),eq(payments.allocation,"principal")));if(!loan.length||row[0].amount>loan[0].principal-Number(totals[0]?.paid||0)+0.005)return Response.json({error:"Supera el capital pendiente registrado"},{status:400})}
 await db.update(payments).set({allocation:parsed.data.allocation}).where(and(eq(payments.id,id),eq(payments.owner,owner)));return Response.json({allocation:parsed.data.allocation})}catch{return Response.json({error:"No se pudo clasificar el cobro"},{status:500})}
}
