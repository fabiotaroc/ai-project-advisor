import { SettingsPanel } from "@/components/settings/settings-panel";
import { getProjectForUser, getProjectSettings } from "@/lib/server/data";
import { getSessionUser } from "@/lib/server/auth";
import { listProjectMembers } from "@/lib/server/project-members";
import { listPendingProjectInvitesForOwner } from "@/lib/server/project-invites";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [user, settings, project] = await Promise.all([
    getSessionUser(),
    getProjectSettings(projectId),
    getProjectForUser(projectId),
  ]);

  const [members, pendingInvites] = await Promise.all([
    listProjectMembers(projectId),
    project.role === "owner"
      ? listPendingProjectInvitesForOwner({ projectId, userId: user.id })
      : [],
  ]);

  return (
    <SettingsPanel
      projectId={projectId}
      projectRole={project.role}
      initialSettings={settings}
      initialMembers={members}
      initialInvites={pendingInvites}
    />
  );
}
