# AGENTS.md

## General Guidelines

Use `specflow` if the coding task is major and complex. Do not use `specflow` for minor fixes or refactorings. Within that workflow, use the appropriate skills for the specifics. Iterate with the user after every step; never complete the whole workflow yourself.

Start with the relevant documentation lane:

- `docs/PRODUCT_BRIEF.md` for the current strategic source of truth and product wedge.
- `docs/PRD.md` for product requirements, user-facing scope, and business framing.
- `docs/MARKET_POSITIONING.md` for competitor pressure, differentiation, and strategic validation.
- `docs/ROADMAP.md` for current priorities, sequencing, and deferred ideas.
- `flow/specs/*` for durable product and system requirements. Start here when exploring behavior for a problem.
- `flow/changes/*` for active proposals, delta specs, and implementation plans.
- `TODO.md` only for rough inbox notes that have not yet been promoted.


## Product North Star

Keep this product context in sight for every feature:

AI Project Advisor keeps a living project brief updated from meetings, emails, notes, and files, with human approval. It helps PM-like consultants, engagement managers, delivery leads, and project coordinators preserve trusted project memory across messy multi-stakeholder work.

The product should stay vertical. If it becomes a generic AI workspace, users will default back to ChatGPT, Notion AI, ClickUp Brain, or their existing tools. Its advantage comes from controlled project memory formation: messy evidence becomes official, reviewable project understanding.

The experience should feel like:

- a calm living project brief
- an AI project advisor / project management partner
- a living wiki plus source library
- a workspace that can help create useful deliverables

It should not feel like:

- a developer tool
- a generic chatbot with uploads
- a raw document repository with an AI wrapper
- a task manager or ClickUp/Notion clone
- a filesystem users have to manage manually

For fuller strategy and sequencing, use `docs/PRODUCT_BRIEF.md` first, then `docs/PRD.md` and `docs/ROADMAP.md`.

### Core Product Principles

- Stay vertical: optimize for consulting and implementation teams managing many projects, not broad consumer or generic knowledge-work use cases.
- Hide technical complexity by default. Users should see projects, chat, knowledge, inputs, outputs, and history, not prompts, chunks, or agent plumbing.
- Preserve trust through source grounding, citations, activity history, reviewable changes, and clear authorship.
- Keep raw inputs and synthesized knowledge conceptually separate: source materials are evidence; durable project memory is the evolving interpretation of that evidence.
- Prefer useful artifacts over chat-only answers. The system should help produce decisions, action items, meeting recaps, handover notes, status updates, reports, and eventually office-style documents.
- Give the user control over durable memory. The assistant can suggest and draft, but the product should make it clear what becomes persistent.
- Build for messy real project delivery work: meetings, emails, docs, decks, notes, unclear ownership, repeated decisions, onboarding, handovers, and client-facing outputs.
- Design for collaboration from the beginning: shared understanding, safe edits, ownership, and transparent change history matter more than solo productivity tricks.
- Keep the user-facing experience calm and familiar, even if the underlying system is agentic and powerful.

### Future Direction To Keep In Mind

Plugins and integrations are strategically important. The product should eventually support ChatGPT-like connectors for workplace systems such as Outlook, Teams, calendar, SharePoint/cloud drives, meeting tools, and task systems, so the agent can understand and act across the user's real work context.

Design choices should leave room for:
- Word-like document drafting and editing
- PowerPoint-style structured presentation generation
- Excel/spreadsheet ingestion and analysis
- Outlook/email and calendar connectors
- Teams/chat connectors
- meeting transcript and notes workflows
- reusable templates for reports, handovers, status updates, and client-facing deliverables
- modular skills/plugins without making the MVP feel over-engineered


## Coding guidelines

### 1. Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs.
Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

Minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

Touch only what you must. Clean up only your own mess.
When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

Define success criteria. Loop until verified.
Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

# Project Stack

- This repo uses `Next.js 16` App Router, `React 19`, `TypeScript`, and server/client component boundaries.
- UI is built with `shadcn/ui` source components configured via `components.json` as `radix-nova`.
- Styling uses `Tailwind CSS v4`, `tw-animate-css`, semantic CSS variables in `src/app/globals.css`, and the `cn()` helper from `@/lib/utils`.
- Icons come from `lucide-react`.

# Design Stack

- The visual language is Executive Slate: cool neutral surfaces, muted navy/steel-blue accent, flat cards, and restrained shadows.
- The typography stack is `Inter` for body and headings plus `JetBrains Mono` for code and metadata.
- Prefer semantic tokens like `bg-card`, `text-muted-foreground`, `border-border`, and `bg-background` over raw color utilities.
- Prefer extending existing shadcn components before inventing custom UI wrappers.

# UI Conventions

- Edit `src/app/globals.css` when changing theme tokens; do not create a second theme file.
- Use `gap-*` for spacing and `cn()` for conditional classes.
- Follow shadcn composition patterns such as `CardHeader` plus `CardContent`, accessible dialog titles, and token-driven variants.

```tsx
// Good
<Card className={cn("border-border bg-card text-card-foreground")} />

// Avoid
<div className="rounded-xl border border-stone-300 bg-white text-stone-900" />
```

# Supabase

- Supabase auth and data access use `@supabase/ssr` helpers in `src/lib/supabase/client.ts` and `src/lib/supabase/server.ts`.
- Browser auth flows should use `createSupabaseBrowserClient()`. Server routes, loaders, and server utilities should use `await createSupabaseServerClient()`.
- Treat files in `supabase/migrations` as record-keeping, not source of truth for current schema state.
- For Supabase migrations or schema modifications, inspect the live project with the Supabase plugin first (for example `list_projects`, `list_tables`, and targeted `execute_sql` introspection) before writing or applying SQL.
- Prefer plugin reads like `list_tables` or `search_docs`; use `apply_migration` for DDL and reserve `execute_sql` for targeted data queries.

```ts
const supabase = await createSupabaseServerClient();
const { data, error } = await supabase.from("projects").select("id,name");
```
