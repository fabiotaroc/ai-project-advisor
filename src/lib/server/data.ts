import { cache } from "react";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/server/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AccessibleProject,
  ActivityEvent,
  ProjectFile,
  ProjectRole,
  ProjectSettings,
  ProjectSummary,
  SourceMaterial,
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

export async function getSources(projectId: string) {
  await getProjectForUser(projectId);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("source_materials")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SourceMaterial[];
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

export async function getActivity(projectId: string) {
  await getProjectForUser(projectId);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("activity_events")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as ActivityEvent[];
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
