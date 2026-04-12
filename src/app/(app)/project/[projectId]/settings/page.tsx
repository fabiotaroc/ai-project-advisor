import { SettingsPanel } from "@/components/settings/settings-panel";
import { getProjectSettings } from "@/lib/server/data";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const settings = await getProjectSettings(projectId);
  return <SettingsPanel projectId={projectId} initialSettings={settings} />;
}
