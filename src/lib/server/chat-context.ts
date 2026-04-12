import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProjectSettings } from "@/lib/types";

export async function assembleProjectSystemPrompt(projectId: string, userId: string) {
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
      .in("path", ["index.md", "glossary.md", "PROJECT.md", "WORK.md", "PRODUCT.md"]),
    supabase
      .from("project_files")
      .select("path,content")
      .eq("project_id", projectId)
      .like("path", "memory/%")
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const fileMap = new Map((coreFiles ?? []).map((f) => [f.path, f.content]));
  const role = project?.owner_id === userId ? "owner" : (member?.role ?? "viewer");

  const parts: string[] = [];

  parts.push(
    "You are an AI project advisor for non-technical users. You help manage and synthesize knowledge about their project. Keep responses concrete, helpful, and action-oriented. When you learn important information during a conversation, proactively update the relevant wiki files.",
  );

  parts.push(`# Project: ${project?.name ?? "Unknown"}`);

  parts.push(serializeSettings(settings as ProjectSettings | null));

  parts.push(`# Current User\n${profile?.name ?? "Unknown"} (${profile?.email ?? ""}) — role: ${role}`);

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
      "- list_files — list all project files with display metadata (pinned, visibility, locked, source of truth)",
      "- read_file — read a project file by path",
      "- edit_file — create or update a project file (locked files will be rejected)",
      "- search_sources — semantic search across ingested source material chunks",
      "- read_source — read the full content of an ingested source material",
      "- Only call read_source with a sourceMaterialId returned by search_sources. If search_sources returns no results, do not call read_source.",
      "",
      "# Wiki Lint",
      'When the user asks to "lint the wiki", "check wiki health", or "audit the project files", perform a systematic health check:',
      "1. Read index.md and list_files to understand what exists",
      "2. Read key files and check for:",
      "   - Stale content: outdated dates, deadlines, or statuses",
      "   - Contradictions: conflicting claims across files",
      "   - Orphan pages: files with no inbound references from other files",
      "   - Missing entity pages: people/clients/systems mentioned frequently but lacking a dedicated page",
      "   - Index gaps: files present in the project but missing from index.md",
      "3. Report findings as a structured list with severity (info/warning/issue)",
      "4. Based on project settings, either propose fixes or make them directly",
    ].join("\n"),
  );

  return parts.join("\n\n");
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
