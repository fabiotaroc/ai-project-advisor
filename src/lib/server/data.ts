import { cache } from "react";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/server/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AccessibleProject,
  ActivityEvent,
  LibrarianAction,
  LibrarianRun,
  LibrarianSuggestion,
  ProjectActivity,
  ProjectFile,
  ProjectRole,
  ProjectSettings,
  ProjectSummary,
  SourceLinkedActivity,
  SourceLinkedRun,
  SourceChunkReference,
  SourceMaterial,
  SourceMaterialDetail,
  SourceUploader,
} from "@/lib/types";

type ProjectAccess = {
  id: string;
  name: string;
  description: string;
  logo_url: string | null;
  owner_id: string;
  role: ProjectRole;
};

function normalizeProjectText(value: string | null | undefined) {
  return typeof value === "string" ? value : "";
}

function flattenProjectAccess(
  row:
    | {
        role: ProjectRole;
        project:
          | {
              id: string;
              name: string;
              description: string;
              logo_url: string | null;
              owner_id: string;
            }
          | {
              id: string;
              name: string;
              description: string;
              logo_url: string | null;
              owner_id: string;
            }[]
          | null;
      }
    | null
    | undefined,
): ProjectAccess | null {
  const project = Array.isArray(row?.project) ? row.project[0] : row?.project;

  if (!row || !project) {
    return null;
  }

  return {
    id: project.id,
    name: normalizeProjectText(project.name),
    description: normalizeProjectText(project.description),
    logo_url: project.logo_url,
    owner_id: project.owner_id,
    role: row.role,
  };
}

export const getAccessibleProjects = cache(async (): Promise<AccessibleProject[]> => {
  const user = await getSessionUser();
  const supabase = await createSupabaseServerClient();
  const [{ data: ownedProjects, error: ownedError }, { data: memberRows, error: memberError }] =
    await Promise.all([
      supabase.from("projects").select("id,name,description,logo_url,owner_id").eq("owner_id", user.id),
      supabase
        .from("project_members")
        .select("role,project:projects!inner(id,name,description,logo_url,owner_id)")
        .eq("user_id", user.id),
    ]);

  if (ownedError) throw ownedError;
  if (memberError) throw memberError;

  const ownedById = new Map(
    (ownedProjects ?? []).map((project) => [
      project.id,
      {
        id: project.id,
        name: normalizeProjectText(project.name),
        description: normalizeProjectText(project.description),
        logo_url: project.logo_url ?? null,
        owner_id: project.owner_id,
        role: "owner" as const,
        is_owned: true,
      },
    ]),
  );

  const sharedProjects = (memberRows ?? [])
    .map((row) => flattenProjectAccess(row))
    .filter((project): project is ProjectAccess => Boolean(project))
    .filter((project) => !ownedById.has(project.id))
    .map((project) => ({
      ...project,
      is_owned: false,
    }));

  return [...ownedById.values(), ...sharedProjects].sort((left, right) => {
      if (left.is_owned !== right.is_owned) {
        return left.is_owned ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    });
});

export async function getProjectAccessForUser(userId: string, projectId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: ownedProject, error: ownedError } = await supabase
    .from("projects")
    .select("id,name,description,logo_url,owner_id")
    .eq("id", projectId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (ownedError) throw ownedError;

  if (ownedProject) {
    return {
      id: ownedProject.id,
      name: normalizeProjectText(ownedProject.name),
      description: normalizeProjectText(ownedProject.description),
      logo_url: ownedProject.logo_url ?? null,
      owner_id: ownedProject.owner_id,
      role: "owner" as const,
      is_owned: true,
    };
  }

  const { data, error } = await supabase
    .from("project_members")
    .select("role,project:projects!inner(id,name,description,logo_url,owner_id)")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) throw error;

  const project = flattenProjectAccess(data);
  return project ? { ...project, is_owned: false } : null;
}

export const getProjectAccess = cache(async (projectId: string) => {
  const user = await getSessionUser();
  return getProjectAccessForUser(user.id, projectId);
});

export async function getProjectForUser(projectId: string) {
  const project = await getProjectAccess(projectId);

  if (!project) {
    notFound();
  }

  return project;
}

export async function getProject(projectId: string) {
  return getProjectForUser(projectId);
}

export async function getProjectFiles(projectId: string) {
  await getProjectForUser(projectId);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_files")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("path", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ProjectFile[];
}

export async function getSources(projectId: string): Promise<SourceMaterialDetail[]> {
  await getProjectForUser(projectId);
  return getSourceDetailsForProject(projectId);
}

export async function getSourceDetail(
  projectId: string,
  sourceId: string,
): Promise<SourceMaterialDetail | null> {
  await getProjectForUser(projectId);
  const sources = await getSourceDetailsForProject(projectId, [sourceId]);
  return sources[0] ?? null;
}

async function getSourceDetailsForProject(
  projectId: string,
  filterSourceIds?: string[],
): Promise<SourceMaterialDetail[]> {
  if (filterSourceIds?.length === 0) return [];
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("source_materials")
    .select(
      "id,project_id,type,title,summary,parsed_content,raw_storage_path,metadata,status,uploaded_by,created_at,updated_at",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (filterSourceIds) {
    query = query.in("id", filterSourceIds);
  }

  const { data: rows, error } = await query;

  if (error) throw error;

  const sources = (rows ?? []) as SourceMaterial[];
  if (sources.length === 0) return [];

  const sourceIds = sources.map((source) => source.id);
  const uploaderIds = Array.from(
    new Set(sources.map((source) => source.uploaded_by).filter((id): id is string => Boolean(id))),
  );

  const admin = createSupabaseAdminClient();

  const [chunksResult, profilesResult, activityResult, runsResult] = await Promise.all([
    supabase
      .from("source_chunks")
      .select("id,source_material_id,content,chunk_index,char_start,char_end")
      .in("source_material_id", sourceIds),
    uploaderIds.length > 0
      ? admin.from("profiles").select("id,name,email").in("id", uploaderIds)
      : Promise.resolve({ data: [], error: null } as const),
    supabase
      .from("activity_events")
      .select("id,event_type,summary,created_at,target_id")
      .eq("project_id", projectId)
      .eq("target_type", "source_material")
      .in("target_id", sourceIds)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("librarian_runs")
      .select("id,status,summary,started_at,finished_at,action_count,suggestion_count,trigger_ref")
      .eq("project_id", projectId)
      .eq("trigger_type", "source_ingested")
      .in("trigger_ref", sourceIds)
      .order("started_at", { ascending: false })
      .limit(200),
  ]);

  if (chunksResult.error) throw chunksResult.error;
  if (profilesResult.error) throw profilesResult.error;
  if (activityResult.error) throw activityResult.error;
  if (runsResult.error) throw runsResult.error;

  const chunksBySource = new Map<string, SourceChunkReference[]>();
  for (const row of chunksResult.data ?? []) {
    const list = chunksBySource.get(row.source_material_id) ?? [];
    list.push({
      id: row.id,
      content: row.content,
      chunk_index: row.chunk_index,
      char_start: row.char_start,
      char_end: row.char_end,
    });
    chunksBySource.set(row.source_material_id, list);
  }

  for (const chunks of chunksBySource.values()) {
    chunks.sort((a, b) => a.chunk_index - b.chunk_index);
  }

  const uploaders = new Map<string, SourceUploader>();
  for (const row of profilesResult.data ?? []) {
    uploaders.set(row.id, { id: row.id, name: row.name ?? null, email: row.email });
  }

  const activityBySource = new Map<string, SourceLinkedActivity[]>();
  for (const row of activityResult.data ?? []) {
    if (!row.target_id) continue;
    const list = activityBySource.get(row.target_id) ?? [];
    list.push({
      id: row.id,
      event_type: row.event_type,
      summary: row.summary,
      created_at: row.created_at,
    });
    activityBySource.set(row.target_id, list);
  }

  const runsBySource = new Map<string, SourceLinkedRun[]>();
  for (const row of runsResult.data ?? []) {
    if (!row.trigger_ref) continue;
    const list = runsBySource.get(row.trigger_ref) ?? [];
    list.push({
      id: row.id,
      status: asRunStatus(row.status),
      summary: row.summary ?? null,
      started_at: row.started_at,
      finished_at: row.finished_at ?? null,
      action_count: typeof row.action_count === "number" ? row.action_count : 0,
      suggestion_count: typeof row.suggestion_count === "number" ? row.suggestion_count : 0,
    });
    runsBySource.set(row.trigger_ref, list);
  }

  return sources.map((source) => ({
    ...source,
    chunk_count: chunksBySource.get(source.id)?.length ?? 0,
    chunks: chunksBySource.get(source.id) ?? [],
    uploader: source.uploaded_by ? uploaders.get(source.uploaded_by) ?? null : null,
    linked_activity: activityBySource.get(source.id) ?? [],
    linked_runs: runsBySource.get(source.id) ?? [],
  }));
}

export async function getProjectSettings(projectId: string): Promise<ProjectSettings | null> {
  await getProjectForUser(projectId);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_settings")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) throw error;
  return data as ProjectSettings | null;
}

export async function getActivity(projectId: string): Promise<ProjectActivity> {
  await getProjectForUser(projectId);

  const supabase = await createSupabaseServerClient();
  const [eventsResult, runsResult] = await Promise.all([
    supabase
      .from("activity_events")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(150),
    supabase
      .from("librarian_runs")
      .select("*")
      .eq("project_id", projectId)
      .order("started_at", { ascending: false })
      .limit(75),
  ]);

  if (eventsResult.error) throw eventsResult.error;
  if (runsResult.error) throw runsResult.error;

  return {
    events: (eventsResult.data ?? []).map(normalizeActivityEvent),
    librarianRuns: (runsResult.data ?? []).map(normalizeLibrarianRun),
  };
}

function normalizeActivityEvent(row: Record<string, unknown>): ActivityEvent {
  return {
    id: String(row.id),
    project_id: String(row.project_id),
    event_type: String(row.event_type),
    summary: String(row.summary),
    actor_id: asNullableString(row.actor_id),
    target_type: asNullableString(row.target_type),
    target_id: asNullableString(row.target_id),
    metadata: asRecord(row.metadata),
    created_at: String(row.created_at),
  };
}

function normalizeLibrarianRun(row: Record<string, unknown>): LibrarianRun {
  const actions = normalizeActions(row.actions);
  const suggestions = normalizeSuggestions(row.suggestions);

  return {
    id: String(row.id),
    project_id: String(row.project_id),
    trigger_type: asTriggerType(row.trigger_type),
    trigger_ref: asNullableString(row.trigger_ref),
    mode: asMode(row.mode),
    status: asRunStatus(row.status),
    summary: asNullableString(row.summary),
    error: asNullableString(row.error),
    actor_id: asNullableString(row.actor_id),
    started_at: String(row.started_at),
    finished_at: asNullableString(row.finished_at),
    action_count: asNonNegativeNumber(row.action_count, actions.length),
    suggestion_count: asNonNegativeNumber(row.suggestion_count, suggestions.length),
    actions,
    suggestions,
    files_touched: normalizeStringArray(row.files_touched),
  };
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asNonNegativeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeActions(value: unknown): LibrarianAction[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    const row = asRecord(item);
    const action = row.action;
    const path = row.path;

    if (
      (action !== "create" && action !== "edit" && action !== "rename" && action !== "delete") ||
      typeof path !== "string"
    ) {
      return [];
    }

    const normalized: LibrarianAction = { action, path };
    const details = asRecord(row.details);
    if (Object.keys(details).length > 0) {
      normalized.details = details;
    }
    return [normalized];
  });
}

function normalizeSuggestions(value: unknown): LibrarianSuggestion[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    const row = asRecord(item);
    const kind = row.kind;
    const title = row.title;

    if (
      (kind !== "question" && kind !== "source" && kind !== "fix") ||
      typeof title !== "string"
    ) {
      return [];
    }

    return [
      {
        kind,
        title,
        rationale: typeof row.rationale === "string" ? row.rationale : null,
      },
    ];
  });
}

function asTriggerType(value: unknown): LibrarianRun["trigger_type"] {
  if (
    value === "source_ingested" ||
    value === "conversation_ended" ||
    value === "wiki_lint"
  ) {
    return value;
  }
  return "wiki_lint";
}

function asMode(value: unknown): LibrarianRun["mode"] {
  return value === "proposal" ? "proposal" : "write";
}

function asRunStatus(value: unknown): LibrarianRun["status"] {
  if (value === "running" || value === "failed" || value === "succeeded") {
    return value;
  }
  return "running";
}

export const getAccessibleProjectsSummary = cache(async (): Promise<ProjectSummary[]> => {
  const projects = await getAccessibleProjects();
  if (projects.length === 0) return [];

  const ids = projects.map((project) => project.id);
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const [sourcesResult, activityResult, settingsResult, membersResult] = await Promise.all([
    supabase
      .from("source_materials")
      .select("project_id,status")
      .in("project_id", ids),
    supabase
      .from("activity_events")
      .select("project_id,summary,created_at")
      .in("project_id", ids)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("project_settings")
      .select("project_id,client_name,project_phase")
      .in("project_id", ids),
    admin
      .from("project_members")
      .select("project_id,user_id")
      .in("project_id", ids),
  ]);

  if (sourcesResult.error) throw sourcesResult.error;
  if (activityResult.error) throw activityResult.error;
  if (settingsResult.error) throw settingsResult.error;
  if (membersResult.error) throw membersResult.error;

  const sourceStats = new Map<string, { total: number; processing: number; failed: number }>();
  for (const row of sourcesResult.data ?? []) {
    const stats = sourceStats.get(row.project_id) ?? { total: 0, processing: 0, failed: 0 };
    stats.total += 1;
    if (row.status === "processing") stats.processing += 1;
    if (row.status === "failed") stats.failed += 1;
    sourceStats.set(row.project_id, stats);
  }

  const lastActivity = new Map<string, { created_at: string; summary: string }>();
  for (const row of activityResult.data ?? []) {
    if (!lastActivity.has(row.project_id)) {
      lastActivity.set(row.project_id, { created_at: row.created_at, summary: row.summary });
    }
  }

  const settingsById = new Map<string, { client_name: string | null; project_phase: string | null }>();
  for (const row of settingsResult.data ?? []) {
    settingsById.set(row.project_id, {
      client_name: row.client_name ?? null,
      project_phase: row.project_phase ?? null,
    });
  }

  const memberIdsByProject = new Map<string, Set<string>>();
  for (const row of membersResult.data ?? []) {
    const set = memberIdsByProject.get(row.project_id) ?? new Set<string>();
    set.add(row.user_id);
    memberIdsByProject.set(row.project_id, set);
  }

  return projects.map((project) => {
    const stats = sourceStats.get(project.id) ?? { total: 0, processing: 0, failed: 0 };
    const activity = lastActivity.get(project.id) ?? null;
    const settings = settingsById.get(project.id) ?? null;
    const memberSet = memberIdsByProject.get(project.id) ?? new Set<string>();
    memberSet.add(project.owner_id);

    return {
      ...project,
      sources_count: stats.total,
      sources_processing: stats.processing,
      sources_failed: stats.failed,
      members_count: memberSet.size,
      last_activity_at: activity?.created_at ?? null,
      last_activity_summary: activity?.summary ?? null,
      client_name: settings?.client_name ?? null,
      project_phase: settings?.project_phase ?? null,
    } satisfies ProjectSummary;
  });
});
