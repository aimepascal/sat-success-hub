import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { downloadFromUrl } from "@/lib/forum-attachments";
import { formatDuration, formatVideoSize } from "@/lib/forum-video";

export function VideoCard({
  url,
  name,
  size,
}: {
  url: string;
  name: string | null;
  size: number | null;
}) {
  const [busy, setBusy] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const label = name || "video.mp4";

  const download = async () => {
    setBusy(true);
    try {
      await downloadFromUrl(url, label);
    } catch {
      toast.error("Couldn't download that video");
    } finally {
      setBusy(false);
    }
  };

  return (
    <figure className="overflow-hidden rounded-2xl border border-border bg-surface-elevated">
      <video
        src={url}
        controls
        preload="metadata"
        playsInline
        controlsList="nodownload"
        className="max-h-[32rem] w-full bg-black"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
      <figcaption className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {[duration ? formatDuration(duration) : null, size ? formatVideoSize(size) : null]
              .filter(Boolean)
              .join(" · ") || "Shared video"}
          </p>
        </div>
        <button
          onClick={download}
          disabled={busy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold transition hover:border-border-strong disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Download
        </button>
      </figcaption>
    </figure>
  );
}
