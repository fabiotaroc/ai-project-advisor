import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runLibrarian, type LibrarianRunResult } from "@/lib/server/librarian/agent";

/**
 * Run the Librarian in response to a newly ingested source.
 * Pulls the source's title, summary, and a content excerpt as trigger context.
 */
export async function triggerOnSourceIngested({
  projectId,
  userId,
  sourceId,
}: {
  projectId: string;
  userId: string;
  sourceId: string;
}): Promise<LibrarianRunResult | null> {
  const admin = createSupabaseAdminClient();
  const { data: source } = await admin
    .from("source_materials")
    .select("id,title,summary,parsed_content,project_id")
    .eq("id", sourceId)
    .maybeSingle();

  if (!source || source.project_id !== projectId) {
    return null;
  }

  const excerpt = (source.parsed_content ?? "").slice(0, 6000);

  return runLibrarian({
    projectId,
    userId,
    trigger: {
      type: "source_ingested",
      sourceId: source.id,
      sourceTitle: source.title,
      sourceSummary: source.summary,
      sourceExcerpt: excerpt,
    },
  });
}

/**
 * Run the Librarian in response to a finished conversation.
 * Pulls a transcript of the conversation (user + assistant text parts)
 * and lets the agent decide between memory-only vs promoting a wiki page.
 */
export async function triggerOnConversationEnded({
  projectId,
  userId,
  conversationId,
}: {
  projectId: string;
  userId: string;
  conversationId: string;
}): Promise<LibrarianRunResult | null> {
  const admin = createSupabaseAdminClient();

  const { data: conversation } = await admin
    .from("chats")
    .select("id,title,project_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation || conversation.project_id !== projectId) {
    return null;
  }

  const { data: messages } = await admin
    .from("messages")
    .select("role,content,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const textMessages = (messages ?? []).filter(
    (m) => (m.role === "user" || m.role === "assistant") && m.content?.trim(),
  );
  if (textMessages.length < 2) return null;

  const transcript = textMessages
    .map((m) => `${m.role === "user" ? "User" : "Advisor"}: ${m.content.trim()}`)
    .join("\n\n")
    .slice(0, 14_000);

  return runLibrarian({
    projectId,
    userId,
    trigger: {
      type: "conversation_ended",
      conversationId,
      conversationTitle: conversation.title,
      transcript,
    },
  });
}

/**
 * Run the Librarian as an on-demand wiki-lint pass.
 */
export async function triggerWikiLint({
  projectId,
  userId,
  userFocus,
}: {
  projectId: string;
  userId: string;
  userFocus?: string;
}): Promise<LibrarianRunResult> {
  return runLibrarian({
    projectId,
    userId,
    trigger: {
      type: "wiki_lint",
      userFocus,
    },
  });
}
