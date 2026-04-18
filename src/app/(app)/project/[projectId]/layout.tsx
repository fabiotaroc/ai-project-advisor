import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/header";
import { ProjectSidebar } from "@/components/layout/sidebar";
import { getProjectForUser } from "@/lib/server/data";
import { getSessionUser } from "@/lib/server/auth";
import { listProjectConversations } from "@/lib/server/chat-history";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [project, user] = await Promise.all([
    getProjectForUser(projectId).catch(() => null),
    getSessionUser(),
  ]);

  if (!project) notFound();

  const conversations = await listProjectConversations(projectId, user.id);

  return (
    <>
      <AppHeader />
      <main className="flex w-full flex-1">
        <ProjectSidebar
          projectId={projectId}
          projectName={project.name}
          conversations={conversations}
        />
        <div className="min-w-0 flex-1 p-4">{children}</div>
      </main>
    </>
  );
}
