import { NextResponse } from "next/server";
import { getSession } from "../../../lib/auth";
import { addAudit, nowIso, updateDatabase } from "../../../lib/database";

export async function POST(request: Request) {
  const session = await getSession();
  if (session?.role !== "worker" && session?.role !== "admin") return NextResponse.redirect(new URL("/login?role=worker", request.url), { status: 303 });
  const form = await request.formData();
  const jobRequestId = form.get("jobRequestId")?.toString();
  const status = form.get("status")?.toString();
  updateDatabase((database) => {
    const job = database.jobRequests.find((item) => item.id === jobRequestId);
    if (!job || !status) return;
    job.status = status as typeof job.status;
    job.updatedAt = nowIso();
    addAudit(database, { actor: "worker", action: "update_status", entityType: "JobRequest", entityId: job.id, details: status });
  });
  return NextResponse.redirect(new URL("/portal/worker?status=updated", request.url), { status: 303 });
}
