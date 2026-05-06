import { NextResponse } from "next/server";
import { getSession, makeId } from "../../lib/auth";
import { addAudit, addFile, createJobRequest, nowIso } from "../../lib/database";
import { sendEmail } from "../../lib/email";
import { uploadToObjectStorage } from "../../lib/storage";
import type { JobRequest } from "../../lib/types";

async function saveFiles(form: FormData, jobRequestId: string) {
  const saved = [];
  for (const entry of form.getAll("files")) {
    if (!(entry instanceof File) || entry.size === 0) continue;
    const uploaded = await uploadToObjectStorage(entry, `job-requests/${jobRequestId}`);
    await addFile(uploaded, jobRequestId);
    saved.push(uploaded);
  }
  return saved;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const session = await getSession();
  const timestamp = nowIso();
  const jobRequestId = makeId();
  const jobRequest: JobRequest = {
    id: jobRequestId,
    clientId: session?.role === "client" ? session.id : undefined,
    name: form.get("name")?.toString().trim() || "New Lead",
    email: form.get("email")?.toString().trim().toLowerCase() || session?.email,
    phone: form.get("phone")?.toString().trim() || undefined,
    propertyAddress: form.get("address")?.toString().trim() || "Address pending",
    serviceCategory: form.get("category")?.toString() || "Home Repairs",
    desiredTimeframe: form.get("timeframe")?.toString() || "Flexible",
    priority: (form.get("priority")?.toString() as JobRequest["priority"]) || "Standard",
    description: form.get("description")?.toString().trim() || "Description pending",
    preferredContactMethod: (form.get("preferredContactMethod")?.toString() as JobRequest["preferredContactMethod"]) || "Portal",
    accessNotes: form.get("accessNotes")?.toString().trim() || undefined,
    specialInstructions: form.get("specialInstructions")?.toString().trim() || undefined,
    files: [],
    status: "New request",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await createJobRequest(jobRequest);
  jobRequest.files = await saveFiles(form, jobRequestId);
  await sendEmail({ to: jobRequest.email, event: "new_job_request_confirmation", subject: "We received your T&A Contracting request", body: `Request ${jobRequest.id} was created for ${jobRequest.propertyAddress}.` });
  await sendEmail({ to: process.env.ADMIN_NOTIFICATION_EMAIL, event: "admin_new_job_request", subject: "New T&A Contracting job request", body: `${jobRequest.name} requested ${jobRequest.serviceCategory} at ${jobRequest.propertyAddress}.` });
  await addAudit({ actor: session?.id ?? jobRequest.email ?? "public-lead", action: "create", entityType: "JobRequest", entityId: jobRequest.id, details: "New job request submitted" });

  return NextResponse.redirect(new URL(`/portal/client?request=${jobRequest.id}`, request.url), { status: 303 });
}
