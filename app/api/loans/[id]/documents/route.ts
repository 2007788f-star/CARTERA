import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { documents, loans } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getPortfolioOwner, sameOrigin } from "@/app/owner";

async function accessible(id:string,owner:string){const match=await getDb().select({id:loans.id}).from(loans).where(and(eq(loans.id,id),eq(loans.owner,owner))).limit(1);return !!match.length}
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 const owner=await getPortfolioOwner();if(!owner)return Response.json({error:"Sesión requerida"},{status:401});const {id}=await params;
 if(!await accessible(id,owner))return Response.json({error:"Préstamo no encontrado"},{status:404});
 const db=getDb(),current=await db.select({borrowerId:loans.borrowerId}).from(loans).where(and(eq(loans.id,id),eq(loans.owner,owner))).limit(1);
 const related=current[0]?.borrowerId?await db.select({id:loans.id}).from(loans).where(and(eq(loans.owner,owner),eq(loans.borrowerId,current[0].borrowerId))):[{id}];
 const rows=await db.select({id:documents.id,filename:documents.filename,mimeType:documents.mimeType,bytes:documents.bytes,uploadedAt:documents.uploadedAt}).from(documents).where(and(inArray(documents.loanId,related.map(x=>x.id)),eq(documents.owner,owner)));
 return Response.json(rows,{headers:{"Cache-Control":"no-store"}});
}
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const owner=await getPortfolioOwner();if(!owner)return Response.json({error:"Sesión requerida"},{status:401});
 if(!sameOrigin(req))return Response.json({error:"Solicitud rechazada"},{status:403});const {id}=await params;
 if(!await accessible(id,owner))return Response.json({error:"Préstamo no encontrado"},{status:404});
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
 try{await getDb().insert(documents).values({id:documentId,owner,loanId:id,filename,mimeType,bytes:bytes.length,objectKey,uploadedAt:new Date().toISOString()})}
 catch{await env.BUCKET.delete(objectKey);return Response.json({error:"No se pudo guardar el documento"},{status:500})}
 return Response.json({id:documentId,filename,mimeType,bytes:bytes.length},{status:201});
}
