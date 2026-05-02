import { consumeStream, streamText, convertToModelMessages, UIMessage } from "ai";
import { after } from "next/server";
import { openai, type OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai";
import { z } from "zod";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { getProjectAccessForUser } from "@/lib/server/data";
import { applyAiChatTitleIfAuto } from "@/lib/server/chats/chat-title";
import {
  getOrCreateProjectConversation,
  replaceConversationMessages,
} from "@/lib/server/chat-history";
import { assembleProjectSystemPrompt } from "@/lib/server/chat-context";
import { triggerOnConversationEnded } from "@/lib/server/librarian/triggers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildAgentTools } from "@/lib/server/agent-tools";
import type { LibrarianRunRecord } from "@/lib/server/agent-tools";

export const maxDuration = 120;

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
  const userSupabase = await createSupabaseServerClient();
  const { system, toolMode, canCreateEntityPages } = await assembleProjectSystemPrompt(
    projectId,
    user.id,
  );
  const conversation = await getOrCreateProjectConversation(projectId, user.id, body.conversationId, body.messages);

  const advisorRecord: LibrarianRunRecord = { actions: [], suggestions: [] };

  void applyAiChatTitleIfAuto({
    conversationId: conversation.id,
    messages: body.messages,
  }).catch((err) => {
    console.error("AI chat title failed", err);
  });

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
    tools: buildAgentTools(
      {
        kind: "advisor",
        projectId,
        userId: user.id,
        conversationId: conversation.id,
        mode: toolMode,
        canWrite,
        canCreateEntityPages,
        userSupabase,
      },
      advisorRecord,
    ),
  });

  return result.toUIMessageStreamResponse({
    originalMessages: body.messages,
    consumeSseStream: consumeStream,
    sendReasoning: true,
    messageMetadata: ({ part }) => {
      if (part.type === "finish") {
        return {
          usage: {
            inputTokens: part.totalUsage?.inputTokens,
            outputTokens: part.totalUsage?.outputTokens,
            totalTokens: part.totalUsage?.totalTokens,
          },
        };
      }
    },
    onFinish: async ({ messages, isAborted, finishReason }) => {
      if (isAborted) {
        return;
      }

      try {
        await replaceConversationMessages(conversation.id, messages);
      } catch (error) {
        console.error("Failed to persist conversation history", error);
      }

      // Each /api/chat POST ends with onFinish. When the step finished on tool
      // calls, the client (sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls)
      // will send a follow-up request to continue the same user turn. Only run
      // the Librarian on the final step of the turn — when the model stopped
      // for a real reason ("stop" / "length" / "content-filter") and not
      // because it emitted tool calls awaiting results.
      if (finishReason === "tool-calls") {
        return;
      }

      after(async () => {
        try {
          await triggerOnConversationEnded({
            projectId,
            userId: user.id,
            conversationId: conversation.id,
          });
        } catch (err) {
          console.error("Librarian trigger on conversation end failed", err);
        }
      });
    },
  });
}
