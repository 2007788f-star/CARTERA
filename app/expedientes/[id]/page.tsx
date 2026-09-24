import { getPortfolioOwner } from "@/app/owner";
import { getDb } from "@/db";
import { loans,payments } from "@/db/schema";
import { and,eq,inArray } from "drizzle-orm";
import { notFound,redirect } from "next/navigation";
import Dossier from "./dossier";
export const dynamic="force-dynamic";
export default async function Expediente({params}:{params:Promise<{id:string}>}){
 const owner=await getPortfolioOwner();if(!owner)redirect("/ingresar");const {id}=await params;
 const found=await getDb().select().from(loans).where(and(eq(loans.id,id),eq(loans.owner,owner))).limit(1);if(!found.length)notFound();
 const related=found[0].borrowerId?await getDb().select().from(loans).where(and(eq(loans.owner,owner),eq(loans.borrowerId,found[0].borrowerId))):found;
 const movements=await getDb().select().from(payments).where(and(inArray(payments.loanId,related.map(x=>x.id)),eq(payments.owner,owner)));
 return <Dossier loan={found[0]} related={related} payments={movements}/>;
}
