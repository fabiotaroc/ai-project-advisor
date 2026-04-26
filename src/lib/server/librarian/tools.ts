import "server-only";

import { embed, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createProjectFile,
  deleteProjectFile,
  editProjectFile,
  renameProjectFile,
} from "@/lib/server/project-files";

const ENTITY_PAGE_PREFIXES = ["stakeholders/", "entities/", "people/"];

export type LibrarianMode = "write" | "proposal";

export type LibrarianToolContext = {
  projectId: string;
  userId: string;
  runId: string;
  mode: LibrarianMode;
  canCreateEntityPages: boolean;
};

type LibrarianActionLog = {
  action: "create" | "edit" | "rename" | "delete";
  path: string;
  details?: Record<string, unknown>;
};

export type LibrarianRunRecord = {
  actions: LibrarianActionLog[];
  suggestions: LibrarianSuggestion[];
};

export type LibrarianSuggestion = {
  kind: "question" | "source" | "fix";
  title: string;
  rationale?: string;
};

function isEntityPath(path: string): boolean {
  return ENTITY_PAGE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

async function logFileActivity(
  ctx: LibrarianToolContext,
  action: LibrarianActionLog["action"],
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

export function buildLibrarianTools(
  ctx: LibrarianToolContext,
  record: LibrarianRunRecord,
) {
  const admin = createSupabaseAdminClient();

  return {
    list_files: tool({
      description:
        "List all live project files with display metadata. Use this at the start of a run to see what exists.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data, error } = await admin
          .from("project_files")
          .select(
            "path,pinned,visibility,locked,is_source_of_truth,created_by_agent,updated_at",
          )
          .eq("project_id", ctx.projectId)
          .is("deleted_at", null)
          .order("path", { ascending: true });
        if (error) throw error;
        return data ?? [];
      },
    }),
    read_file: tool({
      description:
        "Read a project file by path. Returns null if the file does not exist or is soft-deleted.",
      inputSchema: z.object({ path: z.string().min(1) }),
      execute: async ({ path }) => {
        const { data, error } = await admin
          .from("project_files")
          .select(
            "path,content,pinned,locked,is_source_of_truth,created_by_agent,updated_at",
          )
          .eq("project_id", ctx.projectId)
          .eq("path", path)
          .is("deleted_at", null)
          .maybeSingle();
        if (error) throw error;
        return data;
      },
    }),
    create_file: tool({
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
          record.actions.push({ action: "create", path, details: { reason, proposed: true } });
          return { proposed: true, path };
        }
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
          await logFileActivity(ctx, "create", path, file.id);
          return { path: file.path, created_at: file.created_at, id: file.id };
        } catch (err) {
          return { error: err instanceof Error ? err.message : String(err) };
        }
      },
    }),
    edit_file: tool({
      description:
        "Overwrite the content of a project file at the given path. Rejects locked files. For source-of-truth files, pass confirm_source_of_truth: true to acknowledge the high-stakes edit.",
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
        const { data: existing } = await admin
          .from("project_files")
          .select("id, locked, is_source_of_truth, deleted_at")
          .eq("project_id", ctx.projectId)
          .eq("path", path)
          .maybeSingle();

        if (existing?.locked) {
          return { error: `File "${path}" is locked and cannot be edited.` };
        }
        if (existing?.is_source_of_truth && !confirm_source_of_truth) {
          return {
            error: `File "${path}" is marked is_source_of_truth. Re-call edit_file with confirm_source_of_truth: true to overwrite it.`,
          };
        }

        if (ctx.mode === "proposal") {
          record.actions.push({ action: "edit", path, details: { reason, proposed: true } });
          return { proposed: true, path };
        }

        try {
          const file = await editProjectFile({
            projectId: ctx.projectId,
            path,
            content,
            userId: ctx.userId,
            createdByAgent: !existing,
          });
          const wasCreate = !existing || existing.deleted_at;
          record.actions.push({
            action: wasCreate ? "create" : "edit",
            path,
            details: { reason },
          });
          await logFileActivity(ctx, wasCreate ? "create" : "edit", path, file.id);
          return {
            path: file.path,
            updated_at: file.updated_at,
            created: wasCreate,
          };
        } catch (err) {
          return { error: err instanceof Error ? err.message : String(err) };
        }
      },
    }),
    rename_file: tool({
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
          await logFileActivity(ctx, "rename", `${from} -> ${to}`, file.id);
          return { from, to: file.path, updated_at: file.updated_at };
        } catch (err) {
          return { error: err instanceof Error ? err.message : String(err) };
        }
      },
    }),
    delete_file: tool({
      description:
        "Soft-delete a project file. Locked and source-of-truth files are rejected. Version history is preserved; the file can be recreated at the same path later.",
      inputSchema: z.object({
        path: z.string().min(1),
        reason: z.string().min(3),
      }),
      execute: async ({ path, reason }) => {
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
            error: `File "${path}" is marked is_source_of_truth. Source-of-truth files are never deleted by the Librarian.`,
          };
        }

        if (ctx.mode === "proposal") {
          record.actions.push({ action: "delete", path, details: { reason, proposed: true } });
          return { proposed: true, path };
        }

        try {
          const file = await deleteProjectFile({
            projectId: ctx.projectId,
            path,
            userId: ctx.userId,
          });
          record.actions.push({ action: "delete", path, details: { reason } });
          await logFileActivity(ctx, "delete", path, file.id);
          return { path, deleted_at: file.deleted_at };
        } catch (err) {
          return { error: err instanceof Error ? err.message : String(err) };
        }
      },
    }),
    search_sources: tool({
      description:
        "Semantic search across ingested source material chunks. Use returned source_material_id values with read_source.",
      inputSchema: z.object({ query: z.string().min(2) }),
      execute: async ({ query }) => {
        const { embedding: queryEmbedding } = await embed({
          model: openai.embedding("text-embedding-3-small"),
          value: query,
        });

        const { data, error } = await admin.rpc("match_source_chunks", {
          p_project_id: ctx.projectId,
          p_query_embedding: JSON.stringify(queryEmbedding) as unknown as string,
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
        const { data: sources } = await admin
          .from("source_materials")
          .select("id,title")
          .in("id", sourceIds);

        const titleMap = new Map(
          (sources ?? []).map((s) => [s.id, s.title] as const),
        );

        return data.map(
          (chunk: {
            chunk_id: string;
            source_material_id: string;
            content: string;
            similarity: number;
          }) => ({
            chunk_id: chunk.chunk_id,
            source_material_id: chunk.source_material_id,
            source_title: titleMap.get(chunk.source_material_id) ?? "Unknown",
            content: chunk.content,
            similarity: chunk.similarity,
          }),
        );
      },
    }),
    read_source: tool({
      description:
        "Read a full source material by id. Call this only with a sourceMaterialId returned by search_sources.",
      inputSchema: z.object({ sourceMaterialId: z.string().uuid() }),
      execute: async ({ sourceMaterialId }) => {
        const { data, error } = await admin
          .from("source_materials")
          .select("id,title,type,summary,parsed_content,metadata,created_at")
          .eq("project_id", ctx.projectId)
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
    }),
    record_suggestion: tool({
      description:
        "Record a forward-looking suggestion surfaced to the user. Use for lint runs to propose questions to investigate or sources to find. Do NOT use this for file changes — use the file tools for those.",
      inputSchema: z.object({
        kind: z.enum(["question", "source", "fix"]),
        title: z.string().min(3),
        rationale: z.string().optional(),
      }),
      execute: async ({ kind, title, rationale }) => {
        record.suggestions.push({ kind, title, rationale });
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
        return { recorded: true };
      },
    }),
  } as const;
}
