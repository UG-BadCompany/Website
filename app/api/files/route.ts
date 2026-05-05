import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";
import { makeId } from "../../lib/auth";
import { addAudit, addFile, nowIso, updateDatabase } from "../../lib/database";
import type { UploadedFile } from "../../lib/types";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.redirect(new URL("/portal/client?file=missing", request.url), { status: 303 });
  const uploadDir = join(process.cwd(), ".data", "uploads");
  mkdirSync(uploadDir, { recursive: true });
  const id = makeId("file");
  const storedName = `${id}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  writeFileSync(join(uploadDir, storedName), Buffer.from(await file.arrayBuffer()));
  const uploaded: UploadedFile = { id, originalName: file.name, storedName, contentType: file.type || "application/octet-stream", size: file.size, url: `/uploads/${storedName}`, createdAt: nowIso() };
  updateDatabase((database) => {
    addFile(database, uploaded);
    addAudit(database, { actor: "portal", action: "upload", entityType: "File", entityId: uploaded.id, details: uploaded.originalName });
  });
  return NextResponse.redirect(new URL("/portal/client?file=uploaded", request.url), { status: 303 });
}
