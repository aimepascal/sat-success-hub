import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Calendar, ExternalLink, MapPin, Search } from "lucide-react";
import type { Scholarship } from "@/lib/db-types";

export const Route = createFileRoute("/_authenticated/scholarships")({
  head: () => ({
    meta: [
      { title: "Scholarship Pipeline — SAT Hub" },
      { name: "description", content: "Filter live international scholarship opportunities across the US, UK, and Australia by deadline, country, and award type." },
    ],
    links: [{ rel: "canonical", href: "https://sat-success-hub.lovable.app/scholarships" }],
  }),
  component: ScholarshipsPage,
});

const COUNTRIES = ["All", "US", "UK", "Australia", "Canada"];
const TYPES = ["All", "Full Ride", "Merit", "Need-Based"];

function ScholarshipsPage() {
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("All");
  const [type, setType] = useState("All");

  const { data: items = [] } = useQuery({
    queryKey: ["scholarships"],
    queryFn: async () => {
      const { data } = await supabase.from("scholarships").select("*").order("deadline", { ascending: true });
      return (data ?? []) as Scholarship[];
    },
  });

  const filtered = useMemo(() => items.filter((s) =>
    (country === "All" || s.country === country)
    && (type === "All" || s.scholarship_type === type)
    && (!q || (s.name + s.institution + s.description).toLowerCase().includes(q.toLowerCase()))
  ), [items, country, type, q]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Scholarship Pipeline</h1>
        <p className="mt-2 text-muted-foreground">International university opportunities. Filter by country, type, and deadline.</p>
      </div>

      <div className="mt-8 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search scholarships..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-3">
          <FilterGroup label="Country" options={COUNTRIES} value={country} onChange={setCountry} />
          <FilterGroup label="Type" options={TYPES} value={type} onChange={setType} />
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => (
          <article key={s.id} className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex items-start justify-between">
              <span className="inline-flex items-center rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">{s.scholarship_type}</span>
              <span className="text-xs text-muted-foreground">{s.amount}</span>
            </div>
            <h3 className="mt-3 font-display text-base font-semibold leading-snug">{s.name}</h3>
            <p className="mt-1 text-sm font-medium text-muted-foreground">{s.institution}</p>
            <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{s.description}</p>
            <div className="mt-4 flex items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {s.country}</span>
              <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(s.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
            <a href={s.apply_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              Apply <ExternalLink className="h-3 w-3" />
            </a>
          </article>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No scholarships match these filters.
          </div>
        )}
      </div>
    </div>
  );
}

function FilterGroup({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
        {options.map((o) => (
          <button key={o} onClick={() => onChange(o)} className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${value === o ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{o}</button>
        ))}
      </div>
    </div>
  );
}
