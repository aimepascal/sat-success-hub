import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageSquare, Search, Download } from "lucide-react";
import { toast } from "sonner";
import type { Resource } from "@/lib/db-types";

export const Route = createFileRoute("/vault")({
  head: () => ({
    meta: [
      { title: "Cheat Code Vault — SAT Hub" },
      { name: "description", content: "Searchable library of ultra-simplified SAT shortcuts and tricks, organized by topic and upvoted by the community." },
      { property: "og:title", content: "SAT Cheat Code Vault — Shortcuts that actually work" },
      { property: "og:description", content: "Browse and upvote bite-sized SAT shortcuts, sorted by topic and contributed by students who scored." },
      { property: "og:url", content: "https://sat-success-hub.lovable.app/vault" },
    ],
    links: [{ rel: "canonical", href: "https://sat-success-hub.lovable.app/vault" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "SAT Cheat Code Vault",
          url: "https://sat-success-hub.lovable.app/vault",
          description: "A curated, searchable library of ultra-simplified SAT shortcuts and tricks across Math, Reading, and Writing.",
          inLanguage: "en",
          isPartOf: { "@id": "https://sat-success-hub.lovable.app/#website" },
        }),
      },
    ],
  }),
  component: VaultPage,
});

const SECTIONS = ["All", "Math", "Reading", "Writing"];

function VaultPage() {
  const { user } = Route.useRouteContext();
  const [q, setQ] = useState("");
  const [section, setSection] = useState("All");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: resources = [] } = useQuery({
    queryKey: ["resources"],
    queryFn: async () => {
      const { data } = await supabase.from("resources").select("*").order("created_at", { ascending: false });
      return (data ?? []) as Resource[];
    },
  });

  const { data: likes = [] } = useQuery({
    queryKey: ["resource-likes"],
    queryFn: async () => (await supabase.from("resource_likes").select("resource_id,user_id")).data ?? [],
  });

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      const matchSection = section === "All" || r.section === section;
      const matchQ = !q || (r.title + r.summary + r.content + r.category).toLowerCase().includes(q.toLowerCase());
      return matchSection && matchQ;
    });
  }, [resources, q, section]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Cheat Code Vault</h1>
        <p className="mt-2 text-muted-foreground">Searchable shortcuts. Upvote what worked. Comment with your variation.</p>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by topic, keyword, section..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {SECTIONS.map((s) => (
            <button key={s} onClick={() => setSection(s)} className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${section === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{s}</button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => (
          <ResourceCard
            key={r.id}
            r={r}
            userId={user.id}
            likeCount={likes.filter((l) => l.resource_id === r.id).length}
            liked={likes.some((l) => l.resource_id === r.id && l.user_id === user.id)}
            onOpen={() => setOpenId(r.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No resources match. Try a different keyword.
          </div>
        )}
      </div>

      {openId && <ResourceModal resourceId={openId} userId={user.id} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function ResourceCard({ r, userId, likeCount, liked, onOpen }: { r: Resource; userId: string; likeCount: number; liked: boolean; onOpen: () => void }) {
  const qc = useQueryClient();
  const toggle = useMutation({
    mutationFn: async () => {
      if (liked) await supabase.from("resource_likes").delete().eq("resource_id", r.id).eq("user_id", userId);
      else await supabase.from("resource_likes").insert({ resource_id: r.id, user_id: userId });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resource-likes"] }),
  });

  return (
    <article className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition hover:border-border-strong">
      <div className="flex items-start justify-between">
        <span className="inline-flex items-center rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">{r.section}</span>
        <span className="text-xs text-muted-foreground">{r.category}</span>
      </div>
      <h3 className="mt-3 font-display text-lg font-semibold leading-snug">{r.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{r.summary}</p>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <button
            onClick={(e) => { e.stopPropagation(); toggle.mutate(); }}
            className={`inline-flex items-center gap-1 transition ${liked ? "text-primary" : "hover:text-foreground"}`}
          >
            <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} /> {likeCount}
          </button>
          <span className="inline-flex items-center gap-1"><Download className="h-3.5 w-3.5" /> {r.download_count}</span>
        </div>
        <button onClick={onOpen} className="text-xs font-medium text-primary hover:underline">Open →</button>
      </div>
    </article>
  );
}

function ResourceModal({ resourceId, userId, onClose }: { resourceId: string; userId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [comment, setComment] = useState("");

  const { data: resource } = useQuery({
    queryKey: ["resource", resourceId],
    queryFn: async () => (await supabase.from("resources").select("*").eq("id", resourceId).single()).data,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["resource-comments", resourceId],
    queryFn: async () => {
      const { data } = await supabase
        .from("resource_comments")
        .select("*, profiles!resource_comments_profile_fk(display_name,avatar_url)")
        .eq("resource_id", resourceId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const post = useMutation({
    mutationFn: async () => {
      const body = comment.trim();
      if (!body) return;
      const { error } = await supabase.from("resource_comments").insert({ resource_id: resourceId, user_id: userId, body });
      if (error) throw error;
    },
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["resource-comments", resourceId] });
      toast.success("Reflection posted");
    },
  });

  if (!resource) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-card p-6 shadow-elevated sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">{resource.section} · {resource.category}</span>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">{resource.title}</h2>
          </div>
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
        </div>
        <p className="mt-4 text-sm font-medium text-muted-foreground">{resource.summary}</p>
        <pre className="mt-5 whitespace-pre-wrap rounded-xl bg-surface-elevated p-4 font-sans text-sm leading-relaxed">{resource.content}</pre>

        <div className="mt-8">
          <h3 className="text-sm font-semibold">Reflections ({comments.length})</h3>
          <div className="mt-3 space-y-3">
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How did this trick work for you?" maxLength={500} />
            <Button size="sm" onClick={() => post.mutate()} disabled={!comment.trim() || post.isPending}>Post reflection</Button>
          </div>
          <ul className="mt-5 space-y-4">
            {comments.map((c) => (
              <li key={c.id} className="rounded-lg border border-border bg-surface p-3">
                <p className="text-xs font-medium text-foreground">{c.profiles?.display_name ?? "Scholar"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
