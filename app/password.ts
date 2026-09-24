const encoder = new TextEncoder();
function hex(bytes: Uint8Array) { return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join(""); }
function unhex(value: string) { return new Uint8Array(value.match(/.{2}/g)?.map(x => parseInt(x, 16)) ?? []); }
export async function hashPassword(password: string, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256"}, key, 256);
  return `pbkdf2:310000:${hex(salt)}:${hex(new Uint8Array(bits))}`;
}
export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "pbkdf2" || parts[1] !== "310000" || !/^[a-f0-9]{32}$/.test(parts[2]) || !/^[a-f0-9]{64}$/.test(parts[3])) return false;
  const result = await hashPassword(password, unhex(parts[2]));
  const a = encoder.encode(result), b = encoder.encode(stored);
  let different = a.length ^ b.length;
  for (let i = 0; i < Math.min(a.length,b.length); i++) different |= a[i] ^ b[i];
  return different === 0;
}
