import "server-only";

// Used by generateChatTitleFromUserMessageText in src/lib/server/chats/chat-title.ts.
export const CHAT_TITLE_SYSTEM_PROMPT =
  "You label chat threads. Reply with a very short title (3–7 words) that captures the user's main topic or request. " +
  "No quotes, colons, or trailing punctuation. No emojis. Use plain language, sentence case. " +
  "If the text is a greeting or empty noise, use a generic label like 'Chat'.";
