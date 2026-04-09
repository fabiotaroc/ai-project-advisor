import { SearchPanel } from "@/components/search/search-panel";

export default async function SearchPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <SearchPanel projectId={projectId} />;
}
