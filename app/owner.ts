import { cookies } from "next/headers";
import { getDb } from "@/db";
import { sessions } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";

export const SESSION_COOKIE = "cartera_session";
export async function sha256(input: string) {
  const bytes = new TextEncoder().encode(input);
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), x => x.toString(16).padStart(2, "0")).join("");
}
export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const found = await getDb().select({ userId: sessions.userId }).from(sessions).where(and(eq(sessions.tokenHash, await sha256(token)), gt(sessions.expiresAt, new Date().toISOString()))).limit(1);
  const id=found[0]?.userId;return id==='primary'||id==='secondary'?id:null;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !!origin && origin === new URL(request.url).origin;
}

// Both provisioned administrators share the same family portfolio.
export async function getPortfolioOwner(){return await getCurrentUser()?"primary":null;}
