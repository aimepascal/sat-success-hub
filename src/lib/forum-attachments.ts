import { supabase } from "@/integrations/supabase/client";

export type FileAttachment = {
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
};

const FIVE_YEARS = 60 * 60 * 24 * 365 * 5;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/zip",
];

export function formatBytes(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileKind(type: string, name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (type === "application/pdf" || ext === "pdf") return "PDF";
  if (ext === "doc" || ext === "docx") return "DOC";
  if (ext === "ppt" || ext === "pptx") return "SLIDES";
  if (ext === "xls" || ext === "xlsx" || ext === "csv") return "SHEET";
  if (ext === "zip") return "ZIP";
  if (ext === "txt") return "TEXT";
  return ext.toUpperCase() || "FILE";
}

async function uploadTo(bucket: string, userId: string, file: File) {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (upErr) throw upErr;
  const { data: signed, error: signErr } = await supabase.storage.from(bucket).createSignedUrl(path, FIVE_YEARS);
  if (signErr) throw signErr;
  return signed.signedUrl;
}

export async function uploadForumImage(userId: string, file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Please pick an image file");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Images must be under 5MB");
  return uploadTo("forum-images", userId, file);
}

export async function uploadForumFile(userId: string, file: File): Promise<FileAttachment> {
  if (file.size > MAX_FILE_BYTES) throw new Error("Files must be under 20MB");
  if (file.type.startsWith("image/")) throw new Error("Use the image attachment for pictures");
  const url = await uploadTo("forum-files", userId, file);
  return {
    file_url: url,
    file_name: file.name.slice(0, 200),
    file_type: file.type || "application/octet-stream",
    file_size: file.size,
  };
}

export async function downloadFromUrl(url: string, fileName: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Network error");
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
