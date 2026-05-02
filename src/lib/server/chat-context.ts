import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProjectSettings } from "@/lib/types";
import {
  resolveAdvisorToolMode,
  type AgentRunMode,
} from "@/lib/server/agent-tools";

export type AssembledChatPrompt = {
  system: string;
  toolMode: AgentRunMode;
  canCreateEntityPages: boolean;
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
    { data: coreFiles },
    { data: memoryFiles },
  ] = await Promise.all([
    supabase.from("projects").select("name,owner_id").eq("id", projectId).single(),
    supabase.from("project_settings").select("*").eq("project_id", projectId).maybeSingle(),
    supabase.from("profiles").select("email,name").eq("id", userId).single(),
    supabase.from("project_members").select("role").eq("project_id", projectId).eq("user_id", userId).maybeSingle(),
    supabase
      .from("project_files")
      .select("path,content")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .in("path", ["index.md", "log.md", "glossary.md", "PROJECT.md", "WORK.md", "PRODUCT.md"]),
    supabase
      .from("project_files")
      .select("path,content")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .like("path", "memory/%")
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const fileMap = new Map((coreFiles ?? []).map((f) => [f.path, f.content]));
  const role = project?.owner_id === userId ? "owner" : (member?.role ?? "viewer");
  const projectSettings = settings as ProjectSettings | null;
  const toolMode = resolveAdvisorToolMode(projectSettings);
  const canCreateEntityPages = projectSettings?.auto_create_entity_pages ?? true;

  const parts: string[] = [];

  parts.push(
    [
      "You are an AI project advisor for non-technical users. You help manage and synthesize knowledge about their project. Keep responses concrete, helpful, and action-oriented.",
      "Focus on answering the user well in-conversation. A separate background Librarian agent owns wiki curation: it maintains index.md and log.md, synthesizes ingested sources, keeps memory entries, proposes lints, and decides when chat syntheses deserve their own page. Do not try to replicate its job — when the user asks to 'lint the wiki', 'curate', 'audit', or 'check wiki health', call the `trigger_wiki_lint` tool with a `focus` string when they name an area **or** state a factual correction (e.g. two pages are the same person). Pass their wording **verbatim** for corrections — do not soften “they are the same” into “check whether they might be duplicates”. Then tell them the lint is running and its results will appear in log.md and the activity feed.",
    ].join(" "),
  );

  parts.push(`# Project: ${project?.name ?? "Unknown"}`);

  parts.push(serializeSettings(projectSettings));

  parts.push(`# Current User\n${profile?.name ?? "Unknown"} (${profile?.email ?? ""}) — role: ${role}`);

  parts.push(
    `# Mode\n${toolMode === "write" ? "write — file tools apply changes to the wiki immediately (subject to locks and your role)." : "proposal — file tools record intent only; nothing is written until an editor applies changes. Still call the tools you would have used so the transcript shows what you recommend."}`,
  );

  const glossary = fileMap.get("glossary.md");
  if (glossary) {
    parts.push(`# Glossary\nThese are project-specific terms. Always use them correctly.\n\n${glossary}`);
  }

  const projectMd = fileMap.get("PROJECT.md");
  if (projectMd) parts.push(`# PROJECT.md\n${projectMd}`);

  const workMd = fileMap.get("WORK.md");
  if (workMd) parts.push(`# WORK.md\n${workMd}`);

  const productMd = fileMap.get("PRODUCT.md");
  if (productMd) parts.push(`# PRODUCT.md\n${productMd}`);

  if (memoryFiles?.length) {
    parts.push(
      `# Recent Memory\n${memoryFiles.map((f) => `## ${f.path}\n${f.content}`).join("\n\n")}`,
    );
  }

  const indexMd = fileMap.get("index.md");
  if (indexMd) {
    parts.push(
      `# Wiki Index\nThis is the catalog of all project wiki pages. Use read_file to access any file listed here.\n\n${indexMd}`,
    );
  }

  parts.push(
    [
      "# Available Tools",
      "- list_files — inventory of live project files with metadata",
      "- read_file — read a project file by path",
      "- create_file — create a new file (fails if one exists at the path); requires `reason`",
      "- edit_file — create or overwrite a file’s content; requires `reason`; for is_source_of_truth files pass confirm_source_of_truth: true",
      "- rename_file — move a file; requires `reason`",
      "- delete_file — soft-delete a file; locked and source-of-truth files rejected; requires `reason`",
      "- search_sources — hybrid semantic + keyword search over ingested source chunks",
      "- read_source — full source material by id (only ids from search_sources)",
      "- record_suggestion — log a question/source/fix for the user; not for file edits",
      "- trigger_wiki_lint — background wiki health check; optional `focus` (scope or user’s verbatim correction). Use when they ask to lint/curate/audit the wiki.",
      "- Only call read_source with a sourceMaterialId returned by search_sources. If search_sources returns no results, do not call read_source.",
      "- The background Librarian keeps index.md and log.md in sync after chat; do not micromanage those from chat.",
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
    canCreateEntityPages,
  };
}

function serializeSettings(settings: ProjectSettings | null): string {
  if (!settings) {
    return "# Operating Instructions\nUsing defaults (conversational tone, standard verbosity, suggestive proactivity).";
  }

  const proactivityDesc: Record<string, string> = {
    reactive: "Only respond when asked. Do not suggest changes unprompted.",
    suggestive: "You may suggest improvements and flag issues, but wait for approval before making changes.",
    proactive: "Proactively make improvements, create wiki pages, and suggest changes.",
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

  lines.push(
    "",
    "# Agent Permissions",
    settings.auto_synthesize_on_ingest
      ? "- Auto-synthesize on ingest: yes — automatically create wiki pages when new sources are ingested"
      : "- Auto-synthesize on ingest: no — wait for the user to request synthesis",
    settings.auto_create_entity_pages
      ? "- Auto-create entity pages: yes — create pages for recurring entities automatically"
      : "- Auto-create entity pages: no — ask before creating new entity pages",
  );

  return lines.join("\n");
}
