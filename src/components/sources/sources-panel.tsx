"use client";

import { useCallback, useState } from "react";
import {
  Loader2,
  Mail,
  Presentation,
  FileText,
  MessageSquareText,
  RotateCcw,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/date-format";
import { cn } from "@/lib/utils";
import type { SourceMaterial } from "@/lib/types";
import { SourceUploadZone } from "@/components/sources/source-upload-zone";
import type { StagedFile } from "@/lib/source-classification";

function sourceTypeIcon(type: SourceMaterial["type"], className?: string) {
  const cls = cn("size-4", className);
  switch (type) {
    case "email": return <Mail className={cls} />;
    case "document": return <Presentation className={cls} />;
    case "meeting": return <MessageSquareText className={cls} />;
    case "note": return <FileText className={cls} />;
  }
}

function statusBadge(status: SourceMaterial["status"]) {
  switch (status) {
    case "ready":
      return <Badge variant="secondary" className="text-[10px]">Ready</Badge>;
    case "processing":
      return <Badge variant="outline" className="animate-pulse text-[10px]">Processing…</Badge>;
    case "failed":
      return <Badge variant="destructive" className="text-[10px]">Failed</Badge>;
  }
}

function typeLabel(type: SourceMaterial["type"]): string {
  switch (type) {
    case "email": return "Email";
    case "document": return "Deliverable";
    case "meeting": return "Meeting";
    case "note": return "Note";
  }
}

export function SourcesPanel({
  projectId,
  sources: initialSources,
}: {
  projectId: string;
  sources: SourceMaterial[];
}) {
  const [sources, setSources] = useState(initialSources);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, "pending" | "uploading" | "done" | "failed">>({});
  const [retryingSourceId, setRetryingSourceId] = useState<string | null>(null);

  const uploadAll = useCallback(async () => {
    if (stagedFiles.length === 0 || isUploading) return;
    setIsUploading(true);

    const progress: Record<string, "pending" | "uploading" | "done" | "failed"> = {};
    stagedFiles.forEach((f) => { progress[f.id] = "pending"; });
    setUploadProgress({ ...progress });

    for (const staged of stagedFiles) {
      progress[staged.id] = "uploading";
      setUploadProgress({ ...progress });

      try {
        const formData = new FormData();
        formData.append("file", staged.file);
        formData.append("projectId", projectId);
        formData.append("category", staged.category);

        const response = await fetch("/api/sources/upload", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const { source } = await response.json();
          setSources((prev) => [source, ...prev]);
          progress[staged.id] = source.status === "failed" ? "failed" : "done";
        } else {
          progress[staged.id] = "failed";
        }
      } catch {
        progress[staged.id] = "failed";
      }

      setUploadProgress({ ...progress });
    }

    const failedIds = new Set(
      Object.entries(progress)
        .filter(([, status]) => status === "failed")
        .map(([id]) => id),
    );

    setStagedFiles((prev) => prev.filter((f) => failedIds.has(f.id)));
    setIsUploading(false);
    setUploadProgress({});
  }, [stagedFiles, isUploading, projectId]);

  const retryIngestion = useCallback(async (sourceId: string) => {
    if (retryingSourceId) return;
    setRetryingSourceId(sourceId);
    try {
      const response = await fetch(`/api/sources/${sourceId}/retry`, { method: "POST" });
      const data = await response.json();
      if (response.ok && data.source) {
        setSources((prev) => prev.map((s) => (s.id === sourceId ? data.source : s)));
      }
    } finally {
      setRetryingSourceId(null);
    }
  }, [retryingSourceId]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Sources</h1>
        {stagedFiles.length > 0 && (
          <Button onClick={uploadAll} disabled={isUploading}>
            {isUploading ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Upload data-icon="inline-start" />
            )}
            {isUploading
              ? "Uploading…"
              : `Upload ${stagedFiles.length} file${stagedFiles.length !== 1 ? "s" : ""}`}
          </Button>
        )}
      </div>

      <SourceUploadZone onFilesStaged={setStagedFiles} />

      {Object.keys(uploadProgress).length > 0 && (
        <div className="flex flex-col gap-1">
          {stagedFiles.map((f) => {
            const status = uploadProgress[f.id];
            return (
              <div
                key={f.id}
                className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm"
              >
                {status === "uploading" && <Loader2 className="size-3.5 animate-spin text-primary" />}
                {status === "done" && <span className="text-xs text-green-600">✓</span>}
                {status === "failed" && <span className="text-xs text-destructive">✗</span>}
                <span className="truncate">{f.name}</span>
                <span className="ml-auto text-xs capitalize text-muted-foreground">{status}</span>
              </div>
            );
          })}
        </div>
      )}

      {sources.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">Uploaded Sources</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {sources.map((source) => (
              <Card key={source.id} size="sm">
                <CardContent className="flex items-start gap-3 px-3 py-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    {sourceTypeIcon(source.type)}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="min-w-0 truncate text-sm font-medium leading-tight">{source.title}</h3>
                      {statusBadge(source.status)}
                      {(source.status === "processing" || source.status === "failed") && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 px-2 text-[11px] shrink-0"
                          disabled={retryingSourceId === source.id}
                          title="Re-run extraction and embedding from the stored file"
                          onClick={() => void retryIngestion(source.id)}
                        >
                          {retryingSourceId === source.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <RotateCcw className="size-3" />
                          )}
                          Retry
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        {sourceTypeIcon(source.type, "size-3")}
                        {typeLabel(source.type)}
                      </span>
                      <span>·</span>
                      <span>{formatDate(source.created_at)}</span>
                    </div>
                    {source.summary && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{source.summary}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {sources.length === 0 && stagedFiles.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No sources yet. Upload files above to get started.
        </p>
      )}
    </div>
  );
}
