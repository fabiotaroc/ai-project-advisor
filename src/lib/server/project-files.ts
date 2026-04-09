import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function editProjectFile({ projectId, path, content, userId }: { projectId: string; path: string; content: string; userId: string }) {
  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("project_files")
    .select("id, content")
    .eq("project_id", projectId)
    .eq("path", path)
    .maybeSingle();

  if (existing) {
    const { data: versions } = await supabase
      .from("project_file_versions")
      .select("version")
      .eq("project_file_id", existing.id)
      .order("version", { ascending: false })
      .limit(1);

    await supabase.from("project_file_versions").insert({
      project_file_id: existing.id,
      content: existing.content,
      version: (versions?.[0]?.version ?? 0) + 1,
      edited_by: userId,
    });

    const { data, error } = await supabase
      .from("project_files")
      .update({ content, updated_by: userId })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("project_files")
    .insert({ project_id: projectId, path, content, updated_by: userId })
    .select("*")
    .single();

  if (error) throw error;

  await supabase.from("project_file_versions").insert({
    project_file_id: data.id,
    content: "",
    version: 1,
    edited_by: userId,
  });

  return data;
}
