import { consumeStream, embed, streamText, tool, convertToModelMessages, UIMessage } from "ai";
import { openai, type OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai";
import { z } from "zod";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { getProjectAccessForUser } from "@/lib/server/data";
import {
  getOrCreateProjectConversation,
  replaceConversationMessages,
} from "@/lib/server/chat-history";
import { assembleProjectSystemPrompt } from "@/lib/server/chat-context";
import { editProjectFile } from "@/lib/server/project-files";
import { generateConversationMemory } from "@/lib/server/memory";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MEMORY_TOKEN_THRESHOLD = 800_000;

export const maxDuration = 60;

const schema = z.object({
  projectId: z.string().uuid(),
  conversationId: z.string().uuid().optional(),
  messages: z.array(z.custom<UIMessage>()),
});

export async function POST(request: Request) {
  const body = schema.parse(await request.json());
  const user = await getOptionalSessionUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const access = await getProjectAccessForUser(user.id, body.projectId);
  if (!access) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  const projectId = body.projectId;
  const canWrite = access.role !== "viewer";
  const admin = createSupabaseAdminClient();
  const userSupabase = await createSupabaseServerClient();
  const system = await assembleProjectSystemPrompt(projectId, user.id);
  const conversation = await getOrCreateProjectConversation(projectId, user.id, body.conversationId, body.messages);

  const modelMessages = await convertToModelMessages(body.messages);

  const result = streamText({
    model: openai("gpt-5.4"),
    system,
    messages: modelMessages,
    abortSignal: request.signal,
    providerOptions: {
      openai: {
        reasoningEffort: "medium",
        reasoningSummary: "auto",
      } satisfies OpenAILanguageModelResponsesOptions,
    },
    tools: {
      list_files: tool({
        description: "List all project files with display metadata",
        inputSchema: z.object({}),
        execute: async () => {
          const { data, error } = await admin
            .from("project_files")
            .select("path,pinned,visibility,locked,is_source_of_truth,created_by_agent,updated_at")
            .eq("project_id", projectId)
            .order("path", { ascending: true });
          if (error) throw error;
          return data ?? [];
        },
      }),
      read_file: tool({
        description: "Read a project file by path",
        inputSchema: z.object({ path: z.string().min(1) }),
        execute: async ({ path }) => {
          const { data, error } = await admin
            .from("project_files")
            .select("path,content,pinned,locked,is_source_of_truth,updated_at")
            .eq("project_id", projectId)
            .eq("path", path)
            .maybeSingle();
          if (error) throw error;
          return data;
        },
      }),
      edit_file: tool({
        description: "Create or update a project file by path. Locked files cannot be edited.",
        inputSchema: z.object({ path: z.string().min(1), content: z.string() }),
        execute: async ({ path, content }) => {
          if (!canWrite) {
            return { error: "You have viewer access to this project. File edits are not allowed." };
          }

          const { data: existing } = await admin
            .from("project_files")
            .select("id,locked")
            .eq("project_id", projectId)
            .eq("path", path)
            .maybeSingle();

          if (existing?.locked) {
            return { error: `File "${path}" is locked and cannot be edited by the agent.` };
          }

          const isNewFile = !existing;

          const file = await editProjectFile({
            projectId,
            path,
            content,
            userId: user.id,
            createdByAgent: isNewFile,
          });

          if (isNewFile && path !== "index.md") {
            const { data: indexFile } = await admin
              .from("project_files")
              .select("id,content")
              .eq("project_id", projectId)
              .eq("path", "index.md")
              .maybeSingle();

            if (indexFile) {
              await admin
                .from("project_files")
                .update({
                  content: indexFile.content.trimEnd() + `\n- ${path} — (summary pending)\n`,
                })
                .eq("id", indexFile.id);
            }
          }

          await admin.from("activity_events").insert({
            project_id: projectId,
            event_type: "agent_file_edit",
            summary: `Agent ${isNewFile ? "created" : "updated"} ${path}`,
            actor_id: user.id,
            target_type: "project_file",
            target_id: file.id,
          });

          return { path: file.path, updated_at: file.updated_at, created: isNewFile };
        },
      }),
      search_sources: tool({
        description: "Semantic search across ingested source material chunks. Use returned source ids with read_source.",
        inputSchema: z.object({ query: z.string().min(2) }),
        execute: async ({ query }) => {
          const { embedding: queryEmbedding } = await embed({
            model: openai.embedding("text-embedding-3-small"),
            value: query,
          });

          const { data, error } = await userSupabase.rpc("match_source_chunks", {
            p_project_id: projectId,
            p_query_embedding: queryEmbedding,
            p_match_count: 8,
          });

          if (error) throw error;
          if (!data?.length) return [];

          const sourceIds = [...new Set(data.map((d: { source_material_id: string }) => d.source_material_id))];
          const { data: sources } = await userSupabase
            .from("source_materials")
            .select("id,title")
            .in("id", sourceIds);

          const titleMap = new Map((sources ?? []).map((s) => [s.id, s.title]));

          return data.map((chunk: { chunk_id: string; source_material_id: string; content: string; similarity: number }) => ({
            chunk_id: chunk.chunk_id,
            source_material_id: chunk.source_material_id,
            source_title: titleMap.get(chunk.source_material_id) ?? "Unknown",
            content: chunk.content,
            similarity: chunk.similarity,
          }));
        },
      }),
      read_source: tool({
        description:
          "Read a full source material by ID. Only call this with a sourceMaterialId returned by search_sources.",
        inputSchema: z.object({ sourceMaterialId: z.string().uuid() }),
        execute: async ({ sourceMaterialId }) => {
          const { data, error } = await userSupabase
            .from("source_materials")
            .select("id,title,type,summary,parsed_content,metadata")
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
      }),
    },
    onFinish: async ({ totalUsage }) => {
      if ((totalUsage.totalTokens ?? 0) < MEMORY_TOKEN_THRESHOLD) return;

      try {
        const allMessages = body.messages.map((m) => ({
          role: m.role,
          content: m.parts
            .flatMap((p) => (p.type === "text" && p.text ? [p.text] : []))
            .join("\n\n"),
        }));

        await generateConversationMemory({
          projectId,
          userId: user.id,
          conversationTitle: conversation.title,
          messages: allMessages,
        });
      } catch (err) {
        console.error("Auto memory generation failed", err);
      }
    },
  });

  return result.toUIMessageStreamResponse({
    originalMessages: body.messages,
    consumeSseStream: consumeStream,
    sendReasoning: true,
    onFinish: async ({ messages, isAborted }) => {
      if (isAborted) {
        return;
      }

      try {
        await replaceConversationMessages(conversation.id, messages);
      } catch (error) {
        console.error("Failed to persist conversation history", error);
      }
    },
  });
}
