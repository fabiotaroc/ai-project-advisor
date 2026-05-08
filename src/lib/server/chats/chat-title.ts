import "server-only";

import { generateText } from "ai";
import type { UIMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { CHAT_TITLE_SYSTEM_PROMPT } from "@/lib/server/prompts/chat-title";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const TITLE_MODEL = "gpt-5.4-mini" as const;
const MAX_USER_SNIPPET = 8_000;
const MAX_TITLE_LENGTH = 100;

function getMessageText(message: UIMessage) {
  return message.parts
    .flatMap((part) => (part.type === "text" && part.text ? [part.text] : []))
    .join("\n\n")
    .trim();
}

/** Deterministic short label; must stay aligned with `shouldAutoUpdateConversationTitle` in chat-history. */
export function getHeuristicChatTitle(messages: UIMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  const text = firstUserMessage ? getMessageText(firstUserMessage) : "";

  if (!text) {
    return "New chat";
  }

  return text.length > 80 ? `${text.slice(0, 77).trimEnd()}...` : text;
}

/**
 * True when the row title is still the default or matches the one-line summary of `messages`
 * (so a generated name can replace it without clobbering a manual rename).
 */
export function isAutoChatTitleState(currentTitle: string, messages: UIMessage[]) {
  const t = currentTitle.trim();
  if (!t || t === "New chat" || t === "New conversation") {
    return true;
  }
  return t === getHeuristicChatTitle(messages);
}

function normalizeGeneratedTitle(raw: string) {
  const singleLine = raw.replace(/\s+/g, " ").trim();
  const noQuotes = singleLine.replace(/^["'«»]+|["'«»]+$/g, "").trim();
  if (!noQuotes) {
    return null;
  }
  return noQuotes.length > MAX_TITLE_LENGTH
    ? `${noQuotes.slice(0, Math.max(0, MAX_TITLE_LENGTH - 1)).trimEnd()}…`
    : noQuotes;
}

export async function generateChatTitleFromUserMessageText(userText: string): Promise<string> {
  const snippet = userText.trim().slice(0, MAX_USER_SNIPPET);
  if (!snippet) {
    return "New chat";
  }

  const { text } = await generateText({
    model: openai(TITLE_MODEL),
    system: CHAT_TITLE_SYSTEM_PROMPT,
    prompt: `User message (may be long):\n\n${snippet}`,
    maxOutputTokens: 48,
  });

  return (
    normalizeGeneratedTitle(text) ??
    (snippet.length > 80 ? `${snippet.slice(0, 77).trimEnd()}...` : snippet)
  );
}

/**
 * If the row is still auto-titled, generate an AI title and persist. Safe to call on every send; skips when
 * the name was manually edited or when no user text is present.
 */
export async function applyAiChatTitleIfAuto(params: { conversationId: string; messages: UIMessage[] }) {
  const { conversationId, messages } = params;
  const firstUser = messages.find((m) => m.role === "user");
  const userText = firstUser ? getMessageText(firstUser) : "";
  if (!userText) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { data: row, error } = await supabase
    .from("chats")
    .select("title")
    .eq("id", conversationId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!row?.title) {
    return;
  }

  if (!isAutoChatTitleState(row.title, messages)) {
    return;
  }

  const title = await generateChatTitleFromUserMessageText(userText);
  const { error: updateError } = await supabase
    .from("chats")
    .update({ title })
    .eq("id", conversationId)
    .eq("title", row.title);

  if (updateError) {
    throw updateError;
  }
}
