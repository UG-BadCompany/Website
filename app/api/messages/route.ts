import { NextResponse } from "next/server";
import { getSession, makeId } from "../../lib/auth";
import { addAudit, addMessage, getProfile, nowIso } from "../../lib/database";
import type { Message, Role } from "../../lib/types";

export async function POST(request: Request) {
  const form = await request.formData();
  const session = await getSession();
  const user = await getProfile(session?.id);
  const message: Message = { id: makeId(), jobRequestId: form.get("jobRequestId")?.toString() || "general", authorRole: user?.role ?? (form.get("authorRole")?.toString() as Role) ?? "client", authorName: user?.name ?? form.get("authorName")?.toString() ?? "Portal User", body: form.get("body")?.toString() || "", internalOnly: form.get("internalOnly") === "on", createdAt: nowIso() };
  await addMessage(message);
  await addAudit({ actor: user?.id ?? message.authorName, action: "message", entityType: "Message", entityId: message.id, details: message.internalOnly ? "Internal note" : "Client-visible message" });
  return NextResponse.redirect(new URL("/portal/client?message=sent", request.url), { status: 303 });
}
