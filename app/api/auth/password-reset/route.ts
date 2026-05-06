import { NextResponse } from "next/server";
import { addAudit } from "../../../lib/database";
import { createSupabaseServerClient } from "../../../lib/supabase";
import { siteUrl } from "../../../lib/env";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = form.get("email")?.toString().trim().toLowerCase();
  if (!email) return NextResponse.redirect(new URL("/login?reset=missing-email", request.url), { status: 303 });
  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/login?reset=complete` });
  await addAudit({ actor: email, action: "request_password_reset", entityType: "User", entityId: email, details: "Supabase password reset requested" });
  return NextResponse.redirect(new URL("/login?reset=queued", request.url), { status: 303 });
}
