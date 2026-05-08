import "server-only";

import { Output, embed, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { extractEmailText } from "@/lib/server/email-ingestion";
import {
  MEETING_EXTRACTION_SYSTEM_PROMPT,
  SOURCE_SUMMARY_SYSTEM_PROMPT,
  buildMeetingExtractionUserPrompt,
  buildSourceSummaryUserPrompt,
  meetingTranscriptExtractionSchema,
  truncateMeetingTranscriptForPrompt,
  type MeetingTranscriptExtraction,
} from "@/lib/server/prompts/meeting-extraction";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SourceMaterial } from "@/lib/types";

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 200;
const CHUNK_STEP = CHUNK_SIZE - CHUNK_OVERLAP;

export type TextChunk = {
  content: string;
  charStart: number;
  charEnd: number;
};

export async function extractText(
  buffer: Buffer,
  fileName: string,
): Promise<string> {
  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();

  switch (ext) {
    case ".pdf": {
      const { CanvasFactory } = await import("pdf-parse/worker");
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer), CanvasFactory });

      try {
        const result = await parser.getText();
        return result.text;
      } finally {
        await parser.destroy();
      }
    }
    case ".docx": {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    case ".eml": {
      return extractEmailText(buffer);
    }
    case ".md":
    case ".txt":
    case ".vtt":
    case ".srt":
      return buffer.toString("utf-8");
    default:
      return buffer.toString("utf-8");
  }
}

export function chunkText(text: string): string[] {
  return chunkTextWithOffsets(text).map((chunk) => chunk.content);
}

export function chunkTextWithOffsets(text: string): TextChunk[] {
  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    const content = text.slice(start, end);
    if (content.trim().length > 0) {
      chunks.push({ content, charStart: start, charEnd: end });
    }
    start += CHUNK_STEP;
  }

  return chunks;
}

export async function generateEmbeddings(chunks: string[]): Promise<number[][]> {
  const results: number[][] = [];
  const batchSize = 20;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const embeddings = await Promise.all(
      batch.map(async (chunk) => {
        const { embedding } = await embed({
          model: openai.embedding("text-embedding-3-small"),
          value: chunk,
        });
        return embedding;
      }),
    );
    results.push(...embeddings);
  }

  return results;
}

export type { MeetingTranscriptExtraction };

function normalizeStringList(value: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of value) {
    const s = typeof raw === "string" ? raw.trim() : "";
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function parseMeetingAtTimestamptz(iso: string | null | undefined): string | null {
  if (iso == null || typeof iso !== "string") return null;
  const trimmed = iso.trim();
  if (!trimmed) return null;
  const ms = Date.parse(trimmed);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

export async function extractMeetingTranscriptInsights(
  text: string,
  title: string,
): Promise<MeetingTranscriptExtraction> {
  const transcript = truncateMeetingTranscriptForPrompt(text);

  const { output } = await generateText({
    model: openai("gpt-5.4-mini"),
    output: Output.object({ schema: meetingTranscriptExtractionSchema }),
    system: MEETING_EXTRACTION_SYSTEM_PROMPT,
    prompt: buildMeetingExtractionUserPrompt(title, transcript),
  });

  return {
    ...output,
    decisions: normalizeStringList(output.decisions),
    action_items: normalizeStringList(output.action_items),
    risks: normalizeStringList(output.risks),
    open_questions: normalizeStringList(output.open_questions),
    participants: normalizeStringList(output.participants),
  };
}

export async function generateSourceSummary(
  text: string,
  title: string,
): Promise<string> {
  const snippet = text.slice(0, 6000);

  const { text: summary } = await generateText({
    model: openai("gpt-5.4-mini"),
    system: SOURCE_SUMMARY_SYSTEM_PROMPT,
    prompt: buildSourceSummaryUserPrompt(title, snippet),
    maxOutputTokens: 300,
  });

  return summary;
}

/**
 * Perform the deterministic part of source ingestion: extract text, chunk,
 * embed, and store a summary. Wiki synthesis is handled separately by the
 * Librarian agent (see src/lib/server/librarian/triggers.ts).
 */
export async function ingestSourceMaterial({
  sourceId,
  projectId,
  userId,
  text,
  title,
  sourceType,
}: {
  sourceId: string;
  projectId: string;
  userId: string;
  text: string;
  title: string;
  sourceType: SourceMaterial["type"];
}) {
  const admin = createSupabaseAdminClient();
  const isMeeting = sourceType === "meeting";

  try {
    await admin.from("source_chunks").delete().eq("source_material_id", sourceId);

    await admin
      .from("source_materials")
      .update({ status: "processing", parsed_content: text, summary: null })
      .eq("id", sourceId);

    if (!isMeeting) {
      await admin.from("source_meeting_details").delete().eq("source_material_id", sourceId);
    }

    const chunks = chunkTextWithOffsets(text);
    let summary: string;

    if (isMeeting) {
      const extracted = await extractMeetingTranscriptInsights(text, title);
      summary = extracted.short_summary;

      const meetingAt = parseMeetingAtTimestamptz(extracted.meeting_at);
      const { error: meetingDetailError } = await admin.from("source_meeting_details").upsert(
        {
          source_material_id: sourceId,
          short_summary: extracted.short_summary,
          decisions: extracted.decisions,
          action_items: extracted.action_items,
          risks: extracted.risks,
          open_questions: extracted.open_questions,
          participants: extracted.participants,
          meeting_at: meetingAt,
        },
        { onConflict: "source_material_id" },
      );
      if (meetingDetailError) throw meetingDetailError;
    } else {
      summary = await generateSourceSummary(text, title);
    }

    const embeddings = await generateEmbeddings(chunks.map((chunk) => chunk.content));

    const chunkRows = chunks.map((chunk, index) => ({
      source_material_id: sourceId,
      content: chunk.content,
      embedding: JSON.stringify(embeddings[index]),
      chunk_index: index,
      char_start: chunk.charStart,
      char_end: chunk.charEnd,
      metadata: {},
    }));

    if (chunkRows.length > 0) {
      const { error: chunkError } = await admin.from("source_chunks").insert(chunkRows);
      if (chunkError) throw chunkError;
    }

    await admin
      .from("source_materials")
      .update({ status: "ready", summary })
      .eq("id", sourceId);

    await admin.from("activity_events").insert({
      project_id: projectId,
      event_type: "source_ingested",
      summary: isMeeting
        ? `Ingested meeting "${title}" — ${chunks.length} chunks, structured recap`
        : `Ingested "${title}" — ${chunks.length} chunks, summary generated`,
      actor_id: userId,
      target_type: "source_material",
      target_id: sourceId,
      metadata: {
        title,
        chunk_count: chunks.length,
        source_type: sourceType,
      },
    });
  } catch (error) {
    console.error("Ingestion failed for source", sourceId, error);
    await admin.from("source_materials").update({ status: "failed" }).eq("id", sourceId);
    throw error;
  }
}
