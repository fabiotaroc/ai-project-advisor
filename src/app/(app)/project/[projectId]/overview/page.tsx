import { getProjectFiles } from "@/lib/server/data";
import { OverviewPanel } from "@/components/wiki/overview-panel";

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const files = await getProjectFiles(projectId);

  return <OverviewPanel projectId={projectId} files={files} />;
}
