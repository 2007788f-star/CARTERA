import { getPortfolioOwner } from "../owner";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { loans, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import Reports from "./reports";

export const dynamic="force-dynamic";
export default async function ReportsPage(){
 const owner=await getPortfolioOwner();
 if(!owner)redirect("/ingresar");
 try{const db=getDb();const [allLoans,allPayments]=await Promise.all([db.select().from(loans).where(eq(loans.owner,owner)),db.select().from(payments).where(eq(payments.owner,owner))]);return <Reports loans={allLoans} payments={allPayments}/>}
 catch(error){console.error("No se pudieron cargar los reportes",error);return <main className="center"><h1>No se pudieron cargar los reportes</h1><p>Intenta de nuevo en unos minutos.</p><a className="primary" href="/reportes">Volver a cargar</a></main>}
}
