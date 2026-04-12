import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function getDefaultFileVisibility(path: string): "surfaced" | "internal" {
  if (path === "index.md") return "internal";
  if (path.startsWith("memory-")) return "internal";
  if (/^memory-\d{4}-\d{2}-\d{2}\.md$/.test(path)) return "internal";
  return "surfaced";
}

export async function editProjectFile({
  projectId,
  path,
  content,
  userId,
  createdByAgent = false,
}: {
  projectId: string;
  path: string;
  content: string;
  userId: string;
  createdByAgent?: boolean;
}) {
  const supabase = createSupabaseAdminClient();

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

    const { error: versionInsertError } = await supabase.from("project_file_versions").insert({
      project_file_id: existing.id,
      content: existing.content,
      version: (versions?.[0]?.version ?? 0) + 1,
      edited_by: userId,
    });

    if (versionInsertError) throw versionInsertError;

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
    .insert({
      project_id: projectId,
      path,
      content,
      visibility: getDefaultFileVisibility(path),
      updated_by: userId,
      created_by_agent: createdByAgent,
    })
    .select("*")
    .single();

  if (error) throw error;

  const { error: initialVersionError } = await supabase.from("project_file_versions").insert({
    project_file_id: data.id,
    content: "",
    version: 1,
    edited_by: userId,
  });

  if (initialVersionError) throw initialVersionError;

  return data;
}
