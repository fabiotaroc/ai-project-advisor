import "server-only";

import { generateObject } from "ai";
import { openai, type OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_CANONICAL_DOC_SLUGS,
  type CanonicalDocSlug,
} from "@/lib/types";

const EXTRACTION_MODEL = "gpt-5.4";
const NON_MEETING_CONFIDENCE_THRESHOLD = 0.7;
const MAX_INSERTED_TEXT_CHARS = 800;

const candidateSchema = z.object({
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

const extractionResponseSchema = z.object({
  candidates: z.array(candidateSchema),
});

type ExtractionCandidate = z.infer<typeof candidateSchema>;

export type PendingEditRow = {
  id: string;
  target_doc_id: string;
  target_doc_slug: string;
  inserted_text: string;
  reason: string | null;
  confidence: number | null;
};

export type ExtractPendingEditsResult = {
  pendingEdits: PendingEditRow[];
  countsByDocSlug: Record<string, number>;
};

export async function extractPendingEditsFromSource({
  projectId,
  userId,
  sourceId,
  sourceTitle,
  sourceSummary,
  sourceExcerpt,
  sourceType,
}: {
  projectId: string;
  userId: string;
  sourceId: string;
  sourceTitle: string;
  sourceSummary: string | null;
  sourceExcerpt: string;
  sourceType: "document" | "email" | "meeting" | "note";
}): Promise<ExtractPendingEditsResult> {
  const admin = createSupabaseAdminClient();

  const { data: docRows, error: docsError } = await admin
    .from("canonical_docs")
    .select("id,slug,title,body,is_default,is_pinned")
    .eq("project_id", projectId);
  if (docsError) throw docsError;

  const docs = docRows ?? [];
  if (docs.length === 0) {
    return { pendingEdits: [], countsByDocSlug: {} };
  }
  const docBySlug = new Map(docs.map((d) => [String(d.slug), d]));

  const docCatalog = docs
    .map((d) => {
      const headingPreview = String(d.body ?? "")
        .split("\n")
        .filter((line) => line.startsWith("#"))
        .slice(0, 6)
        .join("\n");
      return [
        `## ${d.slug} — ${d.title}`,
        d.is_default ? "(default)" : "(pinned)",
        headingPreview ? `Existing headings:\n${headingPreview}` : "Empty.",
      ].join("\n");
    })
    .join("\n\n");

  const systemPrompt = [
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
    "- If a relevant existing heading is shown in 'Existing headings', set anchor_heading to that heading text (verbatim, including leading hashes).",
    "- Otherwise leave anchor_heading null and the doc reviewer will pick a location.",
    "- anchor_before / anchor_after are optional context strings to help repositioning if the doc has changed; use null if you don't have a specific neighboring sentence.",
  ].join("\n");

  const userPrompt = [
    `Source type: ${sourceType}`,
    `Source title: ${sourceTitle}`,
    sourceSummary ? `Source summary: ${sourceSummary}` : null,
    "",
    "Available canonical docs:",
    docCatalog,
    "",
    "Source excerpt (parsed content, may be truncated):",
    "```",
    sourceExcerpt,
    "```",
  ]
    .filter((part): part is string => part !== null)
    .join("\n");

  let candidates: ExtractionCandidate[] = [];
  try {
    const { object } = await generateObject({
      model: openai(EXTRACTION_MODEL),
      schema: extractionResponseSchema,
      system: systemPrompt,
      prompt: userPrompt,
      providerOptions: {
        openai: {
          reasoningEffort: "low",
          reasoningSummary: "auto",
        } satisfies OpenAILanguageModelResponsesOptions,
      },
    });
    candidates = object.candidates;
  } catch (err) {
    console.error("extractPendingEditsFromSource generateObject failed", err);
    throw err;
  }

  const filtered = candidates.filter((c) => {
    if (!c.inserted_text.trim()) return false;
    if (!docBySlug.has(c.target_doc_slug)) return false;
    if (sourceType !== "meeting" && c.confidence < NON_MEETING_CONFIDENCE_THRESHOLD) {
      return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    return { pendingEdits: [], countsByDocSlug: {} };
  }

  const insertRows = filtered.map((c) => {
    const doc = docBySlug.get(c.target_doc_slug)!;
    const anchor: Record<string, string> = {};
    if (c.anchor_heading) anchor.heading = c.anchor_heading;
    if (c.anchor_before) anchor.before = c.anchor_before.slice(-240);
    if (c.anchor_after) anchor.after = c.anchor_after.slice(0, 240);

    return {
      project_id: projectId,
      target_doc_id: doc.id,
      source_material_id: sourceId,
      origin: "ingestion" as const,
      anchor,
      inserted_text: c.inserted_text.slice(0, MAX_INSERTED_TEXT_CHARS),
      deleted_text: null,
      reason: c.reason,
      confidence: c.confidence,
      created_by: userId,
    };
  });

  const { data: inserted, error: insertError } = await admin
    .from("pending_wiki_edits")
    .insert(insertRows)
    .select("id,target_doc_id,inserted_text,reason,confidence");

  if (insertError) throw insertError;

  const insertedRows = inserted ?? [];
  const slugByDocId = new Map(docs.map((d) => [d.id, String(d.slug)]));

  const pendingEdits: PendingEditRow[] = insertedRows.map((row) => ({
    id: String(row.id),
    target_doc_id: String(row.target_doc_id),
    target_doc_slug: slugByDocId.get(String(row.target_doc_id)) ?? "",
    inserted_text: String(row.inserted_text ?? ""),
    reason: row.reason ?? null,
    confidence: typeof row.confidence === "number" ? row.confidence : null,
  }));

  const countsByDocSlug: Record<string, number> = {};
  for (const edit of pendingEdits) {
    if (!edit.target_doc_slug) continue;
    countsByDocSlug[edit.target_doc_slug] = (countsByDocSlug[edit.target_doc_slug] ?? 0) + 1;
  }

  return { pendingEdits, countsByDocSlug };
}

export const KNOWN_DOC_SLUGS: readonly CanonicalDocSlug[] = DEFAULT_CANONICAL_DOC_SLUGS;
