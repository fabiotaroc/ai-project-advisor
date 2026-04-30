import { ReactNode } from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ProjectSidebar } from "@/components/layout/sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
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
  const [project, user, cookieStore] = await Promise.all([
    getProjectForUser(projectId).catch(() => null),
    getSessionUser(),
    cookies(),
  ]);

  if (!project) notFound();

  const conversations = await listProjectConversations(projectId, user.id);
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      className="contents"
      style={{
        "--sidebar-width": "18rem",
        "--sidebar-width-icon": "3.5rem",
      } as React.CSSProperties}
    >
      <main className="flex min-h-svh w-full flex-1">
        <SidebarTrigger className="fixed left-3 top-3 z-30 border border-border/70 bg-card/90 shadow-[var(--shadow-2)] supports-[backdrop-filter]:bg-card/75 supports-[backdrop-filter]:backdrop-blur md:hidden" />
        <ProjectSidebar
          projectId={projectId}
          projectName={project.name}
          userEmail={user.email ?? null}
          conversations={conversations}
        />
        <div className="min-w-0 flex-1 p-4">{children}</div>
      </main>
    </SidebarProvider>
  );
}
