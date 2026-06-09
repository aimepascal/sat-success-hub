import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Download, Trash2, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/forum/$postId")({
  loader: async ({ params }) => {
    const { data: post } = await supabase
      .from("forum_posts")
      .select("title,body,created_at")
      .eq("id", params.postId)
      .single();
    const { data: replies } = await supabase
      .from("forum_replies")
      .select("body,created_at")
      .eq("post_id", params.postId)
      .order("created_at", { ascending: true })
      .limit(20);
    return {
      title: post?.title ?? "Thread",
      body: post?.body ?? "",
      createdAt: post?.created_at ?? null,
      excerpt: (post?.body ?? "").slice(0, 155),
      replies: replies ?? [],
    };
  },
  head: ({ loaderData, params }) => {
    const url = `https://sat-success-hub.lovable.app/forum/${params?.postId}`;
    const qaSchema = loaderData
      ? {
          "@context": "https://schema.org",
          "@type": "QAPage",
          mainEntity: {
            "@type": "Question",
            name: loaderData.title,
            text: loaderData.body || loaderData.title,
            dateCreated: loaderData.createdAt,
            answerCount: loaderData.replies.length,
            ...(loaderData.replies.length > 0
              ? {
                  suggestedAnswer: loaderData.replies.map((r) => ({
                    "@type": "Answer",
                    text: r.body,
                    dateCreated: r.created_at,
                  })),
                }
              : {}),
          },
        }
      : null;
    return {
      meta: [
        { title: `${loaderData?.title ?? "Thread"} — SAT Hub Forum` },
        { name: "description", content: loaderData?.excerpt || "A peer discussion thread on the SAT Hub forum." },
        { property: "og:title", content: loaderData?.title ?? "SAT Hub Forum Thread" },
        { property: "og:description", content: loaderData?.excerpt || "A peer discussion thread on the SAT Hub forum." },
        { property: "og:type", content: "article" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: qaSchema ? [{ type: "application/ld+json", children: JSON.stringify(qaSchema) }] : [],
    };
  },
  component: ThreadPage,
});

function ThreadPage() {
  const { postId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [reply, setReply] = useState("");
  const [replyImageUrl, setReplyImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: post } = useQuery({
    queryKey: ["forum-post", postId],
    queryFn: async () => (await supabase.from("forum_posts").select("*, profiles!forum_posts_profile_fk(display_name,avatar_url)").eq("id", postId).single()).data,
  });

  const { data: replies = [] } = useQuery({
    queryKey: ["forum-replies", postId],
    queryFn: async () => {
      const { data } = await supabase
        .from("forum_replies")
        .select("*, profiles!forum_replies_profile_fk(display_name,avatar_url)")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const handleReplyImage = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please pick an image"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("forum-images").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage.from("forum-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (signErr) throw signErr;
      setReplyImageUrl(signed.signedUrl);
      toast.success("Image attached");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = useMutation({
    mutationFn: async () => {
      const body = reply.trim();
      if (!body && !replyImageUrl) return;
      const { error } = await supabase.from("forum_replies").insert({
        post_id: postId,
        user_id: user.id,
        body: body.slice(0, 5000),
        image_url: replyImageUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReply("");
      setReplyImageUrl(null);
      qc.invalidateQueries({ queryKey: ["forum-replies", postId] });
      toast.success("Reply posted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't post reply"),
  });

  const deletePost = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("forum_posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forum-posts"] });
      toast.success("Post deleted");
      navigate({ to: "/forum" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't delete"),
  });

  const deleteReply = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("forum_replies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forum-replies", postId] });
      toast.success("Reply removed");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't delete"),
  });

  const downloadImage = async (url: string, label: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Network error");
      const blob = await res.blob();
      const ext = (blob.type.split("/")[1] || "jpg").split("+")[0];
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `sat-hub-${label}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch {
      toast.error("Couldn't download image");
    }
  };

  if (!post) return <div className="mx-auto max-w-3xl px-4 py-10">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link to="/forum" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to forum
      </Link>

      <article className="mt-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">{post.topic}</span>
          {post.user_id === user.id && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={deletePost.isPending}
              onClick={() => { if (confirm("Delete this post permanently?")) deletePost.mutate(); }}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete post
            </Button>
          )}
        </div>
        <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight">{post.title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">By {post.profiles?.display_name ?? "Scholar"}</p>
        <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed">{post.body}</p>
        {post.image_url && (
          <div className="mt-4 space-y-2">
            <img src={post.image_url} alt={`Image attached to forum post: ${post.title}`} className="max-h-96 rounded-lg border border-border" />
            <Button size="sm" variant="outline" onClick={() => downloadImage(post.image_url!, `post-${postId}`)}>
              <Download className="mr-1 h-3.5 w-3.5" /> Download image
            </Button>
          </div>
        )}
      </article>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">{replies.length} {replies.length === 1 ? "breakdown" : "breakdowns"}</h2>
        <ul className="mt-4 space-y-3">
          {replies.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-medium">{r.profiles?.display_name ?? "Scholar"}</p>
                {r.user_id === user.id && (
                  <button
                    onClick={() => { if (confirm("Delete this reply?")) deleteReply.mutate(r.id); }}
                    className="text-xs text-muted-foreground hover:text-destructive"
                    aria-label="Delete reply"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {r.body && <p className="mt-2 whitespace-pre-wrap text-sm">{r.body}</p>}
              {r.image_url && (
                <div className="mt-3 space-y-2">
                  <img src={r.image_url} alt="Image attached to reply" className="max-h-80 rounded-lg border border-border" loading="lazy" />
                  <Button size="sm" variant="outline" onClick={() => downloadImage(r.image_url!, `reply-${r.id}`)}>
                    <Download className="mr-1 h-3.5 w-3.5" /> Download image
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-5">
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Walk through your step-by-step breakdown..." rows={4} maxLength={5000} />
          {replyImageUrl ? (
            <div className="relative inline-block">
              <img src={replyImageUrl} alt="Reply attachment preview" className="max-h-48 rounded-lg border border-border" />
              <button type="button" onClick={() => setReplyImageUrl(null)} className="absolute -right-2 -top-2 rounded-full bg-card p-1 shadow-card hover:bg-muted" aria-label="Remove image">
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
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleReplyImage(f); e.target.value = ""; }}
              />
            </label>
          )}
          <div>
            <Button onClick={() => submit.mutate()} disabled={(!reply.trim() && !replyImageUrl) || submit.isPending || uploading}>Post breakdown</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
