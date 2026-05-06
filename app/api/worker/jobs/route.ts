import { NextResponse } from "next/server";
import { getSession } from "../../../lib/auth";
import { addAudit, updateJobStatus } from "../../../lib/database";
import type { JobStatus } from "../../../lib/types";

export async function POST(request: Request) {
  const session = await getSession();
  if (session?.role !== "worker" && session?.role !== "admin") return NextResponse.redirect(new URL("/login?role=worker", request.url), { status: 303 });
  const form = await request.formData();
  const jobRequestId = form.get("jobRequestId")?.toString();
  const status = form.get("status")?.toString() as JobStatus | undefined;
  if (jobRequestId && status) {
    await updateJobStatus(jobRequestId, status);
    await addAudit({ actor: session.id, action: "update_status", entityType: "JobRequest", entityId: jobRequestId, details: status });
  }
  return NextResponse.redirect(new URL("/portal/worker?status=updated", request.url), { status: 303 });
}
