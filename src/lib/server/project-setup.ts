import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
  ]);

  return project;
}
