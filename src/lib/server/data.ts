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
  owner_id: string;
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
              owner_id: string;
            }
          | {
              id: string;
              name: string;
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
    name: project.name,
    owner_id: project.owner_id,
    role: row.role,
  };
}

export const getAccessibleProjects = cache(async (): Promise<AccessibleProject[]> => {
  const user = await getSessionUser();
  const supabase = await createSupabaseServerClient();
  const [{ data: ownedProjects, error: ownedError }, { data: memberRows, error: memberError }] =
    await Promise.all([
      supabase.from("projects").select("id,name,owner_id").eq("owner_id", user.id),
      supabase
        .from("project_members")
        .select("role,project:projects!inner(id,name,owner_id)")
        .eq("user_id", user.id),
    ]);

  if (ownedError) throw ownedError;
  if (memberError) throw memberError;

  const ownedById = new Map(
    (ownedProjects ?? []).map((project) => [
      project.id,
      {
        id: project.id,
        name: project.name,
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
    .select("id,name,owner_id")
    .eq("id", projectId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (ownedError) throw ownedError;

  if (ownedProject) {
    return {
      id: ownedProject.id,
      name: ownedProject.name,
      owner_id: ownedProject.owner_id,
      role: "owner" as const,
      is_owned: true,
    };
  }

  const { data, error } = await supabase
    .from("project_members")
    .select("role,project:projects!inner(id,name,owner_id)")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) throw error;

  const project = flattenProjectAccess(data);
  return project ? { ...project, is_owned: false } : null;
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
