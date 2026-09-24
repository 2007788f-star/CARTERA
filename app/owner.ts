import { cookies } from "next/headers";
import { getDb } from "@/db";
import { sessions } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";

export const SESSION_COOKIE = "cartera_session";
export async function sha256(input: string) {
  const bytes = new TextEncoder().encode(input);
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), x => x.toString(16).padStart(2, "0")).join("");
}
export async function getPortfolioOwner() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const found = await getDb().select({ userId: sessions.userId }).from(sessions).where(and(eq(sessions.tokenHash, await sha256(token)), gt(sessions.expiresAt, new Date().toISOString()))).limit(1);
  return found[0]?.userId ?? null;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !!origin && origin === new URL(request.url).origin;
}
