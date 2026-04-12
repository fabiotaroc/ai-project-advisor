import "server-only";

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { editProjectFile } from "@/lib/server/project-files";

/**
 * Append a markdown entry to today's memory file, creating it if needed.
 * Shared by both ingestion synthesis and conversation memory.
 */
export async function appendMemoryEntry({
  projectId,
  userId,
  heading,
  body,
  date = new Date().toISOString().split("T")[0],
}: {
  projectId: string;
  userId: string;
  heading: string;
  body: string;
  date?: string;
}) {
  const admin = createSupabaseAdminClient();
  const memoryPath = `memory-${date}.md`;

  const { data: existing } = await admin
    .from("project_files")
    .select("id,content")
    .eq("project_id", projectId)
    .eq("path", memoryPath)
    .maybeSingle();

  const entry = `## ${heading}\n${body}\n\n`;

  if (existing) {
    await editProjectFile({
      projectId,
      path: memoryPath,
      content: existing.content + entry,
      userId,
      createdByAgent: true,
    });
  } else {
    const header = `# ${date}\n\n`;
    await editProjectFile({
      projectId,
      path: memoryPath,
      content: header + entry,
      userId,
      createdByAgent: true,
    });
  }
}

type MessageForMemory = {
  role: string;
  content: string;
};

/**
 * Generate a structured memory summary from a conversation transcript.
 * Uses a dedicated summarization agent (not the main chat model) to produce
 * the same format as the leadabeelity harness memory files.
 */
export async function generateConversationMemory({
  projectId,
  userId,
  conversationTitle,
  messages,
}: {
  projectId: string;
  userId: string;
  conversationTitle: string;
  messages: MessageForMemory[];
}) {
  if (messages.length < 2) return;

  const transcript = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => `${m.role === "user" ? "User" : "Advisor"}: ${m.content}`)
    .join("\n\n");

  const snippet = transcript.slice(0, 12_000);

  const { text: memoryContent } = await generateText({
    model: openai("gpt-4.1-mini"),
    system: [
      "You are a project memory agent. Given a conversation between a user and an AI project advisor, produce a concise session summary.",
      "Output plain markdown with these sections. Omit a section entirely if nothing applies.",
      "",
      "## Session Notes",
      "A bullet list of the key things that happened, decisions made, information learned, or actions taken.",
      "Write from a neutral third-person perspective (e.g. 'Discussed X', 'Decided Y', 'Updated Z').",
      "Be specific and concrete — names, dates, file paths, and facts. No filler.",
      "",
      "## Follow-Ups",
      "A bullet list of open tasks, next steps, or things to revisit. Only include if there are clear follow-ups.",
      "",
      "Do NOT include a top-level heading (the caller adds one).",
      "Do NOT wrap the output in code fences.",
      "Keep the total output under 400 words.",
    ].join("\n"),
    prompt: `Conversation: "${conversationTitle}"\n\n${snippet}`,
    maxOutputTokens: 600,
  });

  const trimmed = memoryContent.trim();
  if (!trimmed) return;

  await appendMemoryEntry({
    projectId,
    userId,
    heading: `Chat: ${conversationTitle}`,
    body: trimmed,
  });
}
