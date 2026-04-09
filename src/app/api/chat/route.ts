import { consumeStream, streamText, tool, convertToModelMessages, UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { getProjectAccessForUser } from "@/lib/server/data";
import {
  getOrCreateProjectConversation,
  replaceConversationMessages,
} from "@/lib/server/chat-history";
import { assembleProjectSystemPrompt } from "@/lib/server/chat-context";
import { editProjectFile } from "@/lib/server/project-files";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

const schema = z.object({
  projectId: z.string().uuid(),
  messages: z.array(z.custom<UIMessage>()),
});

export async function POST(request: Request) {
  const body = schema.parse(await request.json());
  const user = await getOptionalSessionUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  if (!(await getProjectAccessForUser(user.id, body.projectId))) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  const projectId = body.projectId;
  const admin = createSupabaseAdminClient();
  const system = await assembleProjectSystemPrompt(projectId, user.id);
  const conversation = await getOrCreateProjectConversation(projectId, user.id, body.messages);

  const modelMessages = await convertToModelMessages(body.messages);

  const result = streamText({
    model: openai("gpt-4.1-mini"),
    system,
    messages: modelMessages,
    abortSignal: request.signal,
    tools: {
      list_files: tool({
        description: "List all project files for this project",
        inputSchema: z.object({}),
        execute: async () => {
          const { data, error } = await admin.from("project_files").select("path,updated_at").eq("project_id", projectId).order("path", { ascending: true });
          if (error) throw error;
          return data ?? [];
        },
      }),
      read_file: tool({
        description: "Read a project file by path",
        inputSchema: z.object({ path: z.string().min(1) }),
        execute: async ({ path }) => {
          const { data, error } = await admin.from("project_files").select("path,content,updated_at").eq("project_id", projectId).eq("path", path).maybeSingle();
          if (error) throw error;
          return data;
        },
      }),
      edit_file: tool({
        description: "Create or update a project file by path",
        inputSchema: z.object({ path: z.string().min(1), content: z.string() }),
        execute: async ({ path, content }) => {
          const file = await editProjectFile({ projectId, path, content, userId: user.id });
          await admin.from("activity_events").insert({ project_id: projectId, event_type: "agent_file_edit", summary: `Agent updated ${path}`, actor_id: user.id, target_type: "project_file", target_id: file.id });
          return file;
        },
      }),
      search_sources: tool({
        description: "Search source material chunks by keyword",
        inputSchema: z.object({ query: z.string().min(2) }),
        execute: async ({ query }) => {
          const { data, error } = await admin
            .from("source_chunks")
            .select("id,content,source_materials!inner(id,title,project_id)")
            .eq("source_materials.project_id", projectId)
            .textSearch("content", query, { type: "plain" })
            .limit(8);
          if (error) throw error;
          return data ?? [];
        },
      }),
      read_source: tool({
        description: "Read a full source material by ID",
        inputSchema: z.object({ sourceMaterialId: z.string().uuid() }),
        execute: async ({ sourceMaterialId }) => {
          const { data, error } = await admin.from("source_materials").select("id,title,type,summary,parsed_content,metadata").eq("id", sourceMaterialId).single();
          if (error) throw error;
          return data;
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse({
    originalMessages: body.messages,
    consumeSseStream: consumeStream,
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
