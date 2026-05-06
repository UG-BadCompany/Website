import { NextResponse } from "next/server";
import { addAudit, addFile } from "../../lib/database";
import { uploadToObjectStorage } from "../../lib/storage";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const jobRequestId = form.get("jobRequestId")?.toString();
  if (!(file instanceof File) || file.size === 0) return NextResponse.redirect(new URL("/portal/client?file=missing", request.url), { status: 303 });
  const uploaded = await uploadToObjectStorage(file, jobRequestId ? `job-requests/${jobRequestId}` : "portal-files");
  await addFile(uploaded, jobRequestId);
  await addAudit({ actor: "portal", action: "upload", entityType: "File", entityId: uploaded.id, details: uploaded.originalName });
  return NextResponse.redirect(new URL("/portal/client?file=uploaded", request.url), { status: 303 });
}
