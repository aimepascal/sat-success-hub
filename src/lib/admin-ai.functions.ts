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

    return {
      draft: parsed,
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

    const { type, draft } = data;

    if (type === "resource") {
      const resource = draft as Record<string, string>;
      const { error } = await context.supabase.from("resources").insert({
        title: resource.title,
        category: resource.category,
        section: resource.section,
        summary: resource.summary,
        content: resource.content,
        author_id: context.userId,
      });
      if (error) throw error;
    } else if (type === "scholarship") {
      const scholarship = draft as Record<string, string | null>;
      const { error } = await context.supabase.from("scholarships").insert({
        name: scholarship.name,
        institution: scholarship.institution,
        country: scholarship.country,
        scholarship_type: scholarship.scholarship_type,
        amount: scholarship.amount ?? null,
        deadline: scholarship.deadline,
        description: scholarship.description,
        apply_url: scholarship.apply_url,
      });
      if (error) throw error;
    } else if (type === "forum_post") {
      const post = draft as Record<string, string>;
      const { error } = await context.supabase.from("forum_posts").insert({
        user_id: context.userId,
        title: post.title,
        body: post.body,
        topic: post.topic,
      });
      if (error) throw error;
    }

    return { ok: true };
  });

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
