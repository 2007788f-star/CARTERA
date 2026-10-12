import {getCurrentUser,sameOrigin,sha256} from '@/app/owner';
import {changeState,excelError} from '@/lib/excel-store';
import {addPayment} from '@/lib/excel-operations';
export {paymentSchema,splitParts} from '@/lib/excel-operations';
export async function POST(req:Request) {
 if(!sameOrigin(req))return Response.json({error:"Solicitud rechazada"},{status:403});const actor=await getCurrentUser();if(!actor)return Response.json({error:"Sesión requerida"},{status:401});
 try{const body=await req.json();const hash=await sha256(JSON.stringify(body));let created=false;const result=await changeState(s=>{created=!s.payments.some(x=>x.operationKey===(body as {operationKey:string}).operationKey);return addPayment(s,body,actor,hash);});return Response.json(result,{status:created?201:200});}catch(e){return excelError(e);}
}
