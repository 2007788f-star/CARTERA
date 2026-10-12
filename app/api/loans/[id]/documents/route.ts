import {env} from 'cloudflare:workers';
import {getPortfolioOwner,getCurrentUser,sameOrigin} from '@/app/owner';
import {readState,changeState,audit,excelError} from '@/lib/excel-store';
import {findLoan} from '@/lib/excel-operations';
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){if(!await getPortfolioOwner())return Response.json({error:'Sesión requerida'},{status:401});try{const {id}=await params,s=await readState(),l=findLoan(s,id),related=s.loans.filter(x=>x.id===id||l.borrowerId&&x.borrowerId===l.borrowerId);return Response.json(s.documents.filter(d=>related.some(x=>x.id===d.loanId)),{headers:{'Cache-Control':'no-store'}});}catch(e){return excelError(e);}}
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const owner=await getPortfolioOwner(),actor=await getCurrentUser();if(!owner)return Response.json({error:"Sesión requerida"},{status:401});
 if(!sameOrigin(req))return Response.json({error:"Solicitud rechazada"},{status:403});const {id}=await params;
 if(!(await readState()).loans.some(l=>l.id===id))return Response.json({error:"Préstamo no encontrado"},{status:404});
 if(!env.BUCKET)return Response.json({error:"Almacenamiento de documentos no configurado"},{status:503});
 const data=await req.formData().catch(()=>null),file=data?.get("file");
 if(!(file instanceof File)||file.size===0||file.size>10*1024*1024)return Response.json({error:"Elige un PDF o imagen de hasta 10 MB"},{status:400});
 const bytes=new Uint8Array(await file.arrayBuffer());
 const pdf=bytes.length>5&&String.fromCharCode(...bytes.slice(0,5))==="%PDF-";
 const png=bytes.length>8&&[137,80,78,71,13,10,26,10].every((x,i)=>bytes[i]===x);
 const jpg=bytes.length>3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const mimeType=pdf?"application/pdf":png?"image/png":jpg?"image/jpeg":null;
 if(!mimeType)return Response.json({error:"Solo se admiten PDF, PNG o JPG auténticos"},{status:400});
 const filename=file.name.replace(/[\\/\x00-\x1f\x7f]/g," ").trim().slice(0,120)||"Documento";
 const documentId=crypto.randomUUID(),objectKey=`${owner}/${id}/${documentId}`;
 await env.BUCKET.put(objectKey,bytes,{httpMetadata:{contentType:mimeType}});
 try{await changeState(s=>{findLoan(s,id);const doc={id:documentId,owner,loanId:id,filename,mimeType,bytes:bytes.length,objectKey,uploadedAt:new Date().toISOString()};s.documents.push(doc);audit(s,actor!,id,documentId,null,doc,'Carga de expediente','document_upload');})}
 catch{return Response.json({error:"No se pudo confirmar el expediente. El archivo se conserva para evitar pérdida; actualiza antes de reintentar."},{status:503})}
 return Response.json({id:documentId,filename,mimeType,bytes:bytes.length},{status:201});
}
