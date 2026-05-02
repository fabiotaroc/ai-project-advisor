import "server-only";

import { embed, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { after } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import type { ProjectSettings } from "@/lib/types";
import { buildSourceDisplayExcerpt } from "@/lib/server/source-snippets";
import {
  createProjectFile,
  deleteProjectFile,
  editProjectFile,
  renameProjectFile,
} from "@/lib/server/project-files";
import { triggerWikiLint } from "@/lib/server/librarian/triggers";

type AnySupabase = SupabaseClient<Database>;

const ENTITY_PAGE_PREFIXES = ["stakeholders/", "entities/", "people/"];

function isEntityPath(path: string): boolean {
  return ENTITY_PAGE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export type AgentRunMode = "write" | "proposal";
/** Alias for librarian runs / wire types. */
export type LibrarianMode = AgentRunMode;

export type LibrarianToolContext = {
  kind: "librarian";
  projectId: string;
  userId: string;
  runId: string;
  mode: AgentRunMode;
  canCreateEntityPages: boolean;
};

export type LibrarianToolContextInput = Omit<LibrarianToolContext, "kind">;

export type AdvisorToolContext = {
  kind: "advisor";
  projectId: string;
  userId: string;
  conversationId: string;
  mode: AgentRunMode;
  canWrite: boolean;
  canCreateEntityPages: boolean;
  userSupabase: AnySupabase;
};

export type AgentToolContext = AdvisorToolContext | LibrarianToolContext;

type FileActionLog = {
  action: "create" | "edit" | "rename" | "delete";
  path: string;
  details?: Record<string, unknown>;
};

export type LibrarianSuggestion = {
  kind: "question" | "source" | "fix";
  title: string;
  rationale?: string;
};

export type LibrarianRunRecord = {
  actions: FileActionLog[];
  suggestions: LibrarianSuggestion[];
};

export function resolveAdvisorToolMode(settings: ProjectSettings | null): AgentRunMode {
  if (settings?.proactivity === "reactive") return "proposal";
  return "write";
}

function advisorWriteBlocked(ctx: AgentToolContext): string | null {
  if (ctx.kind !== "advisor") return null;
  if (ctx.mode === "proposal") return null;
  if (!ctx.canWrite) {
    return "You have viewer access to this project. File changes are not applied; use an editor/owner role to apply writes.";
  }
  return null;
}

async function logLibrarianFileActivity(
  ctx: LibrarianToolContext,
  action: FileActionLog["action"],
  path: string,
  fileId: string | null,
) {
  const admin = createSupabaseAdminClient();
  await admin.from("activity_events").insert({
    project_id: ctx.projectId,
    event_type: `librarian_file_${action}`,
    summary: `Librarian ${action}d ${path}`,
    actor_id: ctx.userId,
    target_type: "project_file",
    target_id: fileId,
    metadata: {
      run_id: ctx.runId,
      action,
      path,
    },
  });
}

async function logAdvisorFileActivity(
  ctx: AdvisorToolContext,
  action:
    | { type: "agent_file_edit"; path: string; isCreate: boolean; fileId: string }
    | { type: "agent_file_rename"; from: string; to: string; fileId: string }
    | { type: "agent_file_delete"; path: string; fileId: string },
) {
  const admin = createSupabaseAdminClient();
  if (action.type === "agent_file_edit") {
    await admin.from("activity_events").insert({
      project_id: ctx.projectId,
      event_type: "agent_file_edit",
      summary: `Agent ${action.isCreate ? "created" : "updated"} ${action.path}`,
      actor_id: ctx.userId,
      target_type: "project_file",
      target_id: action.fileId,
      metadata: { path: action.path, action: action.isCreate ? "create" : "edit" },
    });
    return;
  }
  if (action.type === "agent_file_rename") {
    await admin.from("activity_events").insert({
      project_id: ctx.projectId,
      event_type: "agent_file_rename",
      summary: `Agent renamed ${action.from} → ${action.to}`,
      actor_id: ctx.userId,
      target_type: "project_file",
      target_id: action.fileId,
      metadata: { from: action.from, to: action.to },
    });
    return;
  }
  await admin.from("activity_events").insert({
    project_id: ctx.projectId,
    event_type: "agent_file_delete",
    summary: `Agent deleted ${action.path}`,
    actor_id: ctx.userId,
    target_type: "project_file",
    target_id: action.fileId,
    metadata: { path: action.path },
  });
}

function listFilesTool(projectId: string, supabase: AnySupabase) {
  return tool({
    description:
      "List all live project files with display metadata. Use this at the start of a turn/run to see what exists.",
    inputSchema: z.object({}),
    execute: async () => {
      const { data, error } = await supabase
        .from("project_files")
        .select(
          "path,pinned,visibility,locked,is_source_of_truth,created_by_agent,updated_at",
        )
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("path", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function readFileTool(projectId: string, supabase: AnySupabase) {
  return tool({
    description:
      "Read a project file by path. Returns null if the file does not exist or is soft-deleted.",
    inputSchema: z.object({ path: z.string().min(1) }),
    execute: async ({ path }) => {
      const { data, error } = await supabase
        .from("project_files")
        .select(
          "path,content,pinned,locked,is_source_of_truth,created_by_agent,updated_at",
        )
        .eq("project_id", projectId)
        .eq("path", path)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

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

function createFileTool(ctx: AgentToolContext, record: LibrarianRunRecord) {
  return tool({
    description:
      "Create a new project file at the given path. Fails if a live file already exists at that path. Use edit_file to update an existing file.",
    inputSchema: z.object({
      path: z.string().min(1),
      content: z.string(),
      reason: z
        .string()
        .min(3)
        .describe("Brief reason for creating this file (one sentence)."),
    }),
    execute: async ({ path, content, reason }) => {
      if (ctx.mode === "proposal") {
        record.actions.push({
          action: "create",
          path,
          details: { reason, proposed: true },
        });
        return { proposed: true, path };
      }

      const blocked = advisorWriteBlocked(ctx);
      if (blocked) return { error: blocked };

      if (!ctx.canCreateEntityPages && isEntityPath(path)) {
        return {
          error:
            "Entity page creation is disabled for this project (auto_create_entity_pages = false). Describe the entity inside an existing page instead.",
        };
      }

      try {
        const file = await createProjectFile({
          projectId: ctx.projectId,
          path,
          content,
          userId: ctx.userId,
          createdByAgent: true,
        });
        record.actions.push({ action: "create", path, details: { reason } });
        if (ctx.kind === "librarian") {
          await logLibrarianFileActivity(ctx, "create", path, file.id);
        } else {
          await logAdvisorFileActivity(ctx, {
            type: "agent_file_edit",
            path,
            isCreate: true,
            fileId: file.id,
          });
        }
        return { path: file.path, created_at: file.created_at, id: file.id };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  });
}

function editFileTool(ctx: AgentToolContext, record: LibrarianRunRecord) {
  return tool({
    description:
      "Overwrite the content of a project file at the given path. Creates the file if it does not exist or is soft-deleted. Rejects locked files. For source-of-truth files, pass confirm_source_of_truth: true to acknowledge the high-stakes edit. The background Librarian maintains index.md and log.md after chat turns — do not try to keep those in sync yourself from chat.",
    inputSchema: z.object({
      path: z.string().min(1),
      content: z.string(),
      reason: z
        .string()
        .min(3)
        .describe("Brief reason for this edit (one sentence)."),
      confirm_source_of_truth: z.boolean().optional(),
    }),
    execute: async ({ path, content, reason, confirm_source_of_truth }) => {
      const admin = createSupabaseAdminClient();
      const { data: existing } = await admin
        .from("project_files")
        .select("id, locked, is_source_of_truth, deleted_at")
        .eq("project_id", ctx.projectId)
        .eq("path", path)
        .maybeSingle();

      if (existing?.locked) {
        const who = ctx.kind === "advisor" ? "the agent" : "this tool";
        return { error: `File "${path}" is locked and cannot be edited by ${who}.` };
      }
      if (existing?.is_source_of_truth && !confirm_source_of_truth) {
        return {
          error: `File "${path}" is marked is_source_of_truth. Re-call edit_file with confirm_source_of_truth: true to overwrite it.`,
        };
      }

      if (ctx.mode === "proposal") {
        record.actions.push({
          action: "edit",
          path,
          details: { reason, proposed: true },
        });
        return { proposed: true, path };
      }

      const blocked = advisorWriteBlocked(ctx);
      if (blocked) return { error: blocked };

      try {
        const file = await editProjectFile({
          projectId: ctx.projectId,
          path,
          content,
          userId: ctx.userId,
          createdByAgent: !existing,
        });
        const wasCreate = !existing || Boolean(existing.deleted_at);
        record.actions.push({
          action: wasCreate ? "create" : "edit",
          path,
          details: { reason },
        });
        if (ctx.kind === "librarian") {
          await logLibrarianFileActivity(
            ctx,
            wasCreate ? "create" : "edit",
            path,
            file.id,
          );
        } else {
          await logAdvisorFileActivity(ctx, {
            type: "agent_file_edit",
            path,
            isCreate: wasCreate,
            fileId: file.id,
          });
        }
        return {
          path: file.path,
          updated_at: file.updated_at,
          created: wasCreate,
        };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  });
}

function renameFileTool(ctx: AgentToolContext, record: LibrarianRunRecord) {
  return tool({
    description:
      "Rename / move a project file from one path to another. Version history is preserved.",
    inputSchema: z.object({
      from: z.string().min(1),
      to: z.string().min(1),
      reason: z.string().min(3),
    }),
    execute: async ({ from, to, reason }) => {
      if (ctx.mode === "proposal") {
        record.actions.push({
          action: "rename",
          path: from,
          details: { to, reason, proposed: true },
        });
        return { proposed: true, from, to };
      }

      const blocked = advisorWriteBlocked(ctx);
      if (blocked) return { error: blocked };

      try {
        const file = await renameProjectFile({
          projectId: ctx.projectId,
          fromPath: from,
          toPath: to,
          userId: ctx.userId,
        });
        record.actions.push({
          action: "rename",
          path: to,
          details: { from, reason },
        });
        if (ctx.kind === "librarian") {
          await logLibrarianFileActivity(ctx, "rename", `${from} -> ${to}`, file.id);
        } else {
          await logAdvisorFileActivity(ctx, {
            type: "agent_file_rename",
            from,
            to,
            fileId: file.id,
          });
        }
        return { from, to: file.path, updated_at: file.updated_at };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  });
}

function deleteFileTool(ctx: AgentToolContext, record: LibrarianRunRecord) {
  return tool({
    description:
      "Soft-delete a project file. Locked and source-of-truth files are rejected. Version history is preserved; the file can be recreated at the same path later.",
    inputSchema: z.object({
      path: z.string().min(1),
      reason: z.string().min(3),
    }),
    execute: async ({ path, reason }) => {
      const admin = createSupabaseAdminClient();
      const { data: existing } = await admin
        .from("project_files")
        .select("id, locked, is_source_of_truth, deleted_at")
        .eq("project_id", ctx.projectId)
        .eq("path", path)
        .maybeSingle();

      if (!existing || existing.deleted_at) {
        return { error: `File "${path}" does not exist.` };
      }
      if (existing.locked) {
        return { error: `File "${path}" is locked and cannot be deleted.` };
      }
      if (existing.is_source_of_truth) {
        return {
          error: `File "${path}" is marked is_source_of_truth. Source-of-truth files cannot be deleted from this agent.`,
        };
      }

      if (ctx.mode === "proposal") {
        record.actions.push({
          action: "delete",
          path,
          details: { reason, proposed: true },
        });
        return { proposed: true, path };
      }

      const blocked = advisorWriteBlocked(ctx);
      if (blocked) return { error: blocked };

      try {
        const file = await deleteProjectFile({
          projectId: ctx.projectId,
          path,
          userId: ctx.userId,
        });
        record.actions.push({ action: "delete", path, details: { reason } });
        if (ctx.kind === "librarian") {
          await logLibrarianFileActivity(ctx, "delete", path, file.id);
        } else {
          await logAdvisorFileActivity(ctx, {
            type: "agent_file_delete",
            path,
            fileId: file.id,
          });
        }
        return { path, deleted_at: file.deleted_at };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  });
}

function recordSuggestionTool(ctx: AgentToolContext, record: LibrarianRunRecord) {
  return tool({
    description:
      "Record a forward-looking suggestion surfaced to the user (question to investigate, source to find, or fix). Do NOT use this for file changes — use the file tools. In chat, use sparingly for substantive follow-ups; the Librarian uses this heavily during wiki_lint runs.",
    inputSchema: z.object({
      kind: z.enum(["question", "source", "fix"]),
      title: z.string().min(3),
      rationale: z.string().optional(),
    }),
    execute: async ({ kind, title, rationale }) => {
      record.suggestions.push({ kind, title, rationale });
      const admin = createSupabaseAdminClient();
      if (ctx.kind === "librarian") {
        await admin.from("activity_events").insert({
          project_id: ctx.projectId,
          event_type: "librarian_suggestion",
          summary: `[${kind}] ${title}`,
          actor_id: ctx.userId,
          target_type: "librarian_run",
          target_id: ctx.runId,
          metadata: {
            run_id: ctx.runId,
            kind,
            title,
            rationale: rationale ?? null,
          },
        });
      } else {
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
      }
      return { recorded: true };
    },
  });
}

function triggerWikiLintTool(ctx: AgentToolContext) {
  return tool({
    description:
      "Kick off a background Librarian run that performs a wiki health check (stale content, contradictions, orphan pages, missing entity pages, index gaps). Use whenever the user asks to lint, curate, audit, or health-check the wiki. If they state a factual correction (e.g. two stakeholder files are the same person, merge duplicates), put their exact words in `focus` so the Librarian treats it as authoritative — do not weaken it into 'check if they might be duplicates'. The lint runs asynchronously; tell the user it's running and they'll see results in the Files view and activity feed. Do not perform the lint yourself. Returns an error if invoked during a background Librarian run — ignore it there.",
    inputSchema: z.object({
      focus: z
        .string()
        .min(1)
        .max(500)
        .optional()
        .describe(
          "Optional. Either a scope to check (e.g. 'decisions.md', 'stakeholder pages') or the user's verbatim factual correction (e.g. 'stakeholders/a.md and stakeholders/b.md are the same person — merge').",
        ),
    }),
    execute: async ({ focus }) => {
      if (ctx.kind === "librarian") {
        return {
          error:
            "Wiki lint can only be triggered from chat. Ignore this tool during background Librarian runs.",
        };
      }

      if (!ctx.canWrite) {
        return {
          error:
            "You have viewer access to this project. Librarian runs require write access.",
        };
      }
      after(async () => {
        try {
          await triggerWikiLint({
            projectId: ctx.projectId,
            userId: ctx.userId,
            userFocus: focus,
          });
        } catch (err) {
          console.error("Chat-triggered wiki lint failed", err);
        }
      });
      return {
        started: true,
        focus: focus ?? null,
        message:
          "Wiki lint started in the background. It typically finishes within a minute — the Librarian will update log.md and post an activity event with its findings and suggestions.",
      };
    },
  });
}

/**
 * Full tool surface for both Advisor (chat) and Librarian (background).
 * Pass a discriminated `AgentToolContext` plus a mutable run record (proposal + summary).
 */
export function buildAgentTools(ctx: AgentToolContext, record: LibrarianRunRecord) {
  const admin = createSupabaseAdminClient();
  const sourceSupabase = ctx.kind === "advisor" ? ctx.userSupabase : admin;

  return {
    list_files: listFilesTool(ctx.projectId, admin),
    read_file: readFileTool(ctx.projectId, admin),
    create_file: createFileTool(ctx, record),
    edit_file: editFileTool(ctx, record),
    rename_file: renameFileTool(ctx, record),
    delete_file: deleteFileTool(ctx, record),
    search_sources: searchSourcesTool(ctx.projectId, sourceSupabase),
    read_source: readSourceTool(ctx.projectId, sourceSupabase),
    record_suggestion: recordSuggestionTool(ctx, record),
    trigger_wiki_lint: triggerWikiLintTool(ctx),
  } as const;
}

export function buildLibrarianTools(ctx: LibrarianToolContextInput, record: LibrarianRunRecord) {
  return buildAgentTools({ ...ctx, kind: "librarian" }, record);
}
