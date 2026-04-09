import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Files,
  FolderOpen,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { AppHeader } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAccessibleProjects, getCurrentWorkspace } from "@/lib/server/data";

export default async function AppHomePage() {
  const [workspace, projects] = await Promise.all([
    getCurrentWorkspace(),
    getAccessibleProjects(),
  ]);
  const sharedProjects = projects.filter((project) => !project.is_personal);

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-8 px-6 py-8">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="rounded-[2rem] border border-border/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(246,248,252,0.94))] px-6 py-7 shadow-sm">
            <p className="text-[0.72rem] font-medium uppercase tracking-[0.3em] text-muted-foreground">
              Personal workspace
            </p>
            <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
              Select a project and keep moving.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              You are working from <span className="font-medium text-foreground">{workspace.name}</span>.
              Jump into your own projects or continue a collaboration that was shared with you.
            </p>
          </div>

          <Card className="justify-between border border-border/70 bg-card/90 shadow-sm">
            <CardHeader>
              <CardDescription>Workspace snapshot</CardDescription>
              <CardTitle className="text-3xl">{projects.length}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/40 px-3 py-2">
                <span>Projects</span>
                <span className="font-medium text-foreground">{projects.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/40 px-3 py-2">
                <span>Shared with you</span>
                <span className="font-medium text-foreground">{sharedProjects.length}</span>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Projects</p>
              <h2 className="text-2xl font-semibold tracking-tight">Choose what to resume</h2>
            </div>
          </div>

          {projects.length === 0 ? (
            <Card className="border-dashed border-border/80 bg-card/80 py-8 text-center shadow-sm">
              <CardHeader>
                <CardTitle>No projects yet</CardTitle>
                <CardDescription>
                  Projects you create or join will appear here.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <Link key={project.id} href={`/project/${project.id}/chat`} className="group block">
                  <Card className="h-full border border-border/70 bg-card/95 transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md">
                    <CardHeader className="gap-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-2xl border border-border/70 bg-muted/50 p-2.5">
                            <FolderOpen className="size-4 text-foreground" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{project.name}</CardTitle>
                            <CardDescription className="mt-1 flex flex-wrap items-center gap-2">
                              <span>Persistent memory, files, search, and activity in one place.</span>
                              <span className="inline-flex items-center rounded-full border border-border/80 bg-muted/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                {project.is_personal ? "Personal" : "Shared"}
                              </span>
                              {!project.is_personal ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-foreground">
                                  <Users className="size-3" />
                                  {project.role}
                                </span>
                              ) : null}
                            </CardDescription>
                          </div>
                        </div>
                        <ArrowRight className="mt-1 size-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        <div className="rounded-xl border border-border/70 bg-muted/35 px-3 py-2">
                          <Sparkles className="mb-2 size-3.5" />
                          Chat
                        </div>
                        <div className="rounded-xl border border-border/70 bg-muted/35 px-3 py-2">
                          <Files className="mb-2 size-3.5" />
                          Files
                        </div>
                        <div className="rounded-xl border border-border/70 bg-muted/35 px-3 py-2">
                          <Search className="mb-2 size-3.5" />
                          Search
                        </div>
                        <div className="rounded-xl border border-border/70 bg-muted/35 px-3 py-2">
                          <Activity className="mb-2 size-3.5" />
                          Activity
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
