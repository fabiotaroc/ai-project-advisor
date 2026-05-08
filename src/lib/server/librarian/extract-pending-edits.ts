import "server-only";

import { Output, generateText } from "ai";
import { openai, type OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai";
import {
  LIBRARIAN_PENDING_EDITS_SYSTEM_PROMPT,
  buildLibrarianPendingEditsUserPrompt,
  librarianPendingEditsResponseSchema,
  type LibrarianPendingEditCandidate,
} from "@/lib/server/prompts/librarian-pending-edits";
import { formatCanonicalDocsForPrompt } from "@/lib/server/prompts/canonical-docs";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_CANONICAL_DOC_SLUGS,
  type CanonicalDocSlug,
} from "@/lib/types";

const EXTRACTION_MODEL = "gpt-5.4";
const NON_MEETING_CONFIDENCE_THRESHOLD = 0.7;
const MAX_INSERTED_TEXT_CHARS = 800;

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

  const docCatalog = formatCanonicalDocsForPrompt(docs);

  const userPrompt = buildLibrarianPendingEditsUserPrompt({
    sourceType,
    sourceTitle,
    sourceSummary,
    docCatalog,
    sourceExcerpt,
  });

  let candidates: LibrarianPendingEditCandidate[] = [];
  try {
    const { output } = await generateText({
      model: openai(EXTRACTION_MODEL),
      output: Output.object({ schema: librarianPendingEditsResponseSchema }),
      system: LIBRARIAN_PENDING_EDITS_SYSTEM_PROMPT,
      prompt: userPrompt,
      providerOptions: {
        openai: {
          reasoningEffort: "low",
          reasoningSummary: "auto",
        } satisfies OpenAILanguageModelResponsesOptions,
      },
    });
    candidates = output.candidates;
  } catch (err) {
    console.error("extractPendingEditsFromSource generateText failed", err);
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
