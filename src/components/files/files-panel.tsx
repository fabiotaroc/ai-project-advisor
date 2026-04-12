"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/date-format";
import { cn } from "@/lib/utils";
import type { ProjectFile } from "@/lib/types";

export function FilesPanel({ projectId, files: initialFiles }: { projectId: string; files: ProjectFile[] }) {
  const [files, setFiles] = useState(initialFiles);
  const [selectedPath, setSelectedPath] = useState(initialFiles[0]?.path ?? "PROJECT.md");
  const [content, setContent] = useState(initialFiles[0]?.content ?? "");

  const selected = useMemo(() => files.find((f) => f.path === selectedPath), [files, selectedPath]);

  async function saveFile() {
    const response = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, path: selectedPath, content }),
    });
    if (!response.ok) return;
    const payload = await response.json();
    setFiles((prev) => [...prev.filter((f) => f.path !== payload.file.path), payload.file].sort((a, b) => a.path.localeCompare(b.path)));
  }

  return (
    <section className="grid h-[calc(100vh-8rem)] grid-cols-[16rem_1fr] gap-3">
      <Card className="py-0">
        <CardHeader className="px-3 pt-3 pb-0">
          <CardTitle className="text-sm font-semibold">Files</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pt-2 pb-3">
          <ul className="flex flex-col gap-0.5">
            {files.map((file) => (
              <li key={file.id}>
                <Button
                  type="button"
                  variant={selectedPath === file.path ? "default" : "ghost"}
                  onClick={() => {
                    setSelectedPath(file.path);
                    setContent(file.content);
                  }}
                  className={cn(
                    "h-auto w-full justify-start px-2 py-1.5 text-left font-mono text-xs font-normal shadow-none",
                  )}
                >
                  {file.path}
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card className="flex min-h-0 flex-col py-0">
        <CardHeader className="border-b border-border px-4 py-2.5">
          <CardTitle className="font-mono text-xs font-medium">{selectedPath}</CardTitle>
          {selected ? (
            <p className="text-xs text-muted-foreground">Updated {formatDateTime(selected.updated_at)}</p>
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
              className="field-sizing-fixed h-full min-h-0 flex-1 overflow-y-auto rounded-none border-0 bg-transparent p-4 font-mono text-sm leading-relaxed shadow-none focus-visible:ring-0"
            />
          </div>
        </CardContent>
        <CardFooter className="shrink-0 justify-end px-4 py-2.5">
          <Button type="button" onClick={saveFile}>
            Save + version
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}
