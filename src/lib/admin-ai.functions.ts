import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { streamText, Output, NoObjectGeneratedError } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
} from "@/lib/ai-gateway.server";

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

const resourceSchema = z.object({
  title: z.string(),
  category: z.string(),
  section: z.enum(["Math", "Reading", "Writing"]),
  summary: z.string(),
  content: z.string(),
});

const scholarshipSchema = z.object({
  name: z.string(),
  institution: z.string(),
  country: z.string(),
  scholarship_type: z.string(),
  amount: z.string().nullable(),
  deadline: z.string(),
  description: z.string(),
  apply_url: z.string(),
});

const forumPostSchema = z.object({
  title: z.string(),
  body: z.string(),
  topic: z.enum(["General", "Math", "Reading", "Writing", "Scholarships", "Strategy"]),
});

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

    const request = getRequest();
    const initialRunId = getLovableAiGatewayRunId(request);
    const runIdFetch = createLovableAiGatewayRunIdFetch(initialRunId);

    const lovable = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: {
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
      fetch: runIdFetch.fetch,
    });

    const messages = [
      { role: "system" as const, content: buildSystemPrompt(data.type) },
      ...data.history,
      { role: "user" as const, content: data.prompt },
    ];

    const schema = getZodSchema(data.type);
    const result = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      messages,
      output: Output.object({ schema }),
      providerOptions: {
        openai: {
          store: false,
        },
      },
    });

    let output: unknown;
    try {
      output = await result.output;
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        const text = error.text;
        try {
          output = JSON.parse(text);
        } catch {
          throw new Error("AI returned invalid JSON: " + text.slice(0, 200));
        }
      } else {
        throw error;
      }
    }

    const draft = parseDraft(data.type, output as Record<string, unknown>);

    return {
      draft,
      assistantMessage: { role: "assistant" as const, content: JSON.stringify(output) },
      runId: runIdFetch.getRunId(),
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

function getZodSchema(type: ContentType) {
  switch (type) {
    case "resource":
      return resourceSchema;
    case "scholarship":
      return scholarshipSchema;
    case "forum_post":
      return forumPostSchema;
  }
}

function parseDraft(type: ContentType, raw: Record<string, unknown>): GeneratedDraft {
  switch (type) {
    case "resource":
      return resourceSchema.parse(raw);
    case "scholarship":
      return scholarshipSchema.parse(raw);
    case "forum_post":
      return forumPostSchema.parse(raw);
  }
}

function buildSystemPrompt(type: ContentType): string {
  switch (type) {
    case "resource":
      return "You are an expert SAT tutor drafting a cheat code for the SAT Hub. Given a topic, produce a concise, student-friendly SAT shortcut. The content should be practical, include a clear strategy, and use markdown formatting where helpful.";
    case "scholarship":
      return "You are a scholarship research assistant. Given details about a scholarship opportunity, produce a structured entry. The deadline must be in YYYY-MM-DD format. The apply_url must be a valid URL.";
    case "forum_post":
      return "You are a student mentor drafting a forum post for the SAT Hub peer forum. Given a question or topic, produce a clear, helpful post that other students can learn from.";
  }
}
