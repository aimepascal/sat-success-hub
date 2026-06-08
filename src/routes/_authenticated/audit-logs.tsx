import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldAlert, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/audit-logs")({
  head: () => ({ meta: [{ title: "Audit Logs — Admin" }] }),
  component: AuditLogsPage,
});

type AuditLog = {
  id: string;
  created_at: string;
  actor_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: unknown;
  new_data: unknown;
};

const ACTIONS = ["ALL", "INSERT", "UPDATE", "DELETE"] as const;
const TABLES = ["ALL", "user_roles", "scholarships", "resources"] as const;

function AuditLogsPage() {
  const { user } = Route.useRouteContext();
  const { data: isAdmin, isLoading: checkingAdmin } = useIsAdmin(user.id);

  const [actor, setActor] = useState("");
  const [action, setAction] = useState<(typeof ACTIONS)[number]>("ALL");
  const [tableName, setTableName] = useState<(typeof TABLES)[number]>("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["audit-logs", { actor, action, tableName, from, to }],
    enabled: !!isAdmin,
    queryFn: async () => {
      let q = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (actor.trim()) q = q.eq("actor_id", actor.trim());
      if (action !== "ALL") q = q.eq("action", action);
      if (tableName !== "ALL") q = q.eq("table_name", tableName);
      if (from) q = q.gte("created_at", new Date(from).toISOString());
      if (to) q = q.lte("created_at", new Date(to + "T23:59:59").toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AuditLog[];
    },
  });

  const actorIds = useMemo(
    () => Array.from(new Set(logs.map((l) => l.actor_id).filter(Boolean))) as string[],
    [logs],
  );

  const { data: profiles = [] } = useQuery({
    queryKey: ["audit-profiles", actorIds],
    enabled: actorIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", actorIds);
      return data ?? [];
    },
  });
  const nameById = new Map(profiles.map((p) => [p.id, p.display_name]));

  if (checkingAdmin) {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-sm text-muted-foreground">Checking access…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Admin access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account does not have the admin role.
        </p>
      </div>
    );
  }

  const reset = () => {
    setActor("");
    setAction("ALL");
    setTableName("ALL");
    setFrom("");
    setTo("");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Audit Logs</h1>
          <p className="mt-2 text-muted-foreground">
            Security events for role changes, scholarship edits, and resource changes.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Actor ID">
          <Input value={actor} onChange={(e) => setActor(e.target.value)} placeholder="uuid" />
        </Field>
        <Field label="Action">
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as (typeof ACTIONS)[number])}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Table">
          <select
            value={tableName}
            onChange={(e) => setTableName(e.target.value as (typeof TABLES)[number])}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {TABLES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="From">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
          <Button variant="ghost" size="sm" onClick={reset}>Clear filters</Button>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Table</th>
              <th className="px-4 py-3">Record</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No events match these filters.</td></tr>
            ) : logs.map((l) => {
              const open = expanded === l.id;
              return (
                <Fragment key={l.id}>
                  <tr className="hover:bg-surface/50">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {l.actor_id ? (
                        <div>
                          <div className="font-medium">{nameById.get(l.actor_id) ?? "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">{l.actor_id.slice(0, 8)}…</div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">system</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        l.action === "DELETE" ? "bg-destructive/15 text-destructive" :
                        l.action === "INSERT" ? "bg-primary-soft text-primary" :
                        "bg-muted text-foreground"
                      }`}>{l.action}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{l.table_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {l.record_id ? `${l.record_id.slice(0, 8)}…` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setExpanded(open ? null : l.id)}>
                        {open ? "Hide" : "Details"}
                      </Button>
                    </td>
                  </tr>
                  {open && (
                    <tr className="bg-surface/40">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Before</div>
                            <pre className="max-h-64 overflow-auto rounded-md border border-border bg-background p-2 text-xs">
{l.old_data ? JSON.stringify(l.old_data, null, 2) : "—"}
                            </pre>
                          </div>
                          <div>
                            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">After</div>
                            <pre className="max-h-64 overflow-auto rounded-md border border-border bg-background p-2 text-xs">
{l.new_data ? JSON.stringify(l.new_data, null, 2) : "—"}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">Showing up to 500 most recent events.</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
