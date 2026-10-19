import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Calculator, PenLine, Lightbulb, CheckCircle2, MessageSquare, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Imboni SAT Success Hub — Learn every SAT skill simply" },
      { name: "description", content: "One simple lesson for every skill on the digital SAT, plus cheat codes, taught by SAT instructor Aime Pascal in Kigali." },
      { property: "og:title", content: "Imboni SAT Success Hub — SAT Cheat Codes & Peer Community" },
      { property: "og:description", content: "Ultra-simplified SAT shortcuts and peer-to-peer breakdowns in one place." },
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
              name: "Imboni SAT Success Hub",
              url: "https://sat-success-hub.lovable.app/",
              description: "Simplified SAT prep and a peer community for students.",
            },
            {
              "@type": "WebSite",
              "@id": "https://sat-success-hub.lovable.app/#website",
              url: "https://sat-success-hub.lovable.app/",
              name: "Imboni SAT Success Hub",
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

function useCounts() {
  return useQuery({
    queryKey: ["home-counts"],
    queryFn: async () => {
      const [all, lessons] = await Promise.all([
        supabase.from("resources").select("id", { count: "exact", head: true }),
        supabase.from("resources").select("id", { count: "exact", head: true }).ilike("content", "WHAT IT TESTS%"),
      ]);
      const total = all.count ?? 0;
      const l = lessons.count ?? 0;
      return { lessons: l, cheatCodes: Math.max(total - l, 0) };
    },
  });
}

const DOMAIN_TILES = [
  { name: "Algebra", note: "Lines, equations, systems", icon: Calculator, tone: "bg-blue-50 text-blue-700 border-blue-100" },
  { name: "Advanced Math", note: "Curves and expressions", icon: Calculator, tone: "bg-blue-50 text-blue-700 border-blue-100" },
  { name: "Problem-Solving and Data Analysis", note: "Percents, rates, statistics", icon: Calculator, tone: "bg-blue-50 text-blue-700 border-blue-100" },
  { name: "Geometry and Trigonometry", note: "Shapes, circles, triangles", icon: Calculator, tone: "bg-blue-50 text-blue-700 border-blue-100" },
  { name: "Information and Ideas", note: "Main idea, inference, evidence", icon: BookOpen, tone: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  { name: "Craft and Structure", note: "Words, structure, two texts", icon: BookOpen, tone: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  { name: "Expression of Ideas", note: "Synthesis and transitions", icon: PenLine, tone: "bg-amber-50 text-amber-700 border-amber-100" },
  { name: "Standard English Conventions", note: "Grammar and punctuation", icon: PenLine, tone: "bg-amber-50 text-amber-700 border-amber-100" },
];

function Landing() {
  return (
    <div>
      <Hero />
      <StatsStrip />
      <HowItWorks />
      <Domains />
      <AboutAime />
      <Community />
      <CTA />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#eef2ff] to-background">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground shadow-card">
            Taught by Aime Pascal, SAT instructor in Kigali
          </p>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Every SAT skill, in <span className="text-primary">one simple lesson.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Learn the code behind each question type, try it yourself, then practice on real College Board questions. Free for students.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              {/* /learn is a static page in public/learn, not a router route. */}
              <a href="/learn">Start learning <ArrowRight className="ml-1.5 h-4 w-4" /></a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/auth" search={{ mode: "signup" }}>Create a free account</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">No payment. Your progress is saved on your device.</p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-elevated">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">Start here</p>
          <ol className="mt-4 space-y-4">
            {[
              { t: "Pick a skill", d: "Choose Math, Reading or Writing, then a skill you find hard." },
              { t: "Learn the code", d: "Read the short lesson: what it tests, the trick, a worked example." },
              { t: "Try it yourself", d: "Answer the question, then check the answer." },
              { t: "Practice for real", d: "Open real questions on that skill in the College Board bank." },
            ].map((x, i) => (
              <li key={x.t} className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{i + 1}</span>
                <div>
                  <p className="font-display font-bold">{x.t}</p>
                  <p className="text-sm text-muted-foreground">{x.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function StatsStrip() {
  const { data } = useCounts();
  const items = [
    { value: "29", label: "SAT skills covered" },
    { value: "8", label: "Official SAT domains" },
    { value: String(data?.lessons ?? 29), label: "Skill lessons" },
    { value: String(data?.cheatCodes ?? 0), label: "Cheat codes" },
  ];
  return (
    <section className="bg-[#16235a] text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:grid-cols-4 sm:px-6">
        {items.map((s) => (
          <div key={s.label} className="text-center sm:text-left">
            <div className="font-display text-4xl font-extrabold tracking-tight">{s.value}</div>
            <div className="mt-1 text-xs uppercase tracking-wider text-white/65">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const cards = [
    { icon: Lightbulb, title: "Lessons that start with the code", desc: "Each skill opens with the one idea that unlocks it, then shows exactly how to use it." },
    { icon: CheckCircle2, title: "Track what you finish", desc: "Tick off each lesson and watch your progress bar fill, so you always know what is next." },
    { icon: Printer, title: "Cheat codes you can print", desc: "Desmos moves, backsolving, and the traps to avoid, on one page you can keep at your desk." },
  ];
  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="max-w-2xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Simple on purpose</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {cards.map((c) => (
            <div key={c.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary"><c.icon className="h-5 w-5" /></div>
              <h3 className="mt-4 font-display text-lg font-bold">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Domains() {
  return (
    <section className="border-b border-border bg-surface-elevated">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">The whole SAT, organized</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">The same eight domains College Board uses, so what you learn here matches what you will see on test day.</p>
          </div>
          <Button variant="outline" asChild><Link to="/vault">Open the Vault <ArrowRight className="ml-1.5 h-4 w-4" /></Link></Button>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DOMAIN_TILES.map((d) => (
            <Link key={d.name} to="/vault" className={`rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-elevated ${d.tone}`}>
              <d.icon className="h-5 w-5" />
              <p className="mt-3 font-display text-base font-bold leading-snug text-foreground">{d.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{d.note}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutAime() {
  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-[200px_1fr] md:items-center">
        <div className="mx-auto md:mx-0">
          <div className="relative h-44 w-44 overflow-hidden rounded-3xl bg-gradient-to-br from-[#2f4fd8] to-[#3b6cf4] shadow-elevated">
            <span className="absolute inset-0 grid place-items-center font-display text-6xl font-extrabold text-white">AP</span>
            <img
              src="/aime.jpg"
              alt="Aime Pascal, SAT instructor"
              className="relative h-full w-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-primary">Your instructor</p>
          <h2 className="mt-1 font-display text-3xl font-extrabold tracking-tight">Aime Pascal</h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            SAT instructor at Excella School in Kigali, Rwanda. Aime scored 1540 on the SAT and has taught SAT students since. Imboni SAT Success Hub is where he puts what works for his students, in plain language, for free.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">Missing a topic or found a mistake? Tell him in the forum.</p>
        </div>
      </div>
    </section>
  );
}

function Community() {
  return (
    <section className="border-b border-border bg-surface-elevated">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><MessageSquare className="h-5 w-5" /></div>
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight">Stuck on a question?</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">Ask in the forum. Post the question and what you tried, and get a breakdown.</p>
          </div>
        </div>
        <Button variant="outline" asChild><Link to="/forum">Go to the forum</Link></Button>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="bg-[#16235a] text-white">
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">Pick one skill and start today.</h2>
        <p className="mx-auto mt-4 max-w-xl text-white/75">One lesson, one question, one tick. Small steps add up before test day.</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" variant="secondary" asChild>
            <Link to="/vault">Open the Vault <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
          </Button>
          <Button size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10" asChild>
            <Link to="/auth" search={{ mode: "signup" }}>Create an account</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
