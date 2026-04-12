import { GlossaryPanel } from "@/components/glossary/glossary-panel";
import { getProjectFiles } from "@/lib/server/data";

export default async function GlossaryPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const files = await getProjectFiles(projectId);
  const glossary = files.find((f) => f.path === "glossary.md");

  return (
    <GlossaryPanel
      projectId={projectId}
      initialContent={glossary?.content ?? ""}
    />
  );
}
