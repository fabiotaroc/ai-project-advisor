import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  FolderOpen,
  Loader2,
  Sparkles,
  UploadCloud,
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
import { getAccessibleProjectsSummary } from "@/lib/server/data";
import { formatRelative } from "@/lib/date-format";
import type { ProjectSummary } from "@/lib/types";

export default async function AppHomePage() {
  const projects = await getAccessibleProjectsSummary();

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-8 px-6 py-8">
        <section className="space-y-4">
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
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function ProjectCard({ project }: { project: ProjectSummary }) {
  const contextLine = [project.client_name, project.project_phase]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" · ");
  const subtitle = contextLine || project.description?.trim() || null;

  return (
    <Link href={`/project/${project.id}/chat`} className="group block">
      <Card className="h-full border border-border/70 bg-card/95 transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md">
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="rounded-2xl border border-border/70 bg-muted/50 p-2.5">
                <FolderOpen className="size-4 text-foreground" />
              </div>
              <div className="min-w-0">
                <CardTitle className="truncate text-lg">{project.name}</CardTitle>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center rounded-full border border-border/80 bg-muted/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {project.is_owned ? "Owned" : "Shared"}
                  </span>
                  {!project.is_owned ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-foreground">
                      {project.role}
                    </span>
                  ) : null}
                  {project.sources_processing > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-warning/35 bg-warning/12 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-warning">
                      <Loader2 className="size-3 animate-spin" />
                      {project.sources_processing} processing
                    </span>
                  ) : null}
                  {project.sources_failed > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-destructive dark:bg-destructive/20">
                      <AlertTriangle className="size-3" />
                      {project.sources_failed} failed
                    </span>
                  ) : null}
                </div>
                {subtitle ? (
                  <CardDescription className="mt-2 line-clamp-2">{subtitle}</CardDescription>
                ) : null}
              </div>
            </div>
            <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Metric
              icon={<UploadCloud className="size-3.5" />}
              label="Sources"
              value={project.sources_count}
            />
            <Metric
              icon={<Users className="size-3.5" />}
              label="Members"
              value={project.members_count}
            />
            <Metric
              icon={<Clock className="size-3.5" />}
              label="Last active"
              value={
                project.last_activity_at ? formatRelative(project.last_activity_at) : "—"
              }
            />
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-foreground/70" />
            <p className="line-clamp-2 leading-5">
              {project.last_activity_summary ?? "No activity yet — open the project to start a chat or add sources."}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/35 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}
