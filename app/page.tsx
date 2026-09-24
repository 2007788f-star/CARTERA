import { getPortfolioOwner } from "./owner";
import { getDb } from "@/db";
import { loans, payments, sourceEntries } from "@/db/schema";
import { eq } from "drizzle-orm";
import Dashboard from "./dashboard";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export default async function Home() {
  const owner = await getPortfolioOwner();
  if (!owner) redirect("/ingresar");
  try {
    const db = getDb();
    const [allLoans, allPayments, allSourceEntries] = await Promise.all([
      db.select().from(loans).where(eq(loans.owner, owner)),
      db.select().from(payments).where(eq(payments.owner, owner)),
      db.select().from(sourceEntries).where(eq(sourceEntries.owner, owner)),
    ]);
    return <Dashboard initialLoans={allLoans} initialPayments={allPayments} initialSourceEntries={allSourceEntries} />;
  } catch (error) {
    console.error("No se pudo cargar la cartera", error);
    return <main className="center"><h1>No se pudo cargar la cartera</h1><p>Verifica la conexión e inténtalo de nuevo.</p><a className="primary" href="/">Volver a cargar</a></main>;
  }
}
