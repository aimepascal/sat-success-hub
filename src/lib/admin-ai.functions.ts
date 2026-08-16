import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const contentTypeSchema = z.union([
  z.literal("resource"),
  z.literal("scholarship"),
  z.literal("forum_post"),
]);

const chatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

const generateInputSchema = z.object({
  type: contentTypeSchema,
  prompt: z.string().min(1),
  history: z.array(chatMessageSchema).default([]),
});

const publishInputSchema = z.object({
  type: contentTypeSchema,
  draft: z.record(z.unknown()),
});

export type ContentType = z.infer<typeof contentTypeSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export type ResourceDraft = {
  title: string;
  category: string;
  section: string;
  summary: string;
  content: string;
};

export type ScholarshipDraft = {
  name: string;
  institution: string;
  country: string;
  scholarship_type: string;
  amount: string | null;
  deadline: string;
  description: string;
  apply_url: string;
};

export type ForumPostDraft = {
  title: string;
  body: string;
  topic: string;
};

export type GeneratedDraft = ResourceDraft | ScholarshipDraft | ForumPostDraft;

export const generateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => generateInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      throw new Error("Forbidden: admin access required");
    }

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      throw new Error("AI gateway key is not configured");
    }

    const systemPrompt = buildSystemPrompt(data.type);
    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...data.history,
      { role: "user" as const, content: data.prompt },
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        messages,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: `${data.type}_draft`,
            strict: true,
            schema: getJsonSchema(data.type),
          },
        },
        stream: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AI gateway error: ${res.status} ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: [{ message?: { content?: string } }];
    };
    const runId = res.headers.get("X-Lovable-AIG-Run-ID");
    const assistantContent = json.choices?.[0]?.message?.content;
    if (!assistantContent) {
      throw new Error("AI returned empty content");
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(assistantContent) as Record<string, unknown>;
    } catch {
      throw new Error("AI returned invalid JSON");
    }

    const draft = parseDraft(data.type, parsed);

    return {
      draft,
      assistantMessage: { role: "assistant" as const, content: assistantContent },
      runId,
    };
  });

export const publishGeneratedContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => publishInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      throw new Error("Forbidden: admin access required");
    }

    const { type, draft: raw } = data;
    const draft = parseDraft(type, raw);

    if (type === "resource") {
      const d = draft as ResourceDraft;
      const { error } = await context.supabase.from("resources").insert({
        title: d.title,
        category: d.category,
        section: d.section,
        summary: d.summary,
        content: d.content,
        author_id: context.userId,
      });
      if (error) throw error;
    } else if (type === "scholarship") {
      const d = draft as ScholarshipDraft;
      const { error } = await context.supabase.from("scholarships").insert({
        name: d.name,
        institution: d.institution,
        country: d.country,
        scholarship_type: d.scholarship_type,
        amount: d.amount,
        deadline: d.deadline,
        description: d.description,
        apply_url: d.apply_url,
      });
      if (error) throw error;
    } else if (type === "forum_post") {
      const d = draft as ForumPostDraft;
      const { error } = await context.supabase.from("forum_posts").insert({
        user_id: context.userId,
        title: d.title,
        body: d.body,
        topic: d.topic,
      });
      if (error) throw error;
    }

    return { ok: true };
  });

function parseDraft(type: ContentType, raw: Record<string, unknown>): GeneratedDraft {
  switch (type) {
    case "resource":
      return {
        title: getString(raw, "title"),
        category: getString(raw, "category"),
        section: getString(raw, "section"),
        summary: getString(raw, "summary"),
        content: getString(raw, "content"),
      };
    case "scholarship":
      return {
        name: getString(raw, "name"),
        institution: getString(raw, "institution"),
        country: getString(raw, "country"),
        scholarship_type: getString(raw, "scholarship_type"),
        amount: raw.amount === null ? null : getString(raw, "amount"),
        deadline: getString(raw, "deadline"),
        description: getString(raw, "description"),
        apply_url: getString(raw, "apply_url"),
      };
    case "forum_post":
      return {
        title: getString(raw, "title"),
        body: getString(raw, "body"),
        topic: getString(raw, "topic"),
      };
  }
}

function getString(raw: Record<string, unknown>, key: string): string {
  const value = raw[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Generated draft is missing required field: ${key}`);
  }
  return value;
}

function buildSystemPrompt(type: ContentType): string {
  const base = "Return ONLY valid JSON matching the provided schema. Do not include markdown code fences or explanatory text outside the JSON.";
  switch (type) {
    case "resource":
      return `${base} You are an expert SAT tutor drafting a cheat code for the SAT Hub. Given a topic, produce a concise, student-friendly SAT shortcut. The content should be practical, include a clear strategy, and use markdown formatting where helpful. section must be one of: Math, Reading, Writing.`;
    case "scholarship":
      return `${base} You are a scholarship research assistant. Given details about a scholarship opportunity, produce a structured entry. The deadline must be in YYYY-MM-DD format. The apply_url must be a valid URL. If the amount is unknown, set it to null.`;
    case "forum_post":
      return `${base} You are a student mentor drafting a forum post for the SAT Hub peer forum. Given a question or topic, produce a clear, helpful post that other students can learn from. topic must be one of: General, Math, Reading, Writing, Scholarships, Strategy.`;
  }
}

function getJsonSchema(type: ContentType): Record<string, unknown> {
  switch (type) {
    case "resource":
      return {
        type: "object",
        properties: {
          title: { type: "string" },
          category: { type: "string" },
          section: { type: "string", enum: ["Math", "Reading", "Writing"] },
          summary: { type: "string" },
          content: { type: "string" },
        },
        required: ["title", "category", "section", "summary", "content"],
        additionalProperties: false,
      };
    case "scholarship":
      return {
        type: "object",
        properties: {
          name: { type: "string" },
          institution: { type: "string" },
          country: { type: "string" },
          scholarship_type: { type: "string" },
          amount: { type: ["string", "null"] },
          deadline: { type: "string" },
          description: { type: "string" },
          apply_url: { type: "string" },
        },
        required: ["name", "institution", "country", "scholarship_type", "amount", "deadline", "description", "apply_url"],
        additionalProperties: false,
      };
    case "forum_post":
      return {
        type: "object",
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          topic: { type: "string", enum: ["General", "Math", "Reading", "Writing", "Scholarships", "Strategy"] },
        },
        required: ["title", "body", "topic"],
        additionalProperties: false,
      };
  }
}
