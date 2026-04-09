import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/header";
import { ProjectSidebar } from "@/components/layout/sidebar";
import { getSessionUser } from "@/lib/server/auth";
import { getProjectForUser } from "@/lib/server/data";
import { listPendingProjectInvitesForOwner } from "@/lib/server/project-invites";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getSessionUser();
  const project = await getProjectForUser(projectId).catch(() => null);

  if (!project) notFound();

  const pendingInvites =
    project.role === "owner"
      ? await listPendingProjectInvitesForOwner({
          projectId,
          userId: user.id,
        })
      : [];

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-[1400px] flex-1">
        <ProjectSidebar
          projectId={projectId}
          projectName={project.name}
          projectRole={project.role}
          initialInvites={pendingInvites}
        />
        <div className="min-w-0 flex-1 p-4">{children}</div>
      </main>
    </>
  );
}
