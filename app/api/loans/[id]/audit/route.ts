import {getPortfolioOwner} from '@/app/owner';
import {readState,excelError} from '@/lib/excel-store';
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){if(!await getPortfolioOwner())return Response.json({error:'Sesión requerida'},{status:401});try{const {id}=await params,s=await readState();return Response.json(s.audit.filter(x=>x.loanId===id).reverse(),{headers:{'Cache-Control':'no-store'}});}catch(e){return excelError(e);}}
