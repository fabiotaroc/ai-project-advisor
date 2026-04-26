import "server-only";

import type { UIMessage } from "ai";
import type { ProjectConversationListItem } from "@/lib/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  generateChatTitleFromUserMessageText,
  getHeuristicChatTitle,
} from "@/lib/server/chats/chat-title";

type ConversationRecord = {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  created_at: string;
};

type MessageRecord = {
  id: string;
  role: string;
  content: string;
  tool_calls: unknown;
  citations: unknown;
  created_at: string;
};

function toConversationRecord(
  data: ConversationRecord | ConversationRecord[] | null | undefined,
): ConversationRecord | null {
  if (!data) {
    return null;
  }

  return Array.isArray(data) ? (data[0] ?? null) : data;
}

function getMessageText(message: UIMessage) {
  return message.parts
    .flatMap((part) => (part.type === "text" && part.text ? [part.text] : []))
    .join("\n\n")
    .trim();
}

function getSerializedParts(message: UIMessage) {
  if (message.parts.length === 0) {
    return null;
  }

  return JSON.parse(JSON.stringify(message.parts)) as unknown[];
}

function toUIMessage(record: MessageRecord): UIMessage {
  const parts: UIMessage["parts"] = [];
  const storedParts = Array.isArray(record.tool_calls)
    ? (record.tool_calls as UIMessage["parts"])
    : [];
  const storedHasText = storedParts.some(
    (part) => part.type === "text" && typeof (part as { text?: unknown }).text === "string",
  );

  if (storedParts.length > 0) {
    parts.push(...storedParts);
  }

  if (!storedHasText && record.content) {
    parts.push({ type: "text", text: record.content });
  }

  if (parts.length === 0) {
    parts.push({ type: "text", text: "" });
  }

  return {
    id: record.id,
    role: record.role as UIMessage["role"],
    parts,
  };
}

export async function listProjectConversations(
  projectId: string,
  userId: string,
): Promise<ProjectConversationListItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("chats")
    .select("id,title,created_at")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  const chats = (data ?? []) as { id: string; title: string; created_at: string }[];
  if (chats.length === 0) return [];

  const ids = chats.map((c) => c.id);
  const { data: lastRows, error: lastError } = await supabase.rpc("chat_last_message_times", {
    p_conversation_ids: ids,
  });

  if (lastError) {
    throw lastError;
  }

  const lastById = new Map(
    (lastRows as { conversation_id: string; last_message_at: string }[] | null | undefined)?.map(
      (row) => [row.conversation_id, row.last_message_at] as const,
    ) ?? [],
  );

  return chats
    .map((c) => {
      const lastMsg = lastById.get(c.id);
      const lastActivity =
        lastMsg && new Date(lastMsg) > new Date(c.created_at) ? lastMsg : c.created_at;
      return { ...c, last_activity_at: lastActivity };
    })
    .sort((a, b) => (a.last_activity_at < b.last_activity_at ? 1 : -1));
}

export async function getLatestConversation(projectId: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("chats")
    .select("id,project_id,user_id,title,created_at")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as ConversationRecord | null) ?? null;
}

export async function getConversationForUser(conversationId: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("chats")
    .select("id,project_id,user_id,title,created_at")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return toConversationRecord(data);
}

export async function getConversationWithMessages(
  projectId: string,
  userId: string,
  conversationId: string,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("chats")
    .select("id,project_id,user_id,title,created_at")
    .eq("id", conversationId)
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const messages = await getConversationMessages(conversationId);

  return {
    conversation: data as ConversationRecord,
    messages,
  };
}

export async function getConversationMessages(conversationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("messages")
    .select("id,role,content,tool_calls,citations,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as MessageRecord[]).map(toUIMessage);
}

export async function getLatestConversationWithMessages(projectId: string, userId: string) {
  const conversation = await getLatestConversation(projectId, userId);

  if (!conversation) {
    return null;
  }

  const messages = await getConversationMessages(conversation.id);

  return {
    conversation,
    messages,
  };
}

export async function createConversation(projectId: string, userId: string, title = "New chat") {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("chats")
    .insert({ project_id: projectId, user_id: userId, title })
    .select("id,project_id,user_id,title,created_at")
    .single();

  if (error) throw error;
  return data as ConversationRecord;
}

export async function renameConversation(conversationId: string, title: string) {
  const supabase = createSupabaseAdminClient();
  const trimmedTitle = title.trim();
  const { data, error } = await supabase
    .from("chats")
    .update({ title: trimmedTitle })
    .eq("id", conversationId)
    .select("id,project_id,user_id,title,created_at")
    .single();

  if (error) throw error;
  return data as ConversationRecord;
}

export async function deleteConversation(conversationId: string) {
  const supabase = createSupabaseAdminClient();

  const { error: deleteMessagesError } = await supabase
    .from("messages")
    .delete()
    .eq("conversation_id", conversationId);

  if (deleteMessagesError) {
    throw deleteMessagesError;
  }

  const { error: deleteConversationError } = await supabase
    .from("chats")
    .delete()
    .eq("id", conversationId);

  if (deleteConversationError) {
    throw deleteConversationError;
  }
}

async function shouldAutoUpdateConversationTitle(conversationId: string) {
  const supabase = createSupabaseAdminClient();
  const [{ data: conversation, error: conversationError }, { data: messages, error: messagesError }] =
    await Promise.all([
      supabase
        .from("chats")
        .select("id,project_id,user_id,title,created_at")
        .eq("id", conversationId)
        .maybeSingle(),
      supabase
        .from("messages")
        .select("id,role,content,tool_calls,citations,created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true }),
    ]);

  if (conversationError) {
    throw conversationError;
  }

  if (messagesError) {
    throw messagesError;
  }

  const currentConversation = toConversationRecord(conversation);
  const currentTitle = currentConversation?.title.trim() ?? "";

  if (!currentTitle || currentTitle === "New chat" || currentTitle === "New conversation") {
    return true;
  }

  const generatedTitle = getHeuristicChatTitle(((messages ?? []) as MessageRecord[]).map(toUIMessage));
  return currentTitle === generatedTitle;
}

export async function getOrCreateProjectConversation(
  projectId: string,
  userId: string,
  conversationId?: string,
  seedMessages: UIMessage[] = [],
) {
  if (conversationId) {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("chats")
      .select("id,project_id,user_id,title,created_at")
      .eq("id", conversationId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (data) return data as ConversationRecord;
  }

  const existing = await getLatestConversation(projectId, userId);
  if (existing) return existing;

  return createConversation(projectId, userId, getHeuristicChatTitle(seedMessages));
}

export async function replaceConversationMessages(conversationId: string, messages: UIMessage[]) {
  const supabase = createSupabaseAdminClient();
  const shouldUpdateTitle = await shouldAutoUpdateConversationTitle(conversationId);

  const { error: deleteError } = await supabase.from("messages").delete().eq("conversation_id", conversationId);

  if (deleteError) {
    throw deleteError;
  }

  if (messages.length > 0) {
    const startedAt = Date.now();
    const rows = messages.map((message, index) => ({
      conversation_id: conversationId,
      role: message.role === "user" || message.role === "assistant" || message.role === "system" ? message.role : "assistant",
      content: getMessageText(message),
      tool_calls: getSerializedParts(message),
      citations: null,
      created_at: new Date(startedAt + index).toISOString(),
    }));

    const { error: insertError } = await supabase.from("messages").insert(rows);

    if (insertError) {
      throw insertError;
    }
  }

  if (shouldUpdateTitle) {
    const firstUser = messages.find((m) => m.role === "user");
    const userText = firstUser ? getMessageText(firstUser) : "";
    const nextTitle = userText ? await generateChatTitleFromUserMessageText(userText) : "New chat";
    const { error: updateError } = await supabase
      .from("chats")
      .update({ title: nextTitle })
      .eq("id", conversationId);

    if (updateError) {
      throw updateError;
    }
  }
}
