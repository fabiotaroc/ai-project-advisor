"use client";

import { useState } from "react";
import { Mail, Presentation, FileSpreadsheet, FileText, MessageSquareText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
      return <Badge variant="outline" className="text-[10px]">Processing</Badge>;
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

export function SourcesPanel({ sources }: { sources: SourceMaterial[] }) {
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">Sources</h1>
        {stagedFiles.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {stagedFiles.length} file{stagedFiles.length !== 1 ? "s" : ""} staged for upload
          </span>
        )}
      </div>

      <SourceUploadZone onFilesStaged={setStagedFiles} />

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
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-medium leading-tight">{source.title}</h3>
                      {statusBadge(source.status)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        {sourceTypeIcon(source.type, "size-3")}
                        {typeLabel(source.type)}
                      </span>
                      <span>·</span>
                      <span>{new Date(source.created_at).toLocaleDateString()}</span>
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
