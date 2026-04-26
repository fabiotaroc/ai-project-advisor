import { ActivityPanel } from "@/components/activity/activity-panel";
import { getActivity } from "@/lib/server/data";

export default async function ActivityPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const activity = await getActivity(projectId);
  return <ActivityPanel activity={activity} projectId={projectId} />;
}
