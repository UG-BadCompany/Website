import { NextResponse } from "next/server";
import { getProfile } from "../../../lib/database";
import { createSupabaseServerClient } from "../../../lib/supabase";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = form.get("email")?.toString().trim().toLowerCase() || "";
  const password = form.get("password")?.toString() || "";
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return NextResponse.redirect(new URL("/login?error=invalid", request.url), { status: 303 });
  const profile = await getProfile(data.user.id);
  return NextResponse.redirect(new URL(`/portal/${profile?.role ?? "client"}`, request.url), { status: 303 });
}
