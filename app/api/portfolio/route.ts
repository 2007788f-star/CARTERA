import { getPortfolioOwner } from '@/app/owner';
import { getDb } from '@/db';
import { loans,payments,sourceEntries } from '@/db/schema';
import { eq } from 'drizzle-orm';
export async function GET(){const owner=await getPortfolioOwner();if(!owner)return Response.json({error:'Sesión requerida'},{status:401});try{const db=getDb();const [allLoans,allPayments,allSourceEntries]=await Promise.all([db.select().from(loans).where(eq(loans.owner,owner)),db.select().from(payments).where(eq(payments.owner,owner)),db.select().from(sourceEntries).where(eq(sourceEntries.owner,owner))]);return Response.json({loans:allLoans,payments:allPayments,sourceEntries:allSourceEntries},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'No se pudo actualizar la cartera'},{status:500});}}
