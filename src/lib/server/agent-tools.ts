import "server-only";

import { embed, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { buildSourceDisplayExcerpt } from "@/lib/server/source-snippets";

type AnySupabase = SupabaseClient<Database>;

export type AdvisorToolContext = {
  kind: "advisor";
  projectId: string;
  userId: string;
  conversationId: string;
  canWrite: boolean;
  userSupabase: AnySupabase;
};

export type AgentToolContext = AdvisorToolContext;

export type AdvisorSuggestion = {
  kind: "question" | "source" | "fix";
  title: string;
  rationale?: string;
};

/**
 * Per-turn record collected from advisor tool calls. Currently only suggestions
 * (file actions were removed in §3 — chat-side wiki writes land via §5's
 * `propose_wiki_update` tool, which emits a pending_wiki_edits row, not an action).
 */
export type LibrarianRunRecord = {
  suggestions: AdvisorSuggestion[];
};

function searchSourcesTool(projectId: string, supabase: AnySupabase) {
  return tool({
    description:
      "Hybrid search (semantic embeddings + English full-text keywords) across ingested source chunks. Use returned source_material_id with read_source; chunk_id values are stable anchors for citations. match_kind indicates whether a hit came from vectors, keyword match, or both.",
    inputSchema: z.object({ query: z.string().min(2) }),
    execute: async ({ query }) => {
      const { embedding: queryEmbedding } = await embed({
        model: openai.embedding("text-embedding-3-small"),
        value: query,
      });

      const { data, error } = await supabase.rpc("match_source_chunks_hybrid", {
        p_project_id: projectId,
        p_query_embedding: JSON.stringify(queryEmbedding) as unknown as string,
        p_query_text: query,
        p_match_count: 8,
      });

      if (error) throw error;
      if (!data?.length) return [];

      const sourceIds = [
        ...new Set(
          data.map(
            (d: { source_material_id: string }) => d.source_material_id,
          ),
        ),
      ];
      const { data: sources } = await supabase
        .from("source_materials")
        .select("id,title,parsed_content")
        .in("id", sourceIds);

      const sourceMap = new Map(
        (sources ?? []).map((source) => [
          source.id,
          { title: source.title, parsedContent: source.parsed_content },
        ] as const),
      );

      return data.map(
        (chunk: {
          chunk_id: string;
          source_material_id: string;
          content: string;
          similarity: number;
          semantic_similarity: number | null;
          lexical_rank: number | null;
          match_kind: string;
          char_start: number | null;
          char_end: number | null;
        }) => ({
          chunk_id: chunk.chunk_id,
          source_material_id: chunk.source_material_id,
          source_title:
            sourceMap.get(chunk.source_material_id)?.title ?? "Unknown",
          content: chunk.content,
          excerpt: buildSourceDisplayExcerpt({
            content: chunk.content,
            fullText: sourceMap.get(chunk.source_material_id)?.parsedContent,
          }),
          similarity: chunk.similarity,
          semantic_similarity: chunk.semantic_similarity,
          lexical_rank: chunk.lexical_rank,
          match_kind: chunk.match_kind,
          char_start: chunk.char_start,
          char_end: chunk.char_end,
        }),
      );
    },
  });
}

function readSourceTool(projectId: string, supabase: AnySupabase) {
  return tool({
    description:
      "Read a full source material by id. Call this only with a sourceMaterialId returned by search_sources.",
    inputSchema: z.object({ sourceMaterialId: z.string().uuid() }),
    execute: async ({ sourceMaterialId }) => {
      const { data, error } = await supabase
        .from("source_materials")
        .select("id,title,type,summary,parsed_content,metadata,created_at")
        .eq("project_id", projectId)
        .eq("id", sourceMaterialId)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return {
          found: false,
          sourceMaterialId,
          message:
            "Source not found in this project. Run search_sources first and only use a returned sourceMaterialId.",
        };
      }
      return data;
    },
  });
}

function recordSuggestionTool(ctx: AdvisorToolContext, record: LibrarianRunRecord) {
  return tool({
    description:
      "Record a forward-looking suggestion surfaced to the user (question to investigate, source to find, or fix). Use sparingly for substantive follow-ups. Do NOT use this to propose wiki edits — those will land via a dedicated proposal tool.",
    inputSchema: z.object({
      kind: z.enum(["question", "source", "fix"]),
      title: z.string().min(3),
      rationale: z.string().optional(),
    }),
    execute: async ({ kind, title, rationale }) => {
      record.suggestions.push({ kind, title, rationale });
      const admin = createSupabaseAdminClient();
      await admin.from("activity_events").insert({
        project_id: ctx.projectId,
        event_type: "advisor_suggestion",
        summary: `[${kind}] ${title}`,
        actor_id: ctx.userId,
        target_type: "chat",
        target_id: ctx.conversationId,
        metadata: {
          conversation_id: ctx.conversationId,
          kind,
          title,
          rationale: rationale ?? null,
        },
      });
      return { recorded: true };
    },
  });
}

function proposeWikiUpdateTool(ctx: AdvisorToolContext) {
  return tool({
    description:
      "Propose a user-requested update to one canonical wiki doc. Use only when the user explicitly asks you to remember, record, save, or update project knowledge. This creates a review card in chat; it does not modify the wiki until the user saves it.",
    inputSchema: z.object({
      target_doc_slug: z.string().min(1).describe("Canonical doc slug, e.g. decisions, work, people, glossary, project."),
      content: z.string().min(1).describe("Markdown text to insert into the target doc."),
      reason: z.string().min(3).describe("Short explanation shown on the proposal card."),
      anchor_heading: z.string().optional().describe("Optional heading to place the update under."),
    }),
    execute: async ({ target_doc_slug, content, reason, anchor_heading }) => {
      if (!ctx.canWrite) {
        return {
          proposed: false,
          error: "Viewers have read-only access.",
        };
      }

      const admin = createSupabaseAdminClient();
      const slug = target_doc_slug.trim().toLowerCase();
      const { data: doc, error: docError } = await admin
        .from("canonical_docs")
        .select("id,slug,title")
        .eq("project_id", ctx.projectId)
        .eq("slug", slug)
        .maybeSingle();

      if (docError) throw docError;
      if (!doc) {
        return {
          proposed: false,
          error: `No canonical doc exists with slug "${slug}".`,
        };
      }

      const { data: edit, error } = await admin
        .from("pending_wiki_edits")
        .insert({
          project_id: ctx.projectId,
          target_doc_id: doc.id,
          source_material_id: null,
          origin: "chat",
          anchor: anchor_heading?.trim() ? { heading: anchor_heading.trim() } : {},
          inserted_text: content.trim(),
          deleted_text: null,
          reason: reason.trim(),
          confidence: null,
          status: "pending",
          created_by: ctx.userId,
        })
        .select("id,status,inserted_text,reason,created_at")
        .single();

      if (error) throw error;

      return {
        proposed: true,
        edit_id: edit.id,
        status: edit.status,
        target_doc_id: doc.id,
        target_doc_slug: doc.slug,
        target_doc_title: doc.title,
        inserted_text: edit.inserted_text,
        reason: edit.reason,
        created_at: edit.created_at,
      };
    },
  });
}

/**
 * Tool surface for the advisor (chat). Canonical docs are loaded into the
 * advisor context; source reads and wiki writes stay tool-backed.
 */
export function buildAgentTools(ctx: AgentToolContext, record: LibrarianRunRecord) {
  const admin = createSupabaseAdminClient();
  const sourceSupabase = ctx.userSupabase ?? admin;

  return {
    search_sources: searchSourcesTool(ctx.projectId, sourceSupabase),
    read_source: readSourceTool(ctx.projectId, sourceSupabase),
    propose_wiki_update: proposeWikiUpdateTool(ctx),
    record_suggestion: recordSuggestionTool(ctx, record),
  } as const;
}
