import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { documents } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getPortfolioOwner,sameOrigin } from "@/app/owner";
async function record(id:string,owner:string){const found=await getDb().select().from(documents).where(and(eq(documents.id,id),eq(documents.owner,owner))).limit(1);return found[0]}
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 const owner=await getPortfolioOwner();if(!owner)return new Response(null,{status:401});const {id}=await params;const doc=await record(id,owner);if(!doc)return new Response(null,{status:404});
 const object=await env.BUCKET?.get(doc.objectKey);if(!object)return new Response(null,{status:404});
 return new Response(object.body,{headers:{"Content-Type":doc.mimeType,"Content-Disposition":`inline; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"sandbox"}});
}
export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}){
 const owner=await getPortfolioOwner();if(!owner)return Response.json({error:"Sesión requerida"},{status:401});if(!sameOrigin(req))return Response.json({error:"Solicitud rechazada"},{status:403});const {id}=await params;const doc=await record(id,owner);if(!doc)return Response.json({error:"Documento no encontrado"},{status:404});
 await env.BUCKET?.delete(doc.objectKey);await getDb().delete(documents).where(and(eq(documents.id,id),eq(documents.owner,owner)));return Response.json({ok:true});
}
