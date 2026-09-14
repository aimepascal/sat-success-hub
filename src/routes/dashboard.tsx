import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, ArrowRight, Zap, Sparkles } from "lucide-react";
import { useAuthUser } from "@/hooks/use-auth-user";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Explore SAT Hub — Dashboard" },
      { name: "description", content: "Jump into the Cheat Code Vault, the Peer Forum, or see live community impact. Free to browse, no account required." },
      { property: "og:title", content: "Explore the SAT Hub Dashboard" },
      { property: "og:description", content: "One launchpad for every SAT Hub tool — cheat codes and peer threads. Browse freely." },
      { property: "og:url", content: "https://sat-success-hub.lovable.app/dashboard" },
    ],
    links: [{ rel: "canonical", href: "https://sat-success-hub.lovable.app/dashboard" }],
  }),
  component: Dashboard,
});

function Dashboard() {
  const userId = useAuthUser();

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId!).maybeSingle();
      return data;
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["dashboard-recent"],
    queryFn: async () => {
      const [resources, posts] = await Promise.all([
        supabase.from("resources").select("*").order("created_at", { ascending: false }).limit(3),
        supabase.from("forum_posts").select("*").order("created_at", { ascending: false }).limit(3),
      ]);
      return { resources: resources.data ?? [], posts: posts.data ?? [] };
    },
  });

  const cards = [
    { to: "/vault" as const, icon: Zap, title: "Cheat Code Vault", desc: "Search shortcuts by topic." },
    { to: "/forum" as const, icon: MessageSquare, title: "Peer Forum", desc: "Ask. Answer. Level up." },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div>
        {userId ? (
          <>
            <p className="text-sm text-muted-foreground">Welcome back,</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {profile?.display_name ?? "Student"}
            </h1>
          </>
        ) : (
          <>
            <p className="inline-flex items-center gap-1.5 text-sm font-medium uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Explore SAT Hub
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Browse everything. No account needed.
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Read the vault and follow live forum threads. Create a free account only when you want to post, reply, or save your progress.
            </p>
          </>
        )}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className="group rounded-2xl border border-border bg-card p-6 shadow-card transition hover:border-primary/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <c.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-display text-base font-semibold">{c.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.desc}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Open <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Latest cheat codes</h2>
            <Link to="/vault" className="text-sm font-medium text-primary hover:underline">View all</Link>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {(recent?.resources ?? []).map((r) => (
              <li key={r.id} className="py-3">
                <p className="text-sm font-medium">{r.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.category} · {r.section}</p>
              </li>
            ))}
            {(!recent?.resources || recent.resources.length === 0) && <li className="py-3 text-sm text-muted-foreground">No resources yet.</li>}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Hot threads</h2>
            <Link to="/forum" className="text-sm font-medium text-primary hover:underline">View all</Link>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {(recent?.posts ?? []).map((p) => (
              <li key={p.id} className="py-3">
                <Link to="/forum/$postId" params={{ postId: p.id }} className="text-sm font-medium hover:text-primary">
                  {p.title}
                </Link>
                <p className="mt-0.5 text-xs text-muted-foreground">{p.topic}</p>
              </li>
            ))}
            {(!recent?.posts || recent.posts.length === 0) && <li className="py-3 text-sm text-muted-foreground">No posts yet. Start the first one!</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
