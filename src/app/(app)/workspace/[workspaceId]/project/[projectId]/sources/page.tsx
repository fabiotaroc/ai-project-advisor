import { SourcesPanel } from "@/components/sources/sources-panel";
import { getSources } from "@/lib/server/data";

export default async function SourcesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const sources = await getSources(projectId);
  return <SourcesPanel sources={sources} />;
}
