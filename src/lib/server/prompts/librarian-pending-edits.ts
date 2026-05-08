import "server-only";

import { z } from "zod";

// Used by extractPendingEditsFromSource in src/lib/server/librarian/extract-pending-edits.ts.
export const LIBRARIAN_PENDING_EDITS_SYSTEM_PROMPT = [
  "You extract structured, append-only proposals from a single ingested source into a fixed set of canonical project docs.",
  "Your output is reviewed by a human before any doc is touched. Be precise, be conservative.",
  "",
  "Rules:",
  "- Only emit a candidate when the source genuinely warrants it. Empty output is a valid response.",
  "- inserted_text must be a single self-contained markdown fragment — typically a bullet, a short paragraph, or a small list. No deletions, no rewrites of existing content.",
  "- Always include a brief source citation in the inserted_text, formatted like ` (from \"<source title>\")`.",
  "- Pick target_doc_slug from the list below. Do not invent new slugs.",
  "- For meetings: extract decisions → decisions, action items / WIP / blockers → work, attendee role notes → people, defined terms → glossary.",
  "- For email/file/note sources: extract only when the signal is clear (a stated decision, a clear ownership note, a new defined term). When in doubt, skip.",
  "- confidence: 0.9+ only when the source explicitly states the fact; 0.5–0.8 when it's strongly implied; below 0.5 should usually not be emitted.",
  "",
  "Anchor rules:",
  "- If a relevant existing heading appears in the full target doc body shown below, set anchor_heading to that heading text (verbatim, including leading hashes).",
  "- Do not invent headings. If no shown heading fits, leave anchor_heading null and the doc reviewer will pick a location.",
  "- anchor_before / anchor_after are optional context strings to help repositioning if the doc has changed; use null if you don't have a specific neighboring sentence.",
].join("\n");

export const librarianPendingEditCandidateSchema = z.object({
  target_doc_slug: z.string().describe(
    "Slug of the canonical doc this update targets. Must be one of the slugs from the available docs.",
  ),
  anchor_heading: z
    .string()
    .nullable()
    .describe("The markdown heading the inserted text belongs under, if any. Null if appending to top-level."),
  anchor_before: z
    .string()
    .nullable()
    .describe("Up to 120 chars of text expected to appear immediately BEFORE the insertion point. Null if appending to end of section."),
  anchor_after: z
    .string()
    .nullable()
    .describe("Up to 120 chars of text expected to appear immediately AFTER the insertion point. Null if appending to end of section."),
  inserted_text: z
    .string()
    .describe("The markdown text to insert. Append-only — never include deletions or rewrites."),
  reason: z
    .string()
    .describe("One sentence explaining why this update is appropriate based on the source."),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence that this update is worth proposing, 0..1."),
});

export const librarianPendingEditsResponseSchema = z.object({
  candidates: z.array(librarianPendingEditCandidateSchema),
});

export type LibrarianPendingEditCandidate = z.infer<typeof librarianPendingEditCandidateSchema>;

export function buildLibrarianPendingEditsUserPrompt({
  sourceType,
  sourceTitle,
  sourceSummary,
  docCatalog,
  sourceExcerpt,
}: {
  sourceType: string;
  sourceTitle: string;
  sourceSummary: string | null;
  docCatalog: string;
  sourceExcerpt: string;
}): string {
  return [
    `Source type: ${sourceType}`,
    `Source title: ${sourceTitle}`,
    sourceSummary ? `Source summary: ${sourceSummary}` : null,
    "",
    "Available canonical docs (full bodies):",
    docCatalog,
    "",
    "Source excerpt (parsed content, may be truncated):",
    "```",
    sourceExcerpt,
    "```",
  ]
    .filter((part): part is string => part !== null)
    .join("\n");
}
