import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function assembleProjectSystemPrompt(projectId: string, userId: string) {
  const supabase = await createSupabaseServerClient();

  const [{ data: project }, { data: profile }, { data: files }, { data: memoryFiles }] = await Promise.all([
    supabase.from("projects").select("name,agent_instructions").eq("id", projectId).single(),
    supabase.from("profiles").select("email,name").eq("id", userId).single(),
    supabase.from("project_files").select("path,content").eq("project_id", projectId),
    supabase.from("project_files").select("path,content").eq("project_id", projectId).like("path", "memory/%").limit(3),
  ]);

  const fileMap = new Map((files ?? []).map((f) => [f.path, f.content]));

  return [
    "You are an AI project advisor for non-technical users. Keep responses concrete and helpful.",
    `Project: ${project?.name ?? "Unknown"}`,
    `Instructions: ${project?.agent_instructions ?? ""}`,
    `User: ${profile?.name ?? "Unknown"} (${profile?.email ?? ""})`,
    `PROJECT.md:\n${fileMap.get("PROJECT.md") ?? ""}`,
    `WORK.md:\n${fileMap.get("WORK.md") ?? ""}`,
    `PRODUCT.md:\n${fileMap.get("PRODUCT.md") ?? ""}`,
    `Recent memory files:\n${(memoryFiles ?? []).map((f) => `# ${f.path}\n${f.content}`).join("\n\n")}`,
    `Known files:\n${(files ?? []).map((f) => `- ${f.path}`).join("\n")}`,
    "Available tools: list_files, read_file, edit_file, search_sources, read_source",
  ].join("\n\n");
}
