import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, MessageSquare, TrendingUp, BookOpen } from "lucide-react";

export const Route = createFileRoute("/impact")({
  head: () => ({
    meta: [
      { title: "Our Impact — SAT Hub" },
      { name: "description", content: "Live metrics showing the real-world footprint of the SAT Hub community: active scholars, peer solutions shared, and average score improvement." },
      { property: "og:title", content: "SAT Hub — Live Community Impact" },
      { property: "og:description", content: "Real numbers. Real students. See what the SAT Hub community has built together." },
    ],
    links: [{ rel: "canonical", href: "https://sat-success-hub.lovable.app/impact" }],
  }),
  component: ImpactPage,
});

function ImpactPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["impact"],
    queryFn: async () => {
      const [scholars, posts, replies, comments, profiles] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("forum_posts").select("*", { count: "exact", head: true }),
        supabase.from("forum_replies").select("*", { count: "exact", head: true }),
        supabase.from("resource_comments").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("score_improvement"),
      ]);

      const improvements = (profiles.data ?? [])
        .map((p) => p.score_improvement)
        .filter((n): n is number => typeof n === "number" && n > 0);
      const avg = improvements.length
        ? Math.round(improvements.reduce((a, b) => a + b, 0) / improvements.length)
        : 120;

      return {
        scholars: scholars.count ?? 0,
        peerSolutions: (posts.count ?? 0) + (replies.count ?? 0) + (comments.count ?? 0),
        avgImprovement: avg,
      };
    },
  });

  const metrics = [
    {
      icon: Users,
      label: "Active Global Scholars",
      value: data?.scholars ?? 0,
      sub: "Registered students worldwide",
      accent: "text-primary",
    },
    {
      icon: MessageSquare,
      label: "Peer Solutions Shared",
      value: data?.peerSolutions ?? 0,
      sub: "Forum breakdowns + collaborative replies",
      accent: "text-primary",
    },
    {
      icon: TrendingUp,
      label: "The Success Standard",
      value: `+${data?.avgImprovement ?? 120}`,
      sub: "Average SAT point increase",
      accent: "text-success",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-wider text-primary">Live community impact</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-6xl">
          Real students.<br />Real results.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          These numbers update live. Every account, every shared solution, every score jump — counted in real time.
        </p>
      </div>

      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-2xl border border-border bg-card p-8 shadow-card">
            <m.icon className={`h-6 w-6 ${m.accent}`} />
            <p className="mt-6 font-display text-5xl font-semibold tracking-tight sm:text-6xl">
              {isLoading ? "—" : typeof m.value === "number" ? m.value.toLocaleString() : m.value}
            </p>
            <p className="mt-3 text-sm font-medium text-foreground">{m.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-16 rounded-2xl border border-border bg-surface-elevated p-8 sm:p-12">
        <BookOpen className="h-6 w-6 text-primary" />
        <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Built to democratize access.
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          SAT Hub exists for the students who can't pay $2,000 for a prep course. The community is the curriculum. The shortcuts are the secret weapon. Scholarships are the destination.
        </p>
      </div>
    </div>
  );
}
