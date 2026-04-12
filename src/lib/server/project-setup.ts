import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const DEFAULT_FILES: {
  path: string;
  content: string;
  pinned: boolean;
  visibility: "surfaced" | "internal";
  is_source_of_truth: boolean;
}[] = [
  {
    path: "index.md",
    content: [
      "# Project Wiki Index",
      "",
      "This index is maintained by the agent. Each entry summarizes a wiki page.",
      "",
      "## Core Files",
      "- PROJECT.md — Project overview, scope, key people, and risks",
      "- WORK.md — Current focus, next steps, and blockers",
      "- PRODUCT.md — Product thinking, decisions, and trade-offs",
      "- decisions.md — Log of key decisions extracted from sources and conversations",
      "- glossary.md — Project-specific terminology and definitions",
      "",
    ].join("\n"),
    pinned: false,
    visibility: "internal",
    is_source_of_truth: false,
  },
  {
    path: "glossary.md",
    content: [
      "# Glossary",
      "",
      "| Term | Definition |",
      "|------|------------|",
      "",
    ].join("\n"),
    pinned: true,
    visibility: "surfaced",
    is_source_of_truth: false,
  },
  {
    path: "PROJECT.md",
    content: [
      "# Project Overview",
      "",
      "## Summary",
      "_Describe what this project is about._",
      "",
      "## Key People",
      "_Who is involved? Client, team, stakeholders._",
      "",
      "## Scope",
      "_What is in scope and out of scope?_",
      "",
      "## Risks",
      "_Known risks and mitigation strategies._",
      "",
    ].join("\n"),
    pinned: true,
    visibility: "surfaced",
    is_source_of_truth: true,
  },
  {
    path: "WORK.md",
    content: [
      "# Current Work",
      "",
      "## Focus",
      "_What are we working on right now?_",
      "",
      "## Next Steps",
      "_What comes next?_",
      "",
      "## Blockers",
      "_What is blocking progress?_",
      "",
    ].join("\n"),
    pinned: true,
    visibility: "surfaced",
    is_source_of_truth: false,
  },
  {
    path: "PRODUCT.md",
    content: [
      "# Product",
      "",
      "## Vision",
      "_What is the product vision?_",
      "",
      "## Decisions",
      "_Key product decisions and their rationale._",
      "",
      "## Trade-offs",
      "_Notable trade-offs and why they were made._",
      "",
    ].join("\n"),
    pinned: true,
    visibility: "surfaced",
    is_source_of_truth: false,
  },
  {
    path: "decisions.md",
    content: [
      "# Decisions Log",
      "",
      "Decisions are extracted from sources and conversations by the agent.",
      "",
      "_No decisions recorded yet._",
      "",
    ].join("\n"),
    pinned: true,
    visibility: "surfaced",
    is_source_of_truth: false,
  },
];

export async function seedDefaultProjectFiles(projectId: string) {
  const admin = createSupabaseAdminClient();

  const rows = DEFAULT_FILES.map((file) => ({
    project_id: projectId,
    path: file.path,
    content: file.content,
    pinned: file.pinned,
    visibility: file.visibility,
    is_source_of_truth: file.is_source_of_truth,
    created_by_agent: false,
    locked: false,
  }));

  const { error } = await admin.from("project_files").insert(rows);
  if (error) throw error;
}

export async function createProject(name: string, ownerId: string) {
  const admin = createSupabaseAdminClient();

  const { data: project, error: projectError } = await admin
    .from("projects")
    .insert({ name, owner_id: ownerId })
    .select("id,name,owner_id")
    .single();

  if (projectError) throw projectError;

  await Promise.all([
    admin.from("project_members").insert({
      project_id: project.id,
      user_id: ownerId,
      role: "owner",
    }),
    admin.from("project_settings").insert({
      project_id: project.id,
    }),
    seedDefaultProjectFiles(project.id),
  ]);

  return project;
}
