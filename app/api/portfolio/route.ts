import {getPortfolioOwner} from '@/app/owner';
import {readState,excelError} from '@/lib/excel-store';
export async function GET(){if(!await getPortfolioOwner())return Response.json({error:'Sesión requerida'},{status:401});try{const s=await readState();return Response.json({loans:s.loans,payments:s.payments,sourceEntries:s.sourceEntries},{headers:{'Cache-Control':'no-store'}});}catch(e){return excelError(e);}}
