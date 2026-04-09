import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/header";
import { ProjectSidebar } from "@/components/layout/sidebar";
import { getProject } from "@/lib/server/data";

export default async function ProjectLayout({ children, params }: { children: ReactNode; params: Promise<{ workspaceId: string; projectId: string }> }) {
  const { workspaceId, projectId } = await params;
  const project = await getProject(projectId).catch(() => null);
  if (!project) notFound();
  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-[1400px] flex-1">
        <ProjectSidebar workspaceId={workspaceId} projectId={projectId} projectName={project.name} current="" />
        <div className="min-w-0 flex-1 p-5">{children}</div>
      </main>
    </>
  );
}
