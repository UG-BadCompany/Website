import { NextResponse } from "next/server";
import { hashPassword, makeId, setSession } from "../../../lib/auth";
import { addAudit, nowIso, updateDatabase } from "../../../lib/database";
import { queueEmail } from "../../../lib/email";
import type { Role, User } from "../../../lib/types";

export async function POST(request: Request) {
  const form = await request.formData();
  const role = (form.get("role")?.toString() || "client") as Role;
  const name = form.get("name")?.toString().trim() || "New Client";
  const email = form.get("email")?.toString().trim().toLowerCase();
  const phone = form.get("phone")?.toString().trim();
  const password = form.get("password")?.toString() || makeId("temp");
  const { salt, hash } = hashPassword(password);
  const user: User = { id: makeId("user"), role, name, email, phone, passwordHash: hash, passwordSalt: salt, createdAt: nowIso() };

  updateDatabase((database) => {
    database.users.unshift(user);
    queueEmail(database, { to: email, event: "client_account_created", subject: "Your T&A Contracting portal account", body: `Welcome ${name}. Your ${role} account is ready.` });
    addAudit(database, { actor: user.id, action: "register", entityType: "User", entityId: user.id, details: `${role} account created` });
  });
  await setSession(user);
  return NextResponse.redirect(new URL(`/portal/${role}`, request.url), { status: 303 });
}
