import { Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { downloadFromUrl, fileKind, formatBytes } from "@/lib/forum-attachments";

export function AttachmentCard({
  url,
  name,
  type,
  size,
}: {
  url: string;
  name: string | null;
  type: string | null;
  size: number | null;
}) {
  const [busy, setBusy] = useState(false);
  const label = name || "attachment";
  const kind = fileKind(type ?? "", label);

  const download = async () => {
    setBusy(true);
    try {
      await downloadFromUrl(url, label);
    } catch {
      toast.error("Couldn't download that file");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-elevated p-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {kind}
          {size ? ` · ${formatBytes(size)}` : ""}
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
    </div>
  );
}
