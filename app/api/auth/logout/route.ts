import { cookies } from "next/headers";
import { getDb } from "@/db";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SESSION_COOKIE, sameOrigin, sha256 } from "@/app/owner";
export async function POST(req:Request){
 if(!sameOrigin(req))return Response.json({error:"Solicitud rechazada"},{status:403});
 const jar=await cookies();const token=jar.get(SESSION_COOKIE)?.value;
 if(token)await getDb().delete(sessions).where(eq(sessions.tokenHash,await sha256(token)));
 jar.delete(SESSION_COOKIE);return Response.json({ok:true});
}
