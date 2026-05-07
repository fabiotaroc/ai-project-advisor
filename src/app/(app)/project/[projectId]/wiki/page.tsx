import { WikiPanel } from "@/components/wiki/wiki-panel";
import { listCanonicalDocs } from "@/lib/server/canonical-docs";

export default async function FilesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const docs = await listCanonicalDocs(projectId);
  return <WikiPanel projectId={projectId} docs={docs} />;
}
