import { createSupabaseServiceClient } from "./supabase";
import { makeId } from "./auth";
import { nowIso } from "./database";
import type { UploadedFile } from "./types";

export async function uploadToObjectStorage(file: File, folder = "job-requests"): Promise<UploadedFile> {
  const supabase = createSupabaseServiceClient();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "job-files";
  const id = makeId();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storedName = `${folder}/${id}-${safeName}`;
  const { error } = await supabase.storage.from(bucket).upload(storedName, file, { contentType: file.type || "application/octet-stream", upsert: false });
  if (error) throw error;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(storedName, 60 * 60 * 24 * 7);
  return { id, originalName: file.name, storedName, contentType: file.type || "application/octet-stream", size: file.size, url: data?.signedUrl ?? storedName, createdAt: nowIso() };
}

export async function uploadGeneratedDocument(name: string, body: Buffer, contentType = "application/pdf") {
  const supabase = createSupabaseServiceClient();
  const bucket = process.env.SUPABASE_DOCUMENT_BUCKET || "generated-documents";
  const storedName = `documents/${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  const { error } = await supabase.storage.from(bucket).upload(storedName, body, { contentType, upsert: true });
  if (error) throw error;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(storedName, 60 * 60 * 24 * 7);
  return { storedName, url: data?.signedUrl ?? storedName };
}
