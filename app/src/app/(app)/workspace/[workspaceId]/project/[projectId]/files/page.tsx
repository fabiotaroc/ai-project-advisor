import { FilesPanel } from "@/components/files/files-panel";
import { getProjectFiles } from "@/lib/server/data";

export default async function FilesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const files = await getProjectFiles(projectId);
  return <FilesPanel projectId={projectId} files={files} />;
}
