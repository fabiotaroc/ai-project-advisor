import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProjectSettings } from "@/lib/types";
import {
  resolveAdvisorToolMode,
  type AgentRunMode,
} from "@/lib/server/agent-tools";

export type AssembledChatPrompt = {
  system: string;
  toolMode: AgentRunMode;
};

export async function assembleProjectSystemPrompt(
  projectId: string,
  userId: string,
): Promise<AssembledChatPrompt> {
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
      .select("slug,title,is_default,is_pinned,updated_at")
      .eq("project_id", projectId),
  ]);

  const role = project?.owner_id === userId ? "owner" : (member?.role ?? "viewer");
  const projectSettings = settings as ProjectSettings | null;
  const toolMode = resolveAdvisorToolMode(projectSettings);

  const parts: string[] = [];

  parts.push(
    [
      "You are an AI project advisor for non-technical users. You help manage and synthesize knowledge about their project. Keep responses concrete, helpful, and action-oriented.",
      "The project's wiki is a fixed set of canonical docs (`project`, `decisions`, `people`, `work`, `glossary`, plus any user-pinned customs). You can read them via `read_canonical_doc` and `list_canonical_docs`. When the user explicitly asks you to remember, record, save, or update project knowledge, call `propose_wiki_update`; do not claim the wiki was updated until the user saves the proposal card.",
      "Background source ingestion produces reviewable pending edits against the canonical docs; those are accepted/rejected from the source detail page, not from chat.",
    ].join(" "),
  );

  parts.push(`# Project: ${project?.name ?? "Unknown"}`);

  parts.push(serializeSettings(projectSettings));

  parts.push(`# Current User\n${profile?.name ?? "Unknown"} (${profile?.email ?? ""}) — role: ${role}`);

  if (canonicalDocs && canonicalDocs.length > 0) {
    const docList = canonicalDocs
      .slice()
      .sort((a, b) => {
        if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
        return String(a.slug).localeCompare(String(b.slug));
      })
      .map((d) => `- ${d.slug}.md — ${d.title} ${d.is_default ? "(default)" : "(pinned)"}`)
      .join("\n");
    parts.push(`# Canonical docs in this project\n${docList}\n\nUse \`read_canonical_doc\` with a slug to read full bodies.`);
  }

  parts.push(
    [
      "# Available Tools",
      "- list_canonical_docs — inventory of canonical docs in this project (slugs + titles)",
      "- read_canonical_doc — read the full body of a canonical doc by slug",
      "- search_sources — hybrid semantic + keyword search over ingested source chunks",
      "- read_source — full source material by id (only ids from search_sources)",
      "- propose_wiki_update — create a reviewable chat memory proposal for one canonical doc; use only after an explicit user request",
      "- record_suggestion — log a question/source/fix for the user; not for wiki edits",
      "- Only call read_source with a sourceMaterialId returned by search_sources. If search_sources returns no results, do not call read_source.",
    ].join("\n"),
  );

  parts.push(
    [
      "# Grounded Citations",
      "When you use source material from search_sources to answer, cite every factual sentence or bullet row that depends on that material.",
      "Place the marker immediately after the sentence or row using this exact format: 〖cite:<chunk_id>〗.",
      "Use only chunk_id values returned by search_sources in the current answer. Do not cite read_source ids, source titles, project files, or invented ids.",
      "If a sentence is a transition, recommendation, or unsupported synthesis, leave it uncited rather than attaching a misleading marker.",
      "Keep markers out of headings.",
    ].join("\n"),
  );

  return {
    system: parts.join("\n\n"),
    toolMode,
  };
}

function serializeSettings(settings: ProjectSettings | null): string {
  if (!settings) {
    return "# Operating Instructions\nUsing defaults (conversational tone, standard verbosity, suggestive proactivity).";
  }

  const proactivityDesc: Record<string, string> = {
    reactive: "Only respond when asked. Do not suggest changes unprompted.",
    suggestive: "You may suggest improvements and flag issues, but wait for approval before making changes.",
    proactive: "Proactively make improvements and suggest changes.",
  };

  const lines = [
    "# Operating Instructions",
    `- Tone: ${settings.tone}`,
    `- Verbosity: ${settings.verbosity}`,
    `- Default output format: ${settings.default_format}`,
    `- Proactivity: ${proactivityDesc[settings.proactivity] ?? settings.proactivity}`,
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
