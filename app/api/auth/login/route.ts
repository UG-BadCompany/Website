import { NextResponse } from "next/server";
import { setSession, verifyPassword } from "../../../lib/auth";
import { readDatabase } from "../../../lib/database";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = form.get("email")?.toString().trim().toLowerCase();
  const password = form.get("password")?.toString() || "";
  const database = readDatabase();
  const user = database.users.find((item) => item.email === email);

  if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return NextResponse.redirect(new URL("/login?error=invalid", request.url), { status: 303 });
  }

  await setSession(user);
  return NextResponse.redirect(new URL(`/portal/${user.role}`, request.url), { status: 303 });
}
