import {
  CHAT_AGENT_CITATIONS_PROMPT,
  CHAT_AGENT_IDENTITY_PROMPT,
  CHAT_AGENT_TOOLS_PROMPT,
} from "@/lib/server/prompts/chat-agent";
import { formatCanonicalDocsForPrompt } from "@/lib/server/prompts/canonical-docs";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProjectSettings } from "@/lib/types";

export type AssembledChatPrompt = {
  system: string;
};

const advisorRunSystemPromptCache = new Map<string, AssembledChatPrompt>();

export async function assembleProjectSystemPrompt(
  projectId: string,
  userId: string,
  conversationId?: string,
): Promise<AssembledChatPrompt> {
  const currentDate = formatCurrentDateForPrompt();
  const cacheKey = conversationId
    ? `${projectId}:${userId}:${conversationId}:${currentDate.isoDate}`
    : null;
  if (cacheKey) {
    const cached = advisorRunSystemPromptCache.get(cacheKey);
    if (cached) return cached;
  }

  const supabase = await createSupabaseServerClient();

  const [
    { data: project },
    { data: settings },
    { data: profile },
    { data: member },
    { data: canonicalDocs },
  ] = await Promise.all([
    supabase.from("projects").select("name,owner_id").eq("id", projectId).single(),
    supabase.from("project_settings").select("*").eq("project_id", projectId).maybeSingle(),
    supabase.from("profiles").select("email,name").eq("id", userId).single(),
    supabase.from("project_members").select("role").eq("project_id", projectId).eq("user_id", userId).maybeSingle(),
    supabase
      .from("canonical_docs")
      .select("slug,title,body,is_default,is_pinned,updated_at")
      .eq("project_id", projectId),
  ]);

  const role = project?.owner_id === userId ? "owner" : (member?.role ?? "viewer");
  const projectSettings = settings as ProjectSettings | null;

  const parts: string[] = [];

  parts.push(CHAT_AGENT_IDENTITY_PROMPT);

  parts.push(`# Project: ${project?.name ?? "Unknown"}`);

  parts.push(
    [
      "# Current Date",
      `Today is ${currentDate.displayDate} (${currentDate.isoDate}).`,
      "Use this to resolve relative dates like today, yesterday, tomorrow, last week, and next month.",
    ].join("\n"),
  );

  parts.push(serializeSettings(projectSettings));

  parts.push(`# Current User\n${profile?.name ?? "Unknown"} (${profile?.email ?? ""}) — role: ${role}`);

  if (canonicalDocs && canonicalDocs.length > 0) {
    parts.push(
      [
        "# Canonical docs in this project",
        "The full canonical wiki docs are loaded in this context for this advisor run. Use them directly when answering and when proposing wiki updates.",
        "",
        formatCanonicalDocsForPrompt(canonicalDocs),
      ].join("\n"),
    );
  }

  parts.push(CHAT_AGENT_TOOLS_PROMPT);

  parts.push(CHAT_AGENT_CITATIONS_PROMPT);

  const prompt = {
    system: parts.join("\n\n"),
  };

  if (cacheKey) {
    advisorRunSystemPromptCache.set(cacheKey, prompt);
  }

  return prompt;
}

function serializeSettings(settings: ProjectSettings | null): string {
  if (!settings) {
    return "# Operating Instructions\nUsing defaults (conversational tone, standard verbosity).";
  }

  const lines = [
    "# Operating Instructions",
    `- Tone: ${settings.tone}`,
    `- Verbosity: ${settings.verbosity}`,
    `- Default output format: ${settings.default_format}`,
    `- Language: ${settings.language}`,
  ];

  const contextLines: string[] = [];
  if (settings.client_name) contextLines.push(`- Client: ${settings.client_name}`);
  if (settings.team_name) contextLines.push(`- Team: ${settings.team_name}`);
  if (settings.project_phase) contextLines.push(`- Phase: ${settings.project_phase}`);
  if (settings.additional_context) contextLines.push(`- Additional context: ${settings.additional_context}`);

  if (contextLines.length > 0) {
    lines.push("", "# Project Context", ...contextLines);
  }

  return lines.join("\n");
}

function formatCurrentDateForPrompt() {
  const now = new Date();
  const isoDate = now.toISOString().slice(0, 10);
  const displayDate = new Intl.DateTimeFormat("en", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(now);

  return { isoDate, displayDate };
}
