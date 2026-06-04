import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Plus, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/forum")({
  head: () => ({
    meta: [
      { title: "Peer Forum — SAT Hub" },
      { name: "description", content: "Ask SAT questions, share screenshots, and get clear peer-to-peer breakdowns from students who've solved them." },
    ],
    links: [{ rel: "canonical", href: "https://sat-success-hub.lovable.app/forum" }],
  }),
  component: ForumPage,
});

function ForumPage() {
  const { user } = Route.useRouteContext();
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

      <ul className="mt-8 space-y-3">
        {posts.map((p) => {
          const replyCount = (p.forum_replies as { count: number }[] | null)?.[0]?.count ?? 0;
          return (
            <li key={p.id}>
              <Link
                to="/forum/$postId"
                params={{ postId: p.id }}
                className="block rounded-2xl border border-border bg-card p-5 shadow-card transition hover:border-border-strong"
              >
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
              </Link>
            </li>
          );
        })}
        {posts.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
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
  const [imageUrl, setImageUrl] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !body.trim()) throw new Error("Title and body required");
      const { error } = await supabase.from("forum_posts").insert({
        user_id: userId,
        title: title.trim().slice(0, 200),
        body: body.trim().slice(0, 5000),
        topic,
        image_url: imageUrl.trim() || null,
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
      <Input placeholder="Optional: image URL of the SAT question" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} maxLength={500} />
      <Button onClick={() => submit.mutate()} disabled={submit.isPending}>Post question</Button>
    </div>
  );
}
