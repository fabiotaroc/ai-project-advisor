"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LockOpen,
  Pin,
  PinOff,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDateTime } from "@/lib/date-format";
import { cn } from "@/lib/utils";
import type { ProjectFile } from "@/lib/types";

function FileMetaBadges({
  file,
  onPrimary = false,
}: {
  file: ProjectFile;
  onPrimary?: boolean;
}) {
  const onPrimaryClass =
    "border-primary-foreground/35 bg-primary-foreground/15 text-primary-foreground [&>svg]:opacity-90";

  return (
    <div className="flex flex-wrap items-center gap-1">
      {file.pinned && (
        <Badge
          variant="secondary"
          className={cn("gap-1 text-[10px]", onPrimary && onPrimaryClass)}
        >
          <Pin className="size-2.5" />
          Pinned
        </Badge>
      )}
      {file.is_source_of_truth && (
        <Badge
          variant="outline"
          className={cn(
            "gap-1 text-[10px]",
            onPrimary
              ? onPrimaryClass
              : "border-chart-1/30 bg-chart-1/8 text-chart-1",
          )}
        >
          <ShieldCheck className="size-2.5" />
          Source of truth
        </Badge>
      )}
      {file.locked && (
        <Badge
          variant="outline"
          className={cn("gap-1 text-[10px]", onPrimary && onPrimaryClass)}
        >
          <Lock className="size-2.5" />
          Locked
        </Badge>
      )}
      {file.created_by_agent && (
        <Badge
          variant="secondary"
          className={cn("gap-1 text-[10px]", onPrimary && onPrimaryClass)}
        >
          <Bot className="size-2.5" />
          Agent
        </Badge>
      )}
    </div>
  );
}

function FileControlButtons({
  file,
  onToggle,
}: {
  file: ProjectFile;
  onToggle: (id: string, field: string, value: boolean) => void;
}) {
  const controls = [
    {
      field: "pinned",
      active: file.pinned,
      iconOn: PinOff,
      iconOff: Pin,
      tipOn: "Unpin",
      tipOff: "Pin",
    },
    {
      field: "is_source_of_truth",
      active: file.is_source_of_truth,
      iconOn: ShieldOff,
      iconOff: ShieldCheck,
      tipOn: "Remove authority",
      tipOff: "Mark as source of truth",
    },
    {
      field: "locked",
      active: file.locked,
      iconOn: LockOpen,
      iconOff: Lock,
      tipOn: "Unlock",
      tipOff: "Lock",
    },
    {
      field: "visibility",
      active: file.visibility === "internal",
      iconOn: Eye,
      iconOff: EyeOff,
      tipOn: "Make surfaced",
      tipOff: "Make internal",
    },
  ] as const;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-0.5">
        {controls.map(({ field, active, iconOn: IconOn, iconOff: IconOff, tipOn, tipOff }) => {
          const Icon = active ? IconOn : IconOff;
          const tip = active ? tipOn : tipOff;
          return (
            <Tooltip key={field}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => {
                    if (field === "visibility") {
                      onToggle(file.id, field, !active);
                    } else {
                      onToggle(file.id, field, !active);
                    }
                  }}
                >
                  <Icon className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {tip}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

type LintStatus =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; summary: string | null; actions: number; suggestions: number }
  | { kind: "error"; message: string };

export function WikiPanel({
  projectId,
  files: initialFiles,
}: {
  projectId: string;
  files: ProjectFile[];
}) {
  const router = useRouter();
  const [files, setFiles] = useState(initialFiles);
  const [selectedPath, setSelectedPath] = useState(initialFiles[0]?.path ?? "PROJECT.md");
  const [content, setContent] = useState(initialFiles[0]?.content ?? "");
  const [lintStatus, setLintStatus] = useState<LintStatus>({ kind: "idle" });

  useEffect(() => {
    setFiles(initialFiles);
  }, [initialFiles]);

  async function runWikiLint() {
    if (lintStatus.kind === "running") return;
    setLintStatus({ kind: "running" });
    try {
      const response = await fetch(`/api/projects/${projectId}/librarian`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "lint" }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setLintStatus({
          kind: "error",
          message: payload?.error ?? `Request failed (${response.status})`,
        });
        return;
      }
      const payload = (await response.json()) as {
        run?: {
          status: "succeeded" | "failed" | "skipped";
          summary: string | null;
          actions: unknown[];
          suggestions: unknown[];
          error?: string;
        };
      };
      const run = payload.run;
      if (!run) {
        setLintStatus({ kind: "error", message: "Empty response from Librarian." });
        return;
      }
      if (run.status === "failed") {
        setLintStatus({
          kind: "error",
          message: run.error ?? "Librarian run failed.",
        });
        return;
      }

      setLintStatus({
        kind: "done",
        summary: run.summary,
        actions: run.actions?.length ?? 0,
        suggestions: run.suggestions?.length ?? 0,
      });

      router.refresh();
    } catch (err) {
      setLintStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const surfacedFiles = useMemo(
    () => files.filter((f) => f.visibility === "surfaced"),
    [files],
  );

  const selected = useMemo(
    () => files.find((f) => f.path === selectedPath),
    [files, selectedPath],
  );

  async function saveFile() {
    const response = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, path: selectedPath, content }),
    });
    if (!response.ok) return;
    const payload = await response.json();
    setFiles((prev) =>
      [...prev.filter((f) => f.path !== payload.file.path), payload.file].sort((a, b) =>
        a.path.localeCompare(b.path),
      ),
    );
  }

  async function toggleFileMeta(fileId: string, field: string, value: boolean) {
    const file = files.find((f) => f.id === fileId);
    if (!file) return;

    const updatePayload: Record<string, unknown> = {};
    if (field === "visibility") {
      updatePayload.visibility = value ? "internal" : "surfaced";
    } else {
      updatePayload[field] = value;
    }

    const optimistic = files.map((f) =>
      f.id === fileId
        ? {
            ...f,
            ...(field === "visibility"
              ? { visibility: (value ? "internal" : "surfaced") as "surfaced" | "internal" }
              : { [field]: value }),
          }
        : f,
    );
    setFiles(optimistic);

    const response = await fetch("/api/files/meta", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, fileId, ...updatePayload }),
    });
    if (!response.ok) {
      setFiles(files);
    }
  }

  function renderFileList(fileList: ProjectFile[]) {
    return (
      <ul className="flex flex-col gap-0.5">
        {fileList.map((file) => (
          <li key={file.id}>
            <button
              type="button"
              onClick={() => {
                setSelectedPath(file.path);
                setContent(file.content);
              }}
              className={cn(
                "flex w-full flex-col gap-1 rounded-md px-2.5 py-2 text-left transition-colors",
                selectedPath === file.path
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent",
              )}
            >
              <div className="flex items-center gap-2">
                {file.created_by_agent ? (
                  <Bot className="size-3 shrink-0 opacity-50" />
                ) : (
                  <User className="size-3 shrink-0 opacity-50" />
                )}
                <span className="truncate font-mono text-xs font-medium">{file.path}</span>
              </div>
              <FileMetaBadges file={file} onPrimary={selectedPath === file.path} />
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="grid h-[calc(100vh-8rem)] grid-cols-[18rem_1fr] gap-3">
      <Card className="flex min-h-0 flex-col py-0">
        <CardHeader className="shrink-0 gap-2 px-3 pt-3 pb-0">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold">Wiki</CardTitle>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 px-2 text-xs"
                    onClick={runWikiLint}
                    disabled={lintStatus.kind === "running"}
                  >
                    {lintStatus.kind === "running" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="size-3.5" />
                    )}
                    {lintStatus.kind === "running" ? "Curating…" : "Curate"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[15rem] text-xs">
                  Runs the Librarian over every file to check for stale content,
                  contradictions, orphans, missing pages, and index gaps.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {lintStatus.kind !== "idle" && (
            <div
              className={cn(
                "rounded-md border px-2 py-1.5 text-[11px] leading-snug",
                lintStatus.kind === "error"
                  ? "border-destructive/30 bg-destructive/5 text-destructive"
                  : "border-border bg-muted/40 text-muted-foreground",
              )}
            >
              {lintStatus.kind === "running" && (
                <span>Librarian is reviewing the wiki — usually under a minute.</span>
              )}
              {lintStatus.kind === "done" && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-foreground">
                    {lintStatus.actions} change
                    {lintStatus.actions === 1 ? "" : "s"}, {lintStatus.suggestions} suggestion
                    {lintStatus.suggestions === 1 ? "" : "s"}.
                  </span>
                  {lintStatus.summary && (
                    <span className="line-clamp-3">{lintStatus.summary}</span>
                  )}
                </div>
              )}
              {lintStatus.kind === "error" && <span>Lint failed: {lintStatus.message}</span>}
            </div>
          )}
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-hidden px-3 pt-2 pb-3">
          <Tabs defaultValue="surfaced" className="flex h-full flex-col">
            <TabsList className="w-full shrink-0">
              <TabsTrigger value="surfaced" className="flex-1 text-xs">
                Artifacts
              </TabsTrigger>
              <TabsTrigger value="all" className="flex-1 text-xs">
                All files
              </TabsTrigger>
            </TabsList>
            <TabsContent value="surfaced" className="mt-2 min-h-0 flex-1 overflow-y-auto">
              {renderFileList(surfacedFiles)}
            </TabsContent>
            <TabsContent value="all" className="mt-2 min-h-0 flex-1 overflow-y-auto">
              {renderFileList(files)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="flex min-h-0 flex-col py-0">
        <CardHeader className="shrink-0 border-b border-border px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <CardTitle className="font-mono text-xs font-medium">{selectedPath}</CardTitle>
              {selected ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Updated {formatDateTime(selected.updated_at)}
                </p>
              ) : null}
            </div>
            {selected ? (
              <FileControlButtons file={selected} onToggle={toggleFileMeta} />
            ) : null}
          </div>
          {selected ? (
            <div className="mt-1.5">
              <FileMetaBadges file={selected} />
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 overflow-hidden px-0 py-0">
          <div className="flex min-h-0 w-full flex-1 overflow-hidden">
            <Label htmlFor="file-content" className="sr-only">
              File content
            </Label>
            <Textarea
              id="file-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              disabled={selected?.locked}
              className="field-sizing-fixed h-full min-h-0 flex-1 overflow-y-auto rounded-none border-0 bg-transparent p-4 font-mono text-sm leading-relaxed shadow-none focus-visible:ring-0"
            />
          </div>
        </CardContent>
        <CardFooter className="shrink-0 justify-end gap-2 px-4 py-2.5">
          {selected?.locked && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="size-3" />
              This file is locked
            </span>
          )}
          <Button type="button" onClick={saveFile} disabled={selected?.locked}>
            Save + version
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}
