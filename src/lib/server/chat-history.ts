import "server-only";

import type { UIMessage } from "ai";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

function getMessageText(message: UIMessage) {
  return message.parts
    .flatMap((part) => (part.type === "text" && part.text ? [part.text] : []))
    .join("\n\n")
    .trim();
}

function getSerializedExtraParts(message: UIMessage) {
  const extraParts = message.parts.filter((part) => part.type !== "text");

  if (extraParts.length === 0) {
    return null;
  }

  return JSON.parse(JSON.stringify(extraParts)) as unknown[];
}

function getConversationTitle(messages: UIMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  const text = firstUserMessage ? getMessageText(firstUserMessage) : "";

  if (!text) {
    return "New conversation";
  }

  return text.length > 80 ? `${text.slice(0, 77).trimEnd()}...` : text;
}

function toUIMessage(record: MessageRecord): UIMessage {
  const parts: UIMessage["parts"] = [];

  if (record.content) {
    parts.push({ type: "text", text: record.content });
  }

  if (Array.isArray(record.tool_calls)) {
    parts.push(...(record.tool_calls as UIMessage["parts"]));
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

export async function listProjectConversations(projectId: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("id,title,created_at")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as { id: string; title: string; created_at: string }[];
}

export async function getLatestConversation(projectId: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("conversations")
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

export async function getConversationWithMessages(
  projectId: string,
  userId: string,
  conversationId: string,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("conversations")
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

export async function createConversation(projectId: string, userId: string, title = "New conversation") {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("conversations")
    .insert({ project_id: projectId, user_id: userId, title })
    .select("id,project_id,user_id,title,created_at")
    .single();

  if (error) throw error;
  return data as ConversationRecord;
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
      .from("conversations")
      .select("id,project_id,user_id,title,created_at")
      .eq("id", conversationId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (data) return data as ConversationRecord;
  }

  const existing = await getLatestConversation(projectId, userId);
  if (existing) return existing;

  return createConversation(projectId, userId, getConversationTitle(seedMessages));
}

export async function replaceConversationMessages(conversationId: string, messages: UIMessage[]) {
  const supabase = createSupabaseAdminClient();

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
      tool_calls: getSerializedExtraParts(message),
      citations: null,
      created_at: new Date(startedAt + index).toISOString(),
    }));

    const { error: insertError } = await supabase.from("messages").insert(rows);

    if (insertError) {
      throw insertError;
    }
  }

  const { error: updateError } = await supabase
    .from("conversations")
    .update({ title: getConversationTitle(messages) })
    .eq("id", conversationId);

  if (updateError) {
    throw updateError;
  }
}
