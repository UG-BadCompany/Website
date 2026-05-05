import { NextResponse } from "next/server";
import { rememberResetRequest, resetTokenFor } from "../../../lib/auth";
import { addAudit, updateDatabase } from "../../../lib/database";
import { queueEmail } from "../../../lib/email";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = form.get("email")?.toString().trim().toLowerCase();
  if (!email) return NextResponse.redirect(new URL("/login?reset=missing-email", request.url), { status: 303 });
  const token = resetTokenFor(email);
  await rememberResetRequest(email, token);
  updateDatabase((database) => {
    queueEmail(database, { to: email, event: "password_reset", subject: "T&A Contracting password reset", body: `Password reset token: ${token}` });
    addAudit(database, { actor: email, action: "request_password_reset", entityType: "User", entityId: email, details: "Password reset requested" });
  });
  return NextResponse.redirect(new URL("/login?reset=queued", request.url), { status: 303 });
}
