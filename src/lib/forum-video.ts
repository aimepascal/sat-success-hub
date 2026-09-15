import { supabase } from "@/integrations/supabase/client";
import * as tus from "tus-js-client";

export type VideoAttachment = {
  video_url: string;
  video_name: string;
  video_type: string;
  video_size: number;
};

const FIVE_YEARS = 60 * 60 * 24 * 365 * 5;
const BUCKET = "forum-videos";

/** 5GB — long lectures (2+ hours) fit comfortably. */
export const MAX_VIDEO_BYTES = 5 * 1024 * 1024 * 1024;

export const ALLOWED_VIDEO_EXT = [".mp4", ".mov", ".webm", ".m4v", ".mkv", ".avi"];

export function formatVideoSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function isVideoFile(file: File) {
  if (file.type.startsWith("video/")) return true;
  const lower = file.name.toLowerCase();
  return ALLOWED_VIDEO_EXT.some((ext) => lower.endsWith(ext));
}

/**
 * Resumable (chunked) upload so multi-gigabyte lecture recordings survive
 * flaky connections. Chunk size must be exactly 6MB for Supabase Storage.
 */
export async function uploadForumVideo(
  userId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<VideoAttachment> {
  if (!isVideoFile(file)) throw new Error("Please pick a video file (MP4, MOV, WEBM, MKV)");
  if (file.size > MAX_VIDEO_BYTES) throw new Error("Videos must be under 5GB");

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Please sign in again to upload");

  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const objectName = `${userId}/${crypto.randomUUID()}.${ext}`;
  const contentType = file.type || "video/mp4";
  const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/upload/resumable`;

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint,
      retryDelays: [0, 3000, 6000, 12000, 24000],
      headers: {
        authorization: `Bearer ${token}`,
        "x-upsert": "true",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: BUCKET,
        objectName,
        contentType,
        cacheControl: "3600",
      },
      chunkSize: 6 * 1024 * 1024,
      onError: (error) => reject(error instanceof Error ? error : new Error("Upload failed")),
      onProgress: (sent, total) => {
        if (total > 0) onProgress?.(Math.round((sent / total) * 100));
      },
      onSuccess: () => resolve(),
    });

    void upload.findPreviousUploads().then((previous) => {
      if (previous.length > 0 && previous[0]) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    });
  });

  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(objectName, FIVE_YEARS);
  if (signErr || !signed) throw signErr ?? new Error("Couldn't prepare the video link");

  return {
    video_url: signed.signedUrl,
    video_name: file.name.slice(0, 200),
    video_type: contentType,
    video_size: file.size,
  };
}
