import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export function getDefaultFileVisibility(path: string): "surfaced" | "internal" {
  if (path === "index.md") return "internal";
  if (path === "log.md") return "internal";
  if (path.startsWith("memory/")) return "internal";
  if (/^memory-\d{4}-\d{2}-\d{2}\.md$/.test(path)) return "internal";
  return "surfaced";
}

async function nextVersionNumber(projectFileId: string): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const { data: versions } = await supabase
    .from("project_file_versions")
    .select("version")
    .eq("project_file_id", projectFileId)
    .order("version", { ascending: false })
    .limit(1);

  return (versions?.[0]?.version ?? 0) + 1;
}

/**
 * Create or update a project file by path. Skips locked files.
 * Soft-deleted rows at the same path are revived (content replaced, deleted_at cleared).
 * Every edit writes a project_file_versions row capturing the PREVIOUS content.
 */
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
    .select("id, content, locked, deleted_at")
    .eq("project_id", projectId)
    .eq("path", path)
    .maybeSingle();

  if (existing && existing.locked) {
    throw new Error(`File "${path}" is locked and cannot be edited.`);
  }

  if (existing && !existing.deleted_at) {
    const { error: versionInsertError } = await supabase.from("project_file_versions").insert({
      project_file_id: existing.id,
      content: existing.content,
      version: await nextVersionNumber(existing.id),
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

  if (existing && existing.deleted_at) {
    const { error: versionInsertError } = await supabase.from("project_file_versions").insert({
      project_file_id: existing.id,
      content: existing.content,
      version: await nextVersionNumber(existing.id),
      edited_by: userId,
    });
    if (versionInsertError) throw versionInsertError;

    const { data, error } = await supabase
      .from("project_files")
      .update({
        content,
        updated_by: userId,
        deleted_at: null,
        created_by_agent: createdByAgent,
      })
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

/**
 * Create a project file. Fails if one already exists at the same path (incl. soft-deleted).
 * Use editProjectFile if upsert semantics are desired.
 */
export async function createProjectFile({
  projectId,
  path,
  content,
  userId,
  createdByAgent = true,
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
    .select("id, deleted_at")
    .eq("project_id", projectId)
    .eq("path", path)
    .maybeSingle();

  if (existing && !existing.deleted_at) {
    throw new Error(`File "${path}" already exists. Use edit_file to update it.`);
  }

  return editProjectFile({ projectId, path, content, userId, createdByAgent });
}

/**
 * Soft-delete a project file. The version history is preserved and a final
 * version row is written capturing the content at delete time.
 */
export async function deleteProjectFile({
  projectId,
  path,
  userId,
}: {
  projectId: string;
  path: string;
  userId: string;
}) {
  const supabase = createSupabaseAdminClient();

  const { data: existing } = await supabase
    .from("project_files")
    .select("id, content, locked, is_source_of_truth, deleted_at")
    .eq("project_id", projectId)
    .eq("path", path)
    .maybeSingle();

  if (!existing) {
    throw new Error(`File "${path}" does not exist.`);
  }
  if (existing.deleted_at) {
    throw new Error(`File "${path}" is already deleted.`);
  }
  if (existing.locked) {
    throw new Error(`File "${path}" is locked and cannot be deleted.`);
  }

  const { error: versionInsertError } = await supabase.from("project_file_versions").insert({
    project_file_id: existing.id,
    content: existing.content,
    version: await nextVersionNumber(existing.id),
    edited_by: userId,
  });
  if (versionInsertError) throw versionInsertError;

  const { data, error } = await supabase
    .from("project_files")
    .update({ deleted_at: new Date().toISOString(), updated_by: userId })
    .eq("id", existing.id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/**
 * Rename a project file from one path to another. Version history is preserved
 * (the row id stays stable). Fails if the target path is occupied by a live file.
 */
export async function renameProjectFile({
  projectId,
  fromPath,
  toPath,
  userId,
}: {
  projectId: string;
  fromPath: string;
  toPath: string;
  userId: string;
}) {
  if (fromPath === toPath) {
    throw new Error("Source and target paths are identical.");
  }

  const supabase = createSupabaseAdminClient();

  const { data: source } = await supabase
    .from("project_files")
    .select("id, locked, deleted_at")
    .eq("project_id", projectId)
    .eq("path", fromPath)
    .maybeSingle();

  if (!source || source.deleted_at) {
    throw new Error(`File "${fromPath}" does not exist.`);
  }
  if (source.locked) {
    throw new Error(`File "${fromPath}" is locked and cannot be renamed.`);
  }

  const { data: existingTarget } = await supabase
    .from("project_files")
    .select("id")
    .eq("project_id", projectId)
    .eq("path", toPath)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingTarget) {
    throw new Error(`A file already exists at "${toPath}". Delete or rename it first.`);
  }

  const { data, error } = await supabase
    .from("project_files")
    .update({ path: toPath, updated_by: userId })
    .eq("id", source.id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
