import { NextResponse } from "next/server";
import { getSession, makeId } from "../../lib/auth";
import { addAudit, addSchedule, updateJobStatus } from "../../lib/database";
import { sendEmail } from "../../lib/email";
import type { ScheduleItem } from "../../lib/types";

export async function POST(request: Request) {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.redirect(new URL("/login?role=admin", request.url), { status: 303 });
  const form = await request.formData();
  const jobRequestId = form.get("jobRequestId")?.toString() || "manual";
  const item: ScheduleItem = { id: makeId(), jobRequestId, workerId: form.get("workerId")?.toString() || undefined, startsAt: form.get("startsAt")?.toString() || new Date().toISOString(), endsAt: form.get("endsAt")?.toString() || undefined, status: "Scheduled", notes: form.get("notes")?.toString() || undefined };
  await addSchedule(item);
  if (jobRequestId !== "manual") await updateJobStatus(jobRequestId, "Scheduled");
  await sendEmail({ to: process.env.ADMIN_NOTIFICATION_EMAIL, event: "job_scheduled", subject: "T&A Contracting job scheduled", body: `Job ${jobRequestId} is scheduled for ${item.startsAt}.` });
  await addAudit({ actor: session.id, action: "schedule", entityType: "ScheduleItem", entityId: item.id, details: `Scheduled job ${jobRequestId}` });
  return NextResponse.redirect(new URL("/portal/admin?schedule=created", request.url), { status: 303 });
}
