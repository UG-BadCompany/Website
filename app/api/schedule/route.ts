import { NextResponse } from "next/server";
import { getSession, makeId } from "../../lib/auth";
import { addAudit, addSchedule, updateDatabase } from "../../lib/database";
import { queueEmail } from "../../lib/email";
import type { ScheduleItem } from "../../lib/types";

export async function POST(request: Request) {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.redirect(new URL("/login?role=admin", request.url), { status: 303 });
  const form = await request.formData();
  const jobRequestId = form.get("jobRequestId")?.toString() || "manual";
  const item: ScheduleItem = {
    id: makeId("schedule"),
    jobRequestId,
    workerId: form.get("workerId")?.toString() || undefined,
    startsAt: form.get("startsAt")?.toString() || new Date().toISOString(),
    endsAt: form.get("endsAt")?.toString() || undefined,
    status: "Scheduled",
    notes: form.get("notes")?.toString() || undefined,
  };
  updateDatabase((database) => {
    addSchedule(database, item);
    const job = database.jobRequests.find((requestItem) => requestItem.id === jobRequestId);
    if (job) {
      job.status = "Scheduled";
      job.updatedAt = new Date().toISOString();
      queueEmail(database, { to: job.email, event: "job_scheduled", subject: "Your T&A Contracting job is scheduled", body: `Your job is scheduled for ${item.startsAt}.` });
    }
    addAudit(database, { actor: "admin", action: "schedule", entityType: "ScheduleItem", entityId: item.id, details: `Scheduled job ${jobRequestId}` });
  });
  return NextResponse.redirect(new URL("/portal/admin?schedule=created", request.url), { status: 303 });
}
