import { getDb } from "@/db";
import { users, sessions, loginAttempts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { verifyPassword } from "@/app/password";
import { sameOrigin, SESSION_COOKIE, sha256 } from "@/app/owner";
import { cookies } from "next/headers";

const input = z.object({email:z.string().email().max(254),password:z.string().min(1).max(200)});
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({error:"Solicitud rechazada"},{status:403});
  const parsed = input.safeParse(await req.json().catch(()=>null));
  if (!parsed.success) return Response.json({error:"Credenciales inválidas"},{status:400});
  const email = parsed.data.email.trim().toLowerCase();
  const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
  const throttleKey = await sha256(`${email}|${ip}`);
  const db = getDb();
  const attempt = await db.select().from(loginAttempts).where(eq(loginAttempts.key,throttleKey)).limit(1);
  const recent = attempt[0] && Date.now()-new Date(attempt[0].windowStart).getTime()<15*60*1000;
  if(recent && attempt[0].failures>=5)return Response.json({error:"Demasiados intentos. Espera 15 minutos."},{status:429});
  const found = await getDb().select().from(users).where(eq(users.email,email)).limit(1);
  // El cálculo se ejecuta también cuando no existe la cuenta.
  const valid = await verifyPassword(parsed.data.password, found[0]?.passwordHash ?? "pbkdf2:310000:00000000000000000000000000000000:0000000000000000000000000000000000000000000000000000000000000000");
  if (!valid || !found[0]) {
    await db.insert(loginAttempts).values({key:throttleKey,failures:recent?attempt[0].failures+1:1,windowStart:recent?attempt[0].windowStart:new Date().toISOString()}).onConflictDoUpdate({target:loginAttempts.key,set:{failures:recent?attempt[0].failures+1:1,windowStart:recent?attempt[0].windowStart:new Date().toISOString()}});
    return Response.json({error:"Correo o contraseña incorrectos"},{status:401});
  }
  await db.delete(loginAttempts).where(eq(loginAttempts.key,throttleKey));
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,"0")).join("");
  const expires = new Date(Date.now()+7*86400000);
  await getDb().insert(sessions).values({tokenHash:await sha256(token),userId:found[0].id,expiresAt:expires.toISOString()});
  (await cookies()).set(SESSION_COOKIE,token,{httpOnly:true,secure:true,sameSite:"strict",path:"/",expires});
  return Response.json({ok:true});
}
