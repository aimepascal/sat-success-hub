import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, ShieldAlert, Sparkles, Send, Loader2 } from "lucide-react";
import type { Resource, Scholarship } from "@/lib/db-types";
import type { ContentType, ChatMessage, GeneratedDraft, ResourceDraft, ScholarshipDraft, ForumPostDraft } from "@/lib/admin-ai.functions";
import { generateContent, publishGeneratedContent } from "@/lib/admin-ai.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin Panel — SAT Hub" }] }),
  component: AdminPage,
});

type Tab = "resources" | "scholarships" | "users" | "ai";

function AdminPage() {
  const { user } = Route.useRouteContext();
  const { data: isAdmin, isLoading } = useIsAdmin(user.id);
  const [tab, setTab] = useState<Tab>("resources");

  if (isLoading) {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-sm text-muted-foreground">Checking access…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Admin access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account does not have the admin role. Ask the project owner to grant access.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Admin Panel</h1>
        <p className="mt-2 text-muted-foreground">Manage the Cheat Code Vault and Scholarship Pipeline.</p>
      </div>

      <div className="mt-8 flex gap-1 rounded-lg border border-border bg-surface p-1 w-fit flex-wrap">
        {(["resources", "scholarships", "users", "ai"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t === "resources" ? "Cheat Codes" : t === "scholarships" ? "Scholarships" : t === "users" ? "Users & Roles" : "AI Copilot"}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "resources" && <ResourcesAdmin authorId={user.id} />}
        {tab === "scholarships" && <ScholarshipsAdmin />}
        {tab === "users" && <UsersAudit />}
        {tab === "ai" && <AiCopilot authorId={user.id} />}
      </div>
    </div>
  );
}

/* -------------------- RESOURCES -------------------- */

const EMPTY_RESOURCE = {
  title: "",
  category: "",
  section: "Math",
  summary: "",
  content: "",
};

function ResourcesAdmin({ authorId }: { authorId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Resource> | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["admin-resources"],
    queryFn: async () => {
      const { data } = await supabase.from("resources").select("*").order("created_at", { ascending: false });
      return (data ?? []) as Resource[];
    },
  });

  const save = useMutation({
    mutationFn: async (r: Partial<Resource>) => {
      if (r.id) {
        const { error } = await supabase
          .from("resources")
          .update({ title: r.title, category: r.category, section: r.section, summary: r.summary, content: r.content })
          .eq("id", r.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("resources").insert({
          title: r.title!,
          category: r.category!,
          section: r.section!,
          summary: r.summary!,
          content: r.content!,
          author_id: authorId,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-resources"] });
      qc.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("resources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin-resources"] });
      qc.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} cheat codes</p>
        <Button size="sm" onClick={() => setEditing({ ...EMPTY_RESOURCE })}>
          <Plus className="mr-1 h-4 w-4" /> New cheat code
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Section</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium">{r.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.section}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.category}</td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => confirm(`Delete "${r.title}"?`) && remove.mutate(r.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? "Edit cheat code" : "New cheat code"}>
          <div className="space-y-3">
            <Field label="Title">
              <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Section">
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editing.section ?? "Math"}
                  onChange={(e) => setEditing({ ...editing, section: e.target.value })}
                >
                  <option>Math</option>
                  <option>Reading</option>
                  <option>Writing</option>
                </select>
              </Field>
              <Field label="Category">
                <Input value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} placeholder="Algebra, Grammar..." />
              </Field>
            </div>
            <Field label="Summary">
              <Textarea rows={2} value={editing.summary ?? ""} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} />
            </Field>
            <Field label="Content">
              <Textarea rows={8} value={editing.content ?? ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => save.mutate(editing)} disabled={save.isPending || !editing.title || !editing.category || !editing.summary || !editing.content}>
                Save
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* -------------------- SCHOLARSHIPS -------------------- */

const EMPTY_SCHOLARSHIP = {
  name: "",
  institution: "",
  country: "US",
  scholarship_type: "Merit",
  amount: "",
  deadline: new Date().toISOString().slice(0, 10),
  description: "",
  apply_url: "",
};

function ScholarshipsAdmin() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Scholarship> | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["admin-scholarships"],
    queryFn: async () => {
      const { data } = await supabase.from("scholarships").select("*").order("deadline", { ascending: true });
      return (data ?? []) as Scholarship[];
    },
  });

  const save = useMutation({
    mutationFn: async (s: Partial<Scholarship>) => {
      const payload = {
        name: s.name!,
        institution: s.institution!,
        country: s.country!,
        scholarship_type: s.scholarship_type!,
        amount: s.amount ?? null,
        deadline: s.deadline!,
        description: s.description!,
        apply_url: s.apply_url!,
      };
      if (s.id) {
        const { error } = await supabase.from("scholarships").update(payload).eq("id", s.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("scholarships").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-scholarships"] });
      qc.invalidateQueries({ queryKey: ["scholarships"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scholarships").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin-scholarships"] });
      qc.invalidateQueries({ queryKey: ["scholarships"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} scholarships</p>
        <Button size="sm" onClick={() => setEditing({ ...EMPTY_SCHOLARSHIP })}>
          <Plus className="mr-1 h-4 w-4" /> New scholarship
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Deadline</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.country}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.scholarship_type}</td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(s.deadline).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => confirm(`Delete "${s.name}"?`) && remove.mutate(s.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal onClose={() => setEditing(null)} title={editing.id ? "Edit scholarship" : "New scholarship"}>
          <div className="space-y-3">
            <Field label="Name">
              <Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label="Institution">
              <Input value={editing.institution ?? ""} onChange={(e) => setEditing({ ...editing, institution: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Country">
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editing.country ?? "US"}
                  onChange={(e) => setEditing({ ...editing, country: e.target.value })}
                >
                  <option>US</option>
                  <option>UK</option>
                  <option>Canada</option>
                  <option>Australia</option>
                </select>
              </Field>
              <Field label="Type">
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editing.scholarship_type ?? "Merit"}
                  onChange={(e) => setEditing({ ...editing, scholarship_type: e.target.value })}
                >
                  <option>Full Ride</option>
                  <option>Merit</option>
                  <option>Need-Based</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount">
                <Input value={editing.amount ?? ""} onChange={(e) => setEditing({ ...editing, amount: e.target.value })} placeholder="$50,000/yr" />
              </Field>
              <Field label="Deadline">
                <Input type="date" value={editing.deadline ?? ""} onChange={(e) => setEditing({ ...editing, deadline: e.target.value })} />
              </Field>
            </div>
            <Field label="Apply URL">
              <Input value={editing.apply_url ?? ""} onChange={(e) => setEditing({ ...editing, apply_url: e.target.value })} placeholder="https://..." />
            </Field>
            <Field label="Description">
              <Textarea rows={4} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button
                onClick={() => save.mutate(editing)}
                disabled={save.isPending || !editing.name || !editing.institution || !editing.deadline || !editing.description || !editing.apply_url}
              >
                Save
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* -------------------- AI COPILOT -------------------- */

const PLACEHOLDERS: Record<ContentType, string> = {
  resource: "e.g., A quick trick for solving systems of linear equations without full algebra",
  scholarship: "e.g., Full-ride scholarship for African students applying to US universities, deadline December 1",
  forum_post: "e.g., How do I stop running out of time on the Reading section?",
};

function AiCopilot({ authorId }: { authorId: string }) {
  const qc = useQueryClient();
  const generate = useServerFn(generateContent);
  const publish = useServerFn(publishGeneratedContent);

  const [type, setType] = useState<ContentType>("resource");
  const [prompt, setPrompt] = useState("");
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState<GeneratedDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [refine, setRefine] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const userMsg: ChatMessage = { role: "user", content: prompt.trim() };
      const res = await generate({ data: { type, prompt: prompt.trim(), history } });
      setHistory([...history, userMsg, res.assistantMessage]);
      setDraft(res.draft);
      setPrompt("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!refine.trim()) return;
    setLoading(true);
    try {
      const userMsg: ChatMessage = { role: "user", content: refine.trim() };
      const res = await generate({ data: { type, prompt: refine.trim(), history } });
      setHistory([...history, userMsg, res.assistantMessage]);
      setDraft(res.draft);
      setRefine("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refinement failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!draft) return;
    try {
      await publish({ data: { type, draft } });
      toast.success("Published");
      qc.invalidateQueries({ queryKey: ["admin-resources"] });
      qc.invalidateQueries({ queryKey: ["admin-scholarships"] });
      qc.invalidateQueries({ queryKey: ["resources"] });
      qc.invalidateQueries({ queryKey: ["scholarships"] });
      qc.invalidateQueries({ queryKey: ["forum-posts"] });
      setDraft(null);
      setHistory([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> AI Copilot
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Generate a draft, refine it by chatting, then publish.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["resource", "scholarship", "forum_post"] as ContentType[]).map((t) => (
            <button
              key={t}
              onClick={() => { setType(t); setDraft(null); setHistory([]); setPrompt(""); setRefine(""); }}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${type === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              {t === "forum_post" ? "Forum post" : t}
            </button>
          ))}
        </div>

        <Textarea
          placeholder={PLACEHOLDERS[type]}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
        />
        <Button onClick={handleGenerate} disabled={loading || !prompt.trim()}>
          {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
          Generate
        </Button>

        {history.length > 0 && (
          <div className="mt-4 space-y-3 rounded-xl bg-surface p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Conversation</h3>
            {history.map((m, i) => (
              <div key={i} className="text-sm">
                <span className="text-xs uppercase text-primary">{m.role === "user" ? "You" : "AI"}</span>
                <p className={`mt-0.5 ${m.role === "user" ? "font-medium" : "text-muted-foreground"}`}>
                  {m.role === "assistant" ? "Generated a new draft" : m.content}
                </p>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Input
                placeholder="Ask to refine: make it shorter, add an example..."
                value={refine}
                onChange={(e) => setRefine(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleRefine(); } }}
              />
              <Button size="icon" onClick={handleRefine} disabled={loading || !refine.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Draft preview</h3>
          {draft && (
            <Button size="sm" onClick={handlePublish}>
              Publish
            </Button>
          )}
        </div>
        {draft ? (
          <div className="mt-4 space-y-4">
            {type === "resource" && <ResourcePreview draft={draft as ResourceDraft} />}
            {type === "scholarship" && <ScholarshipPreview draft={draft as ScholarshipDraft} />}
            {type === "forum_post" && <ForumPostPreview draft={draft as ForumPostDraft} />}
          </div>
        ) : (
          <p className="mt-8 text-center text-sm text-muted-foreground">Generate a draft to see the preview here.</p>
        )}
      </section>
    </div>
  );
}

function ResourcePreview({ draft }: { draft: ResourceDraft }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">{draft.section}</span>
        <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">{draft.category}</span>
      </div>
      <h4 className="font-display text-xl font-semibold">{draft.title}</h4>
      <p className="text-sm text-muted-foreground">{draft.summary}</p>
      <div className="prose prose-sm max-w-none text-sm text-foreground">
        {draft.content.split("\n").map((p, i) => p ? <p key={i}>{p}</p> : <br key={i} />)}
      </div>
    </div>
  );
}

function ScholarshipPreview({ draft }: { draft: ScholarshipDraft }) {
  return (
    <div className="space-y-3">
      <h4 className="font-display text-xl font-semibold">{draft.name}</h4>
      <div className="grid gap-2 text-sm">
        <div><span className="text-muted-foreground">Institution:</span> {draft.institution}</div>
        <div><span className="text-muted-foreground">Country:</span> {draft.country}</div>
        <div><span className="text-muted-foreground">Type:</span> {draft.scholarship_type}</div>
        <div><span className="text-muted-foreground">Amount:</span> {draft.amount ?? "Not specified"}</div>
        <div><span className="text-muted-foreground">Deadline:</span> {draft.deadline}</div>
      </div>
      <p className="text-sm text-muted-foreground">{draft.description}</p>
      <a href={draft.apply_url} target="_blank" rel="noreferrer" className="inline-block text-sm font-medium text-primary hover:underline">{draft.apply_url}</a>
    </div>
  );
}

function ForumPostPreview({ draft }: { draft: ForumPostDraft }) {
  return (
    <div className="space-y-3">
      <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">{draft.topic}</span>
      <h4 className="font-display text-xl font-semibold">{draft.title}</h4>
      <p className="whitespace-pre-line text-sm text-muted-foreground">{draft.body}</p>
    </div>
  );
}

/* -------------------- USERS AUDIT -------------------- */

function UsersAudit() {
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, created_at")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id, role");
      return data ?? [];
    },
  });

  const rolesByUser = new Map<string, string[]>();
  for (const r of roles) {
    const list = rolesByUser.get(r.user_id) ?? [];
    list.push(r.role);
    rolesByUser.set(r.user_id, list);
  }

  const admins = profiles.filter((p) => rolesByUser.get(p.id)?.includes("admin")).length;

  return (
    <div>
      <div className="mb-4 flex items-center gap-6 text-sm text-muted-foreground">
        <span><strong className="text-foreground">{profiles.length}</strong> users</span>
        <span><strong className="text-foreground">{admins}</strong> admin{admins === 1 ? "" : "s"}</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Roles</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {profiles.map((p) => {
              const userRoles = rolesByUser.get(p.id) ?? [];
              return (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-medium text-primary">
                          {p.display_name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{p.display_name ?? "Unnamed"}</div>
                        <div className="text-xs text-muted-foreground">{p.id.slice(0, 8)}…</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {userRoles.length === 0 ? (
                      <span className="text-xs text-muted-foreground">student</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {userRoles.map((r) => (
                          <span
                            key={r}
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              r === "admin"
                                ? "bg-primary text-primary-foreground"
                                : "bg-primary-soft text-primary"
                            }`}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Read-only audit. To grant or revoke admin access, ask in chat.
      </p>
    </div>
  );
}

/* -------------------- SHARED -------------------- */

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-card p-6 shadow-elevated sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
        </div>
        {children}
      </div>
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
