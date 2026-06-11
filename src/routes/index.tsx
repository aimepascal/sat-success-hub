import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Globe, TrendingUp, MessageSquare, Quote, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero-students.jpg";
import studyImg from "@/assets/feature-study.jpg";
import communityImg from "@/assets/feature-community.jpg";
import scholarshipsImg from "@/assets/feature-scholarships.jpg";

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
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://sat-success-hub.lovable.app/#organization",
              name: "SAT Hub",
              url: "https://sat-success-hub.lovable.app/",
              description: "Simplified SAT prep, peer community, and international scholarships.",
            },
            {
              "@type": "WebSite",
              "@id": "https://sat-success-hub.lovable.app/#website",
              url: "https://sat-success-hub.lovable.app/",
              name: "SAT Hub",
              publisher: { "@id": "https://sat-success-hub.lovable.app/#organization" },
              inLanguage: "en",
            },
          ],
        }),
      },
    ],
  }),
  component: Landing,
});

function useLiveStats() {
  return useQuery({
    queryKey: ["live-stats"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [students, posts, replies, scholarships, resources] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("forum_posts").select("id", { count: "exact", head: true }),
        supabase.from("forum_replies").select("id", { count: "exact", head: true }),
        supabase.from("scholarships").select("id", { count: "exact", head: true }),
        supabase.from("resources").select("id", { count: "exact", head: true }),
      ]);
      return {
        students: students.count ?? 0,
        posts: posts.count ?? 0,
        replies: replies.count ?? 0,
        scholarships: scholarships.count ?? 0,
        resources: resources.count ?? 0,
      };
    },
  });
}

function useLiveActivity() {
  return useQuery({
    queryKey: ["live-activity"],
    refetchInterval: 20_000,
    queryFn: async () => {
      const [posts, scholarships, resources] = await Promise.all([
        supabase.from("forum_posts").select("id,title,topic,created_at").order("created_at", { ascending: false }).limit(4),
        supabase.from("scholarships").select("id,name,country,deadline").order("created_at", { ascending: false }).limit(3),
        supabase.from("resources").select("id,title,section,created_at").order("created_at", { ascending: false }).limit(3),
      ]);
      type Item = { kind: "post" | "scholarship" | "resource"; title: string; meta: string; at: string };
      const items: Item[] = [
        ...(posts.data ?? []).map((p) => ({ kind: "post" as const, title: p.title, meta: `New question · ${p.topic}`, at: p.created_at })),
        ...(scholarships.data ?? []).map((s) => ({ kind: "scholarship" as const, title: s.name, meta: `Scholarship · ${s.country}`, at: s.deadline })),
        ...(resources.data ?? []).map((r) => ({ kind: "resource" as const, title: r.title, meta: `Resource · ${r.section}`, at: r.created_at })),
      ];
      return items.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 6);
    },
  });
}

function Landing() {
  return (
    <div>
      <Hero />
      <StatsStrip />
      <FounderNote />
      <Features />
      <LiveActivity />
      <Voices />
      <CTA />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden paper">
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-20 sm:px-6 sm:pt-28 lg:grid-cols-[1.05fr_0.95fr] lg:pt-32">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-card">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Built by students, free forever
          </div>
          <h1 className="font-display text-5xl font-normal leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            The SAT,{" "}
            <span className="italic underline-sketch">simplified.</span>
            <br />
            Scholarships,{" "}
            <span className="italic text-[var(--lagoon)]">unlocked.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            No textbooks. No paywall. Just shortcuts that work, peers who actually
            answer, and a real-time scholarship feed from students who got in.
          </p>
          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link to="/auth" search={{ mode: "signup" }}>Join the community <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/impact">See our impact</Link>
            </Button>
          </div>
          <p className="mt-5 text-xs text-muted-foreground arrow-sketch">
            Takes 20 seconds. No card. No spam.
          </p>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[var(--lagoon)]/25 via-transparent to-[var(--ink)]/15 blur-2xl" />
          <div className="relative overflow-hidden rounded-3xl border border-border shadow-card">
            <video
              src="https://assets.mixkit.co/videos/preview/mixkit-young-woman-typing-on-a-laptop-29495-large.mp4"
              poster={heroImg}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Students studying together"
              className="block aspect-[3/2] w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[var(--ink)]/45 via-transparent to-[var(--lagoon)]/20" />
          </div>
          <div className="sticky-note absolute -bottom-6 -left-4 hidden max-w-[200px] rounded-md p-3 text-xs font-medium sm:block">
            "Got 1480 using just the Vault. Wild." — Amara, Lagos
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center sm:text-left">
      <div className="font-display text-4xl font-normal tracking-tight text-[var(--ink)] sm:text-5xl">
        {value.toLocaleString()}
        <span className="text-[var(--lagoon)]">+</span>
      </div>
      <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function StatsStrip() {
  const { data } = useLiveStats();
  return (
    <section className="border-y border-border bg-[var(--ink)] text-[var(--primary-foreground)]">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-10 sm:grid-cols-4 sm:px-6">
        {[
          { value: data?.students ?? 0, label: "Students on board" },
          { value: data?.posts ?? 0, label: "Questions asked" },
          { value: data?.resources ?? 0, label: "Cheat codes shared" },
          { value: data?.scholarships ?? 0, label: "Live scholarships" },
        ].map((s) => (
          <div key={s.label} className="text-center sm:text-left">
            <div className="font-display text-4xl font-normal tracking-tight sm:text-5xl">
              {s.value.toLocaleString()}
              <span className="text-[var(--foam)]">+</span>
            </div>
            <div className="mt-1 text-xs uppercase tracking-wider text-white/60">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FounderNote() {
  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[180px_1fr] lg:items-start">
        <div className="flex flex-col items-center lg:items-start">
          <div className="grid h-32 w-32 place-items-center rounded-full bg-gradient-to-br from-[var(--tide)] to-[var(--lagoon)] font-display text-5xl italic text-white shadow-elevated">
            A
          </div>
          <p className="mt-3 text-center font-display text-lg italic lg:text-left">Aime Pascal</p>
          <p className="text-xs text-muted-foreground">Founder · scored 1510 self-taught</p>
        </div>
        <div>
          <Quote className="h-7 w-7 text-[var(--lagoon)]" />
          <p className="mt-3 font-display text-2xl font-normal leading-snug text-foreground sm:text-3xl">
            I built SAT Hub because{" "}
            <span className="circle-sketch px-2">prep books</span>{" "}
            and $2,000 tutors weren't an option for me — or for most students I
            grew up with. Everything here is what I wish I'd had: short, free,
            and made by students who've sat the test.
          </p>
          <p className="mt-5 text-sm text-muted-foreground">
            If you find something missing, message me. I read every reply.
          </p>
        </div>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="border-b border-border bg-surface-elevated">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-[var(--lagoon)]">What's inside</p>
          <h2 className="mt-2 font-display text-4xl font-normal tracking-tight sm:text-5xl">
            Four tools. <span className="italic">No fluff.</span>
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:border-border-strong hover:shadow-elevated">
              <img src={f.image} alt={f.alt} loading="lazy" width={1024} height={768} className="h-40 w-full object-cover" />
              <div className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-[var(--tide)]">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-xl font-normal">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function LiveActivity() {
  const { data: items = [] } = useLiveActivity();
  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-[var(--lagoon)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--lagoon)] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--lagoon)]" />
              </span>
              Live activity
            </p>
            <h2 className="mt-2 font-display text-4xl font-normal tracking-tight sm:text-5xl">
              Right <span className="italic">now</span> on SAT Hub
            </h2>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            Refreshes every few seconds. This is real student activity, not a demo.
          </p>
        </div>

        <ul className="mt-10 grid gap-3 md:grid-cols-2">
          {items.length === 0 && (
            <li className="rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground md:col-span-2">
              Quiet for a moment. New posts appear here as students drop in.
            </li>
          )}
          {items.map((it, i) => (
            <li
              key={`${it.kind}-${i}`}
              className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-card transition hover:border-border-strong"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]">
                {it.kind === "post" ? <MessageSquare className="h-4 w-4" /> : it.kind === "scholarship" ? <Globe className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <p className="font-display text-lg leading-snug">{it.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {it.meta} · {timeAgo(it.at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Voices() {
  return (
    <section className="border-b border-border bg-surface-elevated">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <p className="text-sm font-medium uppercase tracking-wider text-[var(--lagoon)]">In their words</p>
        <h2 className="mt-2 max-w-2xl font-display text-4xl font-normal tracking-tight sm:text-5xl">
          Students, not influencers.
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {voices.map((v, i) => (
            <figure
              key={v.name}
              className="relative rounded-2xl border border-border bg-card p-6 shadow-card"
              style={{ transform: `rotate(${i % 2 === 0 ? -0.6 : 0.8}deg)` }}
            >
              <Quote className="h-5 w-5 text-[var(--lagoon)]" />
              <blockquote className="mt-3 font-display text-xl italic leading-snug">
                "{v.quote}"
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3 text-sm">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[var(--tide)] to-[var(--lagoon)] font-display text-lg italic text-white">
                  {v.name[0]}
                </div>
                <div>
                  <div className="font-medium text-foreground">{v.name}</div>
                  <div className="text-xs text-muted-foreground">{v.where}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="bg-[var(--ink)] text-[var(--primary-foreground)]">
      <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
        <h2 className="font-display text-4xl font-normal leading-tight tracking-tight sm:text-6xl">
          Stop studying like it's <span className="italic text-[var(--foam)]">2010.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-white/70">
          Thousands of students worldwide use shortcuts, not textbooks. Come build the unfair advantage.
        </p>
        <div className="mt-8">
          <Button size="lg" variant="secondary" asChild>
            <Link to="/auth" search={{ mode: "signup" }}>Create your free account <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

const features = [
  { icon: Zap, title: "Cheat Code Vault", desc: "Short SAT tricks, searchable by topic. Upvote what worked.", image: studyImg, alt: "Student writing notes with SAT prep material" },
  { icon: MessageSquare, title: "Peer Forum", desc: "Stuck on a question? Post a screenshot, get a breakdown.", image: communityImg, alt: "Group of students collaborating on laptops" },
  { icon: Globe, title: "Scholarship Pipeline", desc: "Filter US, UK, Australia opportunities by deadline & type.", image: scholarshipsImg, alt: "Graduation cap on a world globe with international flags" },
  { icon: TrendingUp, title: "Impact Dashboard", desc: "Live counters showing the community's real footprint.", image: studyImg, alt: "Charts showing community impact" },
];

const voices = [
  { name: "Amara", where: "Lagos · 1480", quote: "Got 1480 using just the Vault. The grammar shortcuts alone moved me 60 points." },
  { name: "Jonas", where: "Kigali · 1520", quote: "The forum is where it clicked. Someone broke down a question I'd stared at for an hour." },
  { name: "Leila", where: "Cairo · scholarship", quote: "Found a full ride in Australia through the scholarship feed. Wouldn't have looked otherwise." },
];
