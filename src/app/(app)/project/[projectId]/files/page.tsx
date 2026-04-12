import { WikiPanel } from "@/components/wiki/wiki-panel";
import { getProjectFiles } from "@/lib/server/data";

export default async function FilesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const files = await getProjectFiles(projectId);
  return <WikiPanel projectId={projectId} files={files} />;
}
