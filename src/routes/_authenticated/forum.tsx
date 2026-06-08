import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Plus, X, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/forum")({
  head: () => ({
    meta: [
      { title: "Peer Forum — SAT Hub" },
      { name: "description", content: "Ask SAT questions, share screenshots, and get clear peer-to-peer breakdowns from students who've solved them." },
      { property: "og:title", content: "SAT Hub Peer Forum — Get unstuck on any SAT question" },
      { property: "og:description", content: "Post a screenshot, get a peer-written breakdown. A focused community for students prepping for the SAT." },
      { property: "og:url", content: "https://sat-success-hub.lovable.app/forum" },
    ],
    links: [{ rel: "canonical", href: "https://sat-success-hub.lovable.app/forum" }],
  }),
  component: ForumPage,
});

function ForumPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: posts = [] } = useQuery({
    queryKey: ["forum-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("forum_posts")
        .select("*, profiles!forum_posts_profile_fk(display_name,avatar_url), forum_replies(count)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("forum_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forum-posts"] });
      toast.success("Post deleted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't delete"),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Crowdsourced Breakdowns</h1>
          <p className="mt-2 text-muted-foreground">Stuck on a question? Post it. Peers will break it down.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X className="mr-1 h-4 w-4" /> Cancel</> : <><Plus className="mr-1 h-4 w-4" /> New question</>}
        </Button>
      </div>

      {showForm && <NewPostForm userId={user.id} onDone={() => setShowForm(false)} />}

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {posts.map((p) => {
          const replyCount = (p.forum_replies as { count: number }[] | null)?.[0]?.count ?? 0;
          return (
            <li key={p.id}>
              <Link
                to="/forum/$postId"
                params={{ postId: p.id }}
                className="block h-full overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:border-border-strong"
              >
                {p.image_url && (
                  <img src={p.image_url} alt={`Image attached to forum post: ${p.title}`} className="h-44 w-full object-cover" loading="lazy" />
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">{p.topic}</span>
                      <h3 className="mt-2 font-display text-lg font-semibold leading-snug">{p.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.body}</p>
                      <p className="mt-3 text-xs text-muted-foreground">By {p.profiles?.display_name ?? "Scholar"}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 rounded-lg bg-surface-elevated px-3 py-1.5 text-sm font-medium">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" /> {replyCount}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
        {posts.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground sm:col-span-2">
            No questions yet. Be the first to start the conversation.
          </li>
        )}
      </ul>
    </div>
  );
}

const TOPICS = ["General", "Math", "Reading", "Writing", "Scholarships", "Strategy"];

function NewPostForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState("General");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please pick an image"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("forum-images").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage.from("forum-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (signErr) throw signErr;
      setImageUrl(signed.signedUrl);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !body.trim()) throw new Error("Title and body required");
      const { error } = await supabase.from("forum_posts").insert({
        user_id: userId,
        title: title.trim().slice(0, 200),
        body: body.trim().slice(0, 5000),
        topic,
        image_url: imageUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forum-posts"] });
      toast.success("Question posted");
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap gap-1">
        {TOPICS.map((t) => (
          <button key={t} onClick={() => setTopic(t)} className={`rounded-full px-3 py-1 text-xs font-medium ${topic === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{t}</button>
        ))}
      </div>
      <Input placeholder="What's your question?" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
      <Textarea placeholder="Add context, paste the question, describe what you've tried..." rows={5} value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} />

      {imageUrl ? (
        <div className="relative inline-block">
          <img src={imageUrl} alt="Attachment preview" className="max-h-48 rounded-lg border border-border" />
          <button type="button" onClick={() => setImageUrl(null)} className="absolute -right-2 -top-2 rounded-full bg-card p-1 shadow-card hover:bg-muted" aria-label="Remove image">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-surface px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {uploading ? "Uploading..." : "Attach an image"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }}
          />
        </label>
      )}

      <div>
        <Button onClick={() => submit.mutate()} disabled={submit.isPending || uploading}>Post question</Button>
      </div>
    </div>
  );
}
