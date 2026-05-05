import { NextResponse } from "next/server";
import { createProfile, addAudit } from "../../../lib/database";
import { sendEmail } from "../../../lib/email";
import { createSupabaseServerClient } from "../../../lib/supabase";
import type { Role } from "../../../lib/types";

export async function POST(request: Request) {
  const form = await request.formData();
  const role = (form.get("role")?.toString() || "client") as Role;
  const name = form.get("name")?.toString().trim() || "New Client";
  const email = form.get("email")?.toString().trim().toLowerCase();
  const phone = form.get("phone")?.toString().trim();
  const password = form.get("password")?.toString() || "";
  if (!email || !password) return NextResponse.redirect(new URL("/login?error=missing-email", request.url), { status: 303 });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, role, phone } } });
  if (error || !data.user) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error?.message ?? "signup-failed")}`, request.url), { status: 303 });

  await createProfile({ id: data.user.id, role, name, email, phone });
  await sendEmail({ to: email, event: "client_account_created", subject: "Your T&A Contracting portal account", body: `Welcome ${name}. Your ${role} account is ready.` });
  await addAudit({ actor: data.user.id, action: "register", entityType: "User", entityId: data.user.id, details: `${role} account created` });
  return NextResponse.redirect(new URL(`/portal/${role}`, request.url), { status: 303 });
}
