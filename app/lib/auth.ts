import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { Role, User } from "./types";

const SESSION_COOKIE = "ta_session";
const RESET_COOKIE = "ta_reset_request";

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, storedHash: string) {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function makeId(prefix: string) {
  return `${prefix}_${randomBytes(10).toString("hex")}`;
}

export function sessionTokenFor(user: Pick<User, "id" | "role">) {
  return Buffer.from(JSON.stringify({ id: user.id, role: user.role })).toString("base64url");
}

export async function setSession(user: Pick<User, "id" | "role">) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionTokenFor(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession(): Promise<{ id: string; role: Role } | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const decoded = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as { id: string; role: Role };
  if (!decoded.id || !decoded.role) return null;
  return decoded;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export function resetTokenFor(email: string) {
  return createHash("sha256").update(`${email}:${Date.now()}:${randomBytes(8).toString("hex")}`).digest("hex");
}

export async function rememberResetRequest(email: string, token: string) {
  const cookieStore = await cookies();
  cookieStore.set(RESET_COOKIE, Buffer.from(JSON.stringify({ email, token })).toString("base64url"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 30,
  });
}
