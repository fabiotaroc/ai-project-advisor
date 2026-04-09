import { ActivityPanel } from "@/components/activity/activity-panel";
import { getActivity } from "@/lib/server/data";

export default async function ActivityPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const events = await getActivity(projectId);
  return <ActivityPanel events={events} />;
}
