import Link from "next/link";
import { AppHeader } from "@/components/layout/header";
import { getProjectsByWorkspace, getWorkspaces } from "@/lib/server/data";

export default async function WorkspaceIndexPage() {
  const workspaces = await getWorkspaces();
  const workspaceCards = await Promise.all(workspaces.map(async (workspace) => ({ workspace, projects: await getProjectsByWorkspace(workspace.id) })));

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-[1200px] p-6">
        <h1 className="display text-4xl">Your Workspaces</h1>
        <div className="mt-4 space-y-4">
          {workspaceCards.map(({ workspace, projects }) => (
            <section key={workspace.id} className="rounded-xl border border-[var(--line)] bg-white/70 p-4">
              <h2 className="text-xl font-semibold">{workspace.name}</h2>
              <ul className="mt-2 space-y-1">
                {projects.map((project) => (
                  <li key={project.id}><Link className="text-sm text-[var(--accent)] underline-offset-2 hover:underline" href={`/workspace/${workspace.id}/project/${project.id}/chat`}>{project.name}</Link></li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
