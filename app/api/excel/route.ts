import {getPortfolioOwner} from '@/app/owner';
import {readState,encodeState,excelError} from '@/lib/excel-store';
export async function GET(){if(!await getPortfolioOwner())return new Response(null,{status:401});try{return new Response(new Uint8Array(encodeState(await readState())).buffer,{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename=CARTERA.xlsx','Cache-Control':'private, no-store'}});}catch(e){return excelError(e);}}
