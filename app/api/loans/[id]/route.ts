import {getCurrentUser,sameOrigin,sha256} from '@/app/owner';
import {changeState,excelError} from '@/lib/excel-store';
import {editLoan} from '@/lib/excel-operations';
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}) {
 if(!sameOrigin(req))return Response.json({error:"Solicitud rechazada"},{status:403});const actor=await getCurrentUser();if(!actor)return Response.json({error:"Sesión requerida"},{status:401});
 try{const body=await req.json();const {id}=await params;const result=await changeState(s=>editLoan(s,id,body,actor));return Response.json(result);}catch(e){return excelError(e);}
}
