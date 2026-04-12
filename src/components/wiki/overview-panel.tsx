"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Bot, Lock, Pin, ShieldCheck, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/date-format";
import type { ProjectFile } from "@/lib/types";

function extractPreview(content: string, maxLines = 6): string {
  const lines = content
    .split("\n")
    .filter((l) => {
      const trimmed = l.trim();
      return trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("|");
    })
    .slice(0, maxLines);

  return lines.join("\n").slice(0, 300) || "No content yet.";
}

function friendlyName(path: string): string {
  return path
    .replace(/\.md$/, "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function OverviewPanel({
  projectId,
  files,
}: {
  projectId: string;
  files: ProjectFile[];
}) {
  const pinnedFiles = useMemo(
    () => files.filter((f) => f.pinned).sort((a, b) => a.path.localeCompare(b.path)),
    [files],
  );

  const recentlyUpdated = useMemo(
    () =>
      files
        .filter((f) => !f.pinned && f.visibility === "surfaced")
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 4),
    [files],
  );

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold">Project Overview</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Pinned artifacts — the most important project documents at a glance.
        </p>
      </div>

      {pinnedFiles.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pinnedFiles.map((file) => (
            <Link
              key={file.id}
              href={`/project/${projectId}/files`}
              className="group block"
            >
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">
                      {friendlyName(file.path)}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Pin className="size-3 text-muted-foreground" />
                      {file.is_source_of_truth && (
                        <ShieldCheck className="size-3 text-chart-1" />
                      )}
                      {file.locked && <Lock className="size-3 text-muted-foreground" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {file.created_by_agent ? (
                      <span className="inline-flex items-center gap-0.5">
                        <Bot className="size-2.5" /> Agent
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5">
                        <User className="size-2.5" /> User
                      </span>
                    )}
                    <span>·</span>
                    <span>{formatDate(file.updated_at)}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                    {extractPreview(file.content)}
                  </p>
                  {file.is_source_of_truth && (
                    <Badge
                      variant="outline"
                      className="mt-2 gap-1 border-chart-1/30 bg-chart-1/8 text-[10px] text-chart-1"
                    >
                      <ShieldCheck className="size-2.5" />
                      Source of truth
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          No pinned artifacts yet. Pin files from the Wiki to see them here.
        </p>
      )}

      {recentlyUpdated.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Recently Updated</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {recentlyUpdated.map((file) => (
              <Link
                key={file.id}
                href={`/project/${projectId}/files`}
                className="group block"
              >
                <Card className="transition-shadow hover:shadow-md" size="sm">
                  <CardContent className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-medium">
                        {friendlyName(file.path)}
                      </p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatDate(file.updated_at)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {extractPreview(file.content, 2)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
