import { useState } from "react";
import { ImagePlus, Loader2, Paperclip, X, FileText, Video } from "lucide-react";
import { toast } from "sonner";
import {
  formatBytes,
  fileKind,
  uploadForumFile,
  uploadForumImage,
  type FileAttachment,
} from "@/lib/forum-attachments";
import { formatVideoSize, uploadForumVideo, type VideoAttachment } from "@/lib/forum-video";

export function AttachmentPicker({
  userId,
  imageUrl,
  onImageChange,
  file,
  onFileChange,
  video,
  onVideoChange,
  busy,
  onBusyChange,
}: {
  userId: string;
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
  file: FileAttachment | null;
  onFileChange: (file: FileAttachment | null) => void;
  video?: VideoAttachment | null;
  onVideoChange?: (video: VideoAttachment | null) => void;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const [mode, setMode] = useState<"image" | "file" | "video" | null>(null);
  const [progress, setProgress] = useState(0);

  const handle = async (kind: "image" | "file", picked: File) => {
    onBusyChange(true);
    setMode(kind);
    try {
      if (kind === "image") onImageChange(await uploadForumImage(userId, picked));
      else onFileChange(await uploadForumFile(userId, picked));
      toast.success(kind === "image" ? "Image attached" : "Resource attached");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      onBusyChange(false);
      setMode(null);
    }
  };

  const handleVideo = async (picked: File) => {
    if (!onVideoChange) return;
    onBusyChange(true);
    setMode("video");
    setProgress(0);
    try {
      const attachment = await uploadForumVideo(userId, picked, setProgress);
      onVideoChange(attachment);
      toast.success("Video attached");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Video upload failed");
    } finally {
      onBusyChange(false);
      setMode(null);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-3">
      {(imageUrl || file || video) && (
        <div className="space-y-2">
          {imageUrl && (
            <div className="relative inline-block">
              <img src={imageUrl} alt="Attachment preview" className="max-h-48 rounded-xl border border-border" />
              <button
                type="button"
                onClick={() => onImageChange(null)}
                className="absolute -right-2 -top-2 rounded-full bg-card p-1 shadow-card hover:bg-muted"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {file && (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-elevated p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {fileKind(file.file_type, file.file_name)} · {formatBytes(file.file_size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onFileChange(null)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {video && (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-elevated p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Video className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{video.video_name}</p>
                <p className="text-xs text-muted-foreground">Video · {formatVideoSize(video.video_size)}</p>
              </div>
              <button
                type="button"
                onClick={() => onVideoChange?.(null)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove video"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {busy && mode === "video" && (
        <div className="rounded-xl border border-border bg-surface p-3">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Uploading video… keep this page open</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!imageUrl && (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-surface px-3.5 py-2 text-sm font-medium text-muted-foreground transition hover:border-border-strong hover:text-foreground">
            {busy && mode === "image" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {busy && mode === "image" ? "Uploading…" : "Add image"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handle("image", f);
                e.target.value = "";
              }}
            />
          </label>
        )}
        {!file && (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-surface px-3.5 py-2 text-sm font-medium text-muted-foreground transition hover:border-border-strong hover:text-foreground">
            {busy && mode === "file" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            {busy && mode === "file" ? "Uploading…" : "Attach resource (PDF, doc, slides)"}
            <input
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.zip"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handle("file", f);
                e.target.value = "";
              }}
            />
          </label>
        )}
        {onVideoChange && !video && (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-surface px-3.5 py-2 text-sm font-medium text-muted-foreground transition hover:border-border-strong hover:text-foreground">
            {busy && mode === "video" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
            {busy && mode === "video" ? "Uploading video…" : "Add video lesson (up to 5GB)"}
            <input
              type="file"
              accept="video/*,.mkv,.mov,.m4v,.avi"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleVideo(f);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Images up to 5MB · Resources up to 20MB · Videos up to 5GB (long lessons of 2 hours and more are fine — uploads
        resume if your connection drops)
      </p>
    </div>
  );
}
