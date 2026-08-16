# Admin AI Copilot

## Goal
Add an admin-only "AI Copilot" tab where admins can generate public SAT Hub content (cheat codes, scholarships, or forum posts) from a prompt, refine the draft by chatting with AI, and publish it directly to the site.

## What we will build

### 1. Backend: AI generation server function
- New `src/lib/admin-ai.functions.ts` with a `generateContent` server function.
- Protected by `requireSupabaseAuth` and an in-handler admin role check.
- Calls the Lovable AI Gateway chat endpoint with `openai/gpt-5.6-sol`.
- Uses a strict JSON schema prompt so the model returns structured fields matching the target table (`resources`, `scholarships`, or `forum_posts`).
- Maintains conversation context so admins can ask follow-up questions like "make it shorter" or "add a practice example."

### 2. Backend: Publish server function
- New `publishGeneratedContent` server function in the same module.
- Accepts the final draft, target type, and admin user ID.
- Inserts into the existing `resources`, `scholarships`, or `forum_posts` table.
- Existing admin RLS policies and audit triggers already cover these writes.

### 3. Frontend: AI Copilot tab
- Add an `"ai"` tab to the existing Admin Panel (`src/routes/_authenticated/admin.tsx`).
- UI components:
  - Content type selector (Cheat Code / Scholarship / Forum Post).
  - Prompt textarea with examples per type.
  - "Generate" button.
  - Chat/refine panel showing the conversation and a follow-up input.
  - Live preview of the draft JSON.
  - "Publish" button that saves the draft and invalidates the relevant query caches.

## Technical details

### AI call
- Endpoint: `https://ai.gateway.lovable.dev/v1/chat/completions`
- Auth: `Lovable-API-Key` header from `process.env['LOVABLE_API_KEY']`
- Model: `openai/gpt-5.6-sol`
- Response format: JSON mode with a strict schema per content type.
- No new npm dependencies required; call uses native `fetch`.

### Security
- Server function checks `has_role(auth.uid(), 'admin')` before calling the gateway or writing to tables.
- All inserts flow through existing RLS admin policies and `log_audit_event` triggers.
- No client-side access to `LOVABLE_API_KEY`.

### Data flow
```text
Admin selects type → types prompt → generateContent() → AI returns structured draft
  → Admin reviews / chats to refine → publishGeneratedContent() → INSERT into table
  → Audit log captured automatically → Query caches invalidated
```

## Out of scope for this plan
- Student-facing AI features or private notes.
- Changing the published site's public browsing behavior.
- New database tables or schema changes.
