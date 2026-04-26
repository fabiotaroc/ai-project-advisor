# Design System Refactor Plan

Source reviewed: `/Users/taro/Downloads/ai project advisor.zip`.

Scope note: this plan uses the design-system tokens, principles, and React scene ideas. It intentionally does not treat the prototype HTML as the product direction.

## Design Direction

The system direction is strong for this app: quiet editorial SaaS, paper-like surfaces, precise evidence, and AI that feels useful without becoming loud. The chosen accent is **Iris**, so the app should stop reading as generic dark-blue SaaS and move toward warm neutral paper with one calm periwinkle accent.

Core principles to preserve:

- Evidence over confidence: answer surfaces should make citations first-class.
- Memory needs consent: durable memory/file updates should be reviewable drafts unless the user explicitly opts into automation.
- Hide the machinery: tool calls and internal agent work should collapse into quiet trace rows.
- Whitespace is structure: screens should feel less boxed-in and less dense.
- Two voices, one page: Geist for prose, Geist Mono for evidence, paths, timestamps, citations, and tool names.

## Current App Gap Summary

The app already has a good foundation: Next, Tailwind, shadcn-style primitives, light/dark theme tokens, Lucide icons, a sidebar, chat, sources, files/wiki, search, activity, and settings.

Main mismatches:

- Typography is Inter + JetBrains Mono, not Geist + Geist Mono.
- Global tokens are blue-gray SaaS tokens, not the paper/ink/iris system.
- `primary` is currently dark neutral in light mode; the design system expects the accent to carry primary action and focus meaning.
- Radius and shadow use is inconsistent: several areas use `rounded-2xl`, `rounded-3xl`, large glow shadows, and card-heavy composition.
- Activity exposes the implementation term `Librarian`; the user-facing language should be Advisor / background memory / proposed updates.
- Chat has tool traces, but not the full design-system pattern: numbered citations, citation rail, memory drafts, and AI surface treatment.
- Sources are functional, but the design-system wants sources to be the hero: summaries, key facts, linked artifacts, references in conversations, and direct actions.

## Priority 0: Quick Wins (Done)

These are low-risk changes that would make the app immediately feel closer to the design system.

1. **Adopt fonts**
   - Replace `Inter` with `Geist` in `src/app/layout.tsx`.
   - Replace `JetBrains_Mono` with `Geist_Mono`.
   - Keep existing CSS variables (`--font-body`, `--font-mono`) so component code barely changes.

2. **Retokenize globals around Iris**
   - Move `src/app/globals.css` toward the design-system aliases:
     - `--background` / `--card` -> `--paper`
     - `--muted` / `--sidebar` -> `--paper-3`
     - `--foreground` -> `--ink-1`
     - `--muted-foreground` -> `--ink-2` or `--ink-3`
     - `--border` / `--input` -> `--line`
     - `--primary` -> Iris `--accent`
     - `--ring` -> Iris focus color
   - Add design-system-only helper tokens: `--paper`, `--paper-2`, `--paper-3`, `--ink-1` through `--ink-4`, `--accent-soft`, `--accent-line`, `--accent-ink`, `--ai-surface`, `--ai-line`, `--cite-bg`, `--cite-fg`.
   - Set the app root to `data-accent="iris"` or hardwire Iris as the default token set. I would hardwire for now; accent switching is not needed yet.

3. **Normalize primitive styling**
   - Buttons: primary = iris, secondary = paper + line, ghost = transparent + paper-3 hover.
   - Badges/pills: add `accent`, `success`, `warning`, and quiet `neutral` variants.
   - Inputs: focus border/ring should use Iris; placeholder should use `ink-3`.
   - Cards: reduce default radius toward 10-14px and soften/remove large shadows.
   - Kbd: create a reusable keyboard hint style instead of repeated one-offs.

4. **Reduce one-off saturated colors**
   - Replace explicit `emerald`, `sky`, `rose`, `violet`, and hard-coded warning styles in Activity with semantic tokens.
   - Use Iris only for selection, focus, active state, citations, and approved accent moments.

5. **Language polish**
   - Replace visible `Librarian` labels with user-facing language:
     - "Advisor memory pass"
     - "Background memory update"
     - "Proposed update"
     - "Source integration"
   - Keep backend names unchanged for now.

## Priority 1: Component Refactor

This is the bigger design-system adoption layer. It should be done before deep page rewrites so pages do not keep reimplementing local styles.

Create or formalize these primitives:

- `Surface` / `Panel`: paper surface, border, optional header/footer.
- `PageHeader`: title, description, meta/action slot.
- `Pill`: neutral, accent, success, warning, danger.
- `Kbd`: mono keyboard hint.
- `CitationPill`: numbered inline citation with hover/focus behavior.
- `ToolTrace`: collapsed tool-call row with status dot, mono name, summary, optional details.
- `MemoryDraftCard`: proposed memory/file update with Save, Edit, Discard.
- `SourceLinkCard`: source reference with title, quote/excerpt, and location.
- `MetricTile`: compact project pulse stat.
- `EmptyState`: quiet text plus direct action, without oversized marketing composition.

Recommended file targets:

- `src/components/ui/badge.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/input.tsx`
- New files under `src/components/ui/` for `kbd`, `pill`, `surface`
- New domain components under `src/components/memory/`, `src/components/citations/`, and `src/components/activity/`

## Priority 2: Page-Level Refactors

### Chat

Chat is the most important page to align first.

Desired changes:

- Keep the chat surface calmer and less "bubble chat app".
- User messages can remain simple, but assistant messages should use `--ai-surface` / `--ai-line`.
- Render numbered citations inline in assistant markdown.
- Add a right rail on wider screens for citations, memory drafts, and conversation facts.
- Convert tool calls into `ToolTrace` rows: collapsed by default, mono, quiet, expandable.
- Use streaming dots and text like "Reading 3 sources..." instead of a generic spinner-only state.
- Composer should be compact, paper-like, and use the Iris send button.

Feature dependency: true citation rendering needs message citation metadata and source linking to be reliable. The UI component can be built first with mocked/derived metadata, but production usefulness depends on backend support.

### Sources

The Sources view should become the evidence center.

Desired changes:

- Keep the list/detail split, but make the detail page more editorial:
  - AI summary
  - key facts
  - linked project files/artifacts
  - mentioned in conversations
  - file details
  - actions: ask about this source, open original, copy link
- Use pills for type/status/chunk counts.
- Stronger source cards with a mono metadata footer.
- Consider the naming question from `TODO.md`: "Sources" might become "Artifacts" or "Evidence", but I would not rename until product vocabulary is settled.

### Activity

Activity should be readable as "what changed in my project", not a backend event log.

Desired changes:

- Rename visible Librarian concepts.
- Add backlinks to source/file/chat targets.
- Group background memory work as Advisor activity.
- Use a quieter timeline: small status dot, paper card, semantic pill.
- Surface "awaiting review" above generic history.

### Files / Wiki

This area needs product vocabulary work before a visual rewrite.

Desired direction:

- Split "project memory" from internal agent-maintained files.
- Surface stable files like `PROJECT.md`, `PRODUCT.md`, `WORK.md`, `DECISIONS.md`, `glossary.md`.
- Hide or de-emphasize low-level/internal memory files unless the user asks for them.
- Add version history affordances and a clearer save state.
- Keep the editor dense and practical; do not over-card it.

### Project Home / Overview

The prototype's project home idea is worth keeping, even if the implementation changes.

Potential first screen:

- Greeting or project summary.
- Awaiting review: memory drafts.
- Recent activity.
- Project pulse: sources, chunks, conversations, memory entries.
- Quick starts: "Draft status snapshot", "What changed since last week?", "Ask about latest sources".
- Members preview.

This is useful, but not a quick win because it depends on reviewable memory drafts and better activity/source relationships.

### Settings

Settings should eventually include advisor behavior preferences:

- Always cite sources.
- Auto-save low-risk memory updates, default off.
- Weekly digest, if/when email digests exist.
- Export project memory.
- Member access remains here.

These should stand by until the underlying behavior exists.

## Priority 3: Larger Refactor Themes

1. **Token discipline**
   - Pages should not choose raw colors directly.
   - Use semantic tokens and component variants.
   - Audit with `rg "emerald|sky|violet|rose|rounded-2xl|rounded-3xl|shadow-\\[" src`.

2. **Spacing scale**
   - Adopt the 4pt scale deliberately: 4, 8, 12, 16, 20, 24, 32, 40, 56, 72, 96.
   - Replace one-off pixel spacing where it changes component rhythm.
   - Keep dense operational areas practical, especially source lists and file editors.

3. **Radius policy**
   - House radius: 10px.
   - Small controls: 6px.
   - Larger panels/modals: 14px.
   - Avoid 24-32px pill-like cards unless the element is actually a pill or avatar.

4. **Layout system**
   - Standardize split views: list/detail, rail/detail, editor/sidebar.
   - Avoid nested cards.
   - Prefer full-height operational layouts over floating dashboard cards.

5. **AI-specific UI contract**
   - Citations, tool traces, memory drafts, source references, and file edit confirmations should be shared UI patterns, not page-specific markup.
   - This will keep chat, activity, sources, and overview consistent.

## Features Not Fully Implemented Yet: Stand By

These design-system ideas depend on product/backend work and should not be treated as pure styling tasks.

- **Perplexity-style citations in chat**
  - Currently listed in `docs/TODO.md`.
  - Need citation metadata, source locations, and click behavior.

- **Reviewable memory drafts**
  - The design system assumes proposed updates wait for user approval.
  - Current agent/librarian flows can write files; the review queue needs a real data model or use of existing suggestions/run records.

- **Advisor vs Librarian product language**
  - Backend split can remain, but frontend should hide "Librarian".
  - Bigger decision: whether Librarian becomes a true background subagent of Advisor.

- **Project home / pulse**
  - Needs reliable counts, latest source/indexing status, pending review count, and recent activity links.

- **Source previews for PPTX/DOCX/XLSX**
  - Already in `TODO.md`.
  - Requires renderers/previews, open original, download, and possibly source thumbnails.

- **Linked artifacts**
  - Source detail wants links to decisions, files, chats, and memory drafts.
  - Needs relationship data or derived linking.

- **Weekly digest**
  - Appears in the design-system settings idea.
  - Requires email/digest generation and scheduling.

- **Export project memory**
  - Useful settings action, but requires export format and permissions.

## Suggested Implementation Order

1. Fonts + global Iris tokens.
2. Primitive pass: Button, Badge/Pill, Card, Input, Kbd, focus rings, scrollbar.
3. Activity color/language cleanup, because it is visible and currently furthest from the tone.
4. Chat visual refactor without full citations: AI surface, tool trace, composer, streaming state.
5. Citation data model and inline citation UI.
6. Memory draft/review queue.
7. Sources detail rewrite around evidence.
8. Project home once memory drafts and activity links exist.
9. Files/wiki vocabulary and information architecture pass.

## Open Questions

- Should the nav label remain "Sources", or become "Evidence" / "Artifacts"?
- Should "Files" become "Wiki", "Memory", or "Project Memory"?
- Should Iris be a fixed brand choice, or should `data-accent` remain available for future user/project themes?
- Should memory drafts be stored as a first-class table, or derived from existing `librarian_suggestion` / run output?
- How much of the internal file tree should be visible by default?
