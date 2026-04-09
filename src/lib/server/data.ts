import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActivityEvent, ProjectFile, SourceMaterial } from "@/lib/types";

export const getSessionUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  return user;
});

export async function getWorkspaces() {
  const user = await getSessionUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace:workspaces(id,name)")
    .eq("user_id", user.id);

  if (error) throw error;
  return (data ?? [])
    .map((row) => (Array.isArray(row.workspace) ? row.workspace[0] : row.workspace))
    .filter((workspace): workspace is { id: string; name: string } => Boolean(workspace?.id && workspace?.name));
}

export async function getProjectsByWorkspace(workspaceId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("projects").select("id,name").eq("workspace_id", workspaceId);
  if (error) throw error;
  return data ?? [];
}

export async function getProject(projectId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("projects").select("id,name").eq("id", projectId).single();
  if (error) throw error;
  return data;
}

export async function getProjectFiles(projectId: string) {
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
