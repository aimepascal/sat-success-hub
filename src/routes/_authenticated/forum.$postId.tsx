import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/forum/$postId")({
  loader: async ({ params }) => {
    const { data } = await supabase.from("forum_posts").select("title,body").eq("id", params.postId).single();
    return { title: data?.title ?? "Thread", excerpt: (data?.body ?? "").slice(0, 155) };
  },
  head: ({ loaderData, params }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Thread"} — SAT Hub Forum` },
      { name: "description", content: loaderData?.excerpt || "A peer discussion thread on the SAT Hub forum." },
      { property: "og:title", content: loaderData?.title ?? "SAT Hub Forum Thread" },
      { property: "og:description", content: loaderData?.excerpt || "A peer discussion thread on the SAT Hub forum." },
    ],
    links: [{ rel: "canonical", href: `https://sat-success-hub.lovable.app/forum/${params?.postId}` }],
  }),
  component: ThreadPage,
});

function ThreadPage() {
  const { postId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [reply, setReply] = useState("");

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

  const submit = useMutation({
    mutationFn: async () => {
      const body = reply.trim();
      if (!body) return;
      const { error } = await supabase.from("forum_replies").insert({ post_id: postId, user_id: user.id, body: body.slice(0, 5000) });
      if (error) throw error;
    },
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["forum-replies", postId] });
      toast.success("Reply posted");
    },
  });

  if (!post) return <div className="mx-auto max-w-3xl px-4 py-10">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link to="/forum" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to forum
      </Link>

      <article className="mt-4 rounded-2xl border border-border bg-card p-6">
        <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">{post.topic}</span>
        <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight">{post.title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">By {post.profiles?.display_name ?? "Scholar"}</p>
        <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed">{post.body}</p>
        {post.image_url && (
          <img src={post.image_url} alt={`Image attached to forum post: ${post.title}`} className="mt-4 max-h-96 rounded-lg border border-border" />
        )}
      </article>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold">{replies.length} {replies.length === 1 ? "breakdown" : "breakdowns"}</h2>
        <ul className="mt-4 space-y-3">
          {replies.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium">{r.profiles?.display_name ?? "Scholar"}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{r.body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-5">
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Walk through your step-by-step breakdown..." rows={4} maxLength={5000} />
          <Button onClick={() => submit.mutate()} disabled={!reply.trim() || submit.isPending}>Post breakdown</Button>
        </div>
      </section>
    </div>
  );
}
