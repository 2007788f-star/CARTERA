import { getPortfolioOwner } from '@/app/owner';
import { getDb } from '@/db';
import { auditEvents } from '@/db/schema';
import { and,eq,desc } from 'drizzle-orm';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){const owner=await getPortfolioOwner();if(!owner)return Response.json({error:'Sesión requerida'},{status:401});const {id}=await params;const rows=await getDb().select().from(auditEvents).where(and(eq(auditEvents.owner,owner),eq(auditEvents.loanId,id))).orderBy(desc(auditEvents.changedAt));return Response.json(rows,{headers:{'Cache-Control':'no-store'}});}
