import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Users, Globe, TrendingUp, BookOpen, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SAT Hub — Cheat Codes, Community & Scholarships" },
      { name: "description", content: "Ultra-simplified SAT shortcuts, peer-to-peer breakdowns, and a curated pipeline of international scholarships. Built for students who can't afford to waste time." },
      { property: "og:title", content: "SAT Hub — Cheat Codes, Community & Scholarships" },
      { property: "og:description", content: "Ultra-simplified SAT shortcuts, peer-to-peer breakdowns, and international scholarships in one place." },
      { property: "og:url", content: "https://sat-success-hub.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://sat-success-hub.lovable.app/" }],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 sm:pt-28 lg:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Free for students. Forever.
            </div>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              The SAT, <span className="text-gradient">simplified.</span><br />
              Scholarships, <span className="text-gradient">unlocked.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Ultra-fast test shortcuts, peer-to-peer breakdowns from students who scored high, and a live pipeline of international scholarships. No fluff. No paywall.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link to="/auth" search={{ mode: "signup" }}>Join the community <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/impact">See our impact</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-surface-elevated">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-wider text-primary">What you get</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Four tools. Built for speed.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="group rounded-2xl border border-border bg-card p-6 shadow-card transition hover:border-border-strong">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">
            Stop studying like it's 2010.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Join thousands of students worldwide who use shortcuts, not textbooks.
          </p>
          <div className="mt-8">
            <Button size="lg" asChild>
              <Link to="/auth" search={{ mode: "signup" }}>Create your free account <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

const features = [
  { icon: Zap, title: "Cheat Code Vault", desc: "Simplified SAT tricks, searchable by topic. Upvote what worked." },
  { icon: MessageSquare, title: "Peer Forum", desc: "Stuck on a question? Post a screenshot, get a breakdown." },
  { icon: Globe, title: "Scholarship Pipeline", desc: "Filter US, UK, Australia opportunities by deadline & type." },
  { icon: TrendingUp, title: "Impact Dashboard", desc: "Live counters showing the community's real footprint." },
];
