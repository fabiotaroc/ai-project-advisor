import { redirect } from "next/navigation";
import { SourcesPanel } from "@/components/sources/sources-panel";
import { getSourceDetail, getSources } from "@/lib/server/data";
import { inputViewForSourceType } from "@/lib/source-routing";

export default async function SourcesPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ source?: string; chunk?: string }>;
}) {
  const { projectId } = await params;
  const { source, chunk } = await searchParams;

  if (source) {
    const selectedSource = await getSourceDetail(projectId, source);
    if (selectedSource) {
      const targetView = inputViewForSourceType(selectedSource.type);
      if (targetView !== "files") {
        const nextParams = new URLSearchParams({ source });
        if (chunk) nextParams.set("chunk", chunk);
        redirect(`/project/${projectId}/${targetView}?${nextParams.toString()}`);
      }
    }
  }

  const sources = await getSources(projectId, ["document", "note"]);
  return <SourcesPanel projectId={projectId} sources={sources} view="files" />;
}
