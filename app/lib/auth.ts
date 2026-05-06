import { createHash, randomBytes, randomUUID } from "crypto";
import type { Role, User } from "./types";
import { createSupabaseServerClient } from "./supabase";
import { getProfile } from "./database";

export function makeId(prefix?: string) {
  const id = randomBytes(10).toString("hex");
  return prefix ? `${prefix}_${id}` : randomUUID();
}

export function resetTokenFor(email: string) {
  return createHash("sha256").update(`${email}:${Date.now()}:${randomBytes(8).toString("hex")}`).digest("hex");
}

export async function getSession(): Promise<{ id: string; role: Role; email?: string } | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const profile = await getProfile(user.id);
  return { id: user.id, role: profile?.role ?? ((user.user_metadata?.role as Role) || "client"), email: user.email ?? undefined };
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  return session ? getProfile(session.id) : null;
}
