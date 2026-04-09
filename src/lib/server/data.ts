import { cache } from "react";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/server/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AccessibleProject,
  ActivityEvent,
  ProjectFile,
  ProjectRole,
  SourceMaterial,
} from "@/lib/types";

type ProjectAccess = {
  id: string;
  name: string;
  workspace_id: string;
  role: ProjectRole;
};

function flattenProjectAccess(
  row:
    | {
        role: ProjectRole;
        project:
          | {
              id: string;
              name: string;
              workspace_id: string;
            }
          | {
              id: string;
              name: string;
              workspace_id: string;
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
    name: project.name,
    workspace_id: project.workspace_id,
    role: row.role,
  };
}

export const getCurrentWorkspace = cache(async () => {
  const user = await getSessionUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("workspaces")
    .select("id,name")
    .eq("owner_id", user.id)
    .single();

  if (error) throw error;
  return data;
});

export const getAccessibleProjects = cache(async (): Promise<AccessibleProject[]> => {
  const user = await getSessionUser();
  const [workspace, supabase] = await Promise.all([
    getCurrentWorkspace(),
    createSupabaseServerClient(),
  ]);

  const { data, error } = await supabase
    .from("project_members")
    .select("role,project:projects!inner(id,name,workspace_id)")
    .eq("user_id", user.id);

  if (error) throw error;

  return (data ?? [])
    .map((row) => flattenProjectAccess(row))
    .filter((project): project is ProjectAccess => Boolean(project))
    .map((project) => ({
      ...project,
      is_personal: project.workspace_id === workspace.id,
    }))
    .sort((left, right) => {
      if (left.is_personal !== right.is_personal) {
        return left.is_personal ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    });
});

export async function getProjectsByWorkspace(workspaceId: string) {
  const projects = await getAccessibleProjects();
  return projects.filter((project) => project.workspace_id === workspaceId);
}

export async function getProjectsForCurrentWorkspace() {
  const workspace = await getCurrentWorkspace();
  return getProjectsByWorkspace(workspace.id);
}

export async function getProjectAccessForUser(userId: string, projectId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_members")
    .select("role,project:projects!inner(id,name,workspace_id)")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) throw error;

  return flattenProjectAccess(data);
}

export async function getProjectAccess(projectId: string) {
  const user = await getSessionUser();
  return getProjectAccessForUser(user.id, projectId);
}

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
