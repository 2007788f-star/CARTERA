import {env} from 'cloudflare:workers';
import {getPortfolioOwner,getCurrentUser,sameOrigin} from '@/app/owner';
import {readState,changeState,audit,excelError,StoreError} from '@/lib/excel-store';
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 const owner=await getPortfolioOwner();if(!owner)return new Response(null,{status:401});const {id}=await params;const doc=(await readState()).documents.find(d=>d.id===id);if(!doc)return new Response(null,{status:404});
 const object=await env.BUCKET?.get(doc.objectKey);if(!object)return new Response(null,{status:404});
 return new Response(object.body,{headers:{"Content-Type":doc.mimeType,"Content-Disposition":`inline; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"sandbox"}});
}
export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}){const actor=await getCurrentUser();if(!actor)return Response.json({error:'Sesión requerida'},{status:401});if(!sameOrigin(req))return Response.json({error:'Solicitud rechazada'},{status:403});try{const {id}=await params;await changeState(s=>{const d=s.documents.find(x=>x.id===id);if(!d)throw new StoreError('Documento no encontrado',404);s.documents=s.documents.filter(x=>x.id!==id);audit(s,actor,d.loanId,id,d,{archived:true,objectKey:d.objectKey},'Documento retirado del expediente','document_archive');});return Response.json({ok:true});}catch(e){return excelError(e);}}
