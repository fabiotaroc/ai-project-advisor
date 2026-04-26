import "server-only";

import { embed, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 200;

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
      const raw = buffer.toString("utf-8");
      const bodyStart = raw.indexOf("\n\n");
      if (bodyStart === -1) return raw;
      const headers = raw.slice(0, bodyStart);
      let body = raw.slice(bodyStart + 2);
      body = body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const subject = headers.match(/^Subject:\s*(.+)$/im)?.[1] ?? "";
      const from = headers.match(/^From:\s*(.+)$/im)?.[1] ?? "";
      const to = headers.match(/^To:\s*(.+)$/im)?.[1] ?? "";
      const date = headers.match(/^Date:\s*(.+)$/im)?.[1] ?? "";
      return [
        subject && `Subject: ${subject}`,
        from && `From: ${from}`,
        to && `To: ${to}`,
        date && `Date: ${date}`,
        "",
        body,
      ]
        .filter(Boolean)
        .join("\n");
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
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks.filter((c) => c.trim().length > 0);
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

export async function generateSourceSummary(
  text: string,
  title: string,
): Promise<string> {
  const snippet = text.slice(0, 6000);

  const { text: summary } = await generateText({
    model: openai("gpt-5.4-mini"),
    system:
      "You are a concise summarizer. Produce a 2-4 sentence summary of the document. Focus on the key facts, decisions, and action items.",
    prompt: `Document title: ${title}\n\n${snippet}`,
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
}: {
  sourceId: string;
  projectId: string;
  userId: string;
  text: string;
  title: string;
}) {
  const admin = createSupabaseAdminClient();

  try {
    await admin
      .from("source_materials")
      .update({ status: "processing", parsed_content: text })
      .eq("id", sourceId);

    const [summary, chunks] = await Promise.all([
      generateSourceSummary(text, title),
      Promise.resolve(chunkText(text)),
    ]);

    const embeddings = await generateEmbeddings(chunks);

    const chunkRows = chunks.map((content, index) => ({
      source_material_id: sourceId,
      content,
      embedding: JSON.stringify(embeddings[index]),
      chunk_index: index,
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
      summary: `Ingested "${title}" — ${chunks.length} chunks, summary generated`,
      actor_id: userId,
      target_type: "source_material",
      target_id: sourceId,
      metadata: {
        title,
        chunk_count: chunks.length,
      },
    });
  } catch (error) {
    console.error("Ingestion failed for source", sourceId, error);
    await admin.from("source_materials").update({ status: "failed" }).eq("id", sourceId);
    throw error;
  }
}
