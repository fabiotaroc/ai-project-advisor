"use client";

import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  FileUp,
  Loader2,
  Mail,
  Presentation,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  type StagedFile,
  type SourceCategory,
  classifyFile,
  isAcceptedFile,
  buildAcceptString,
  categoryLabel,
  formatFileSize,
  getFileExtension,
} from "@/lib/source-classification";

let nextId = 0;
function uid() {
  return `staged-${++nextId}-${Date.now()}`;
}

const CATEGORY_OPTIONS: SourceCategory[] = ["email", "document", "meeting", "note"];

export type SourceUploadStatus = "pending" | "uploading" | "done" | "failed";

function categoryIcon(cat: SourceCategory, className?: string) {
  const cls = cn("size-4", className);
  switch (cat) {
    case "email": return <Mail className={cls} />;
    case "document": return <Presentation className={cls} />;
    case "meeting": return <Users className={cls} />;
    case "note": return <FileText className={cls} />;
  }
}

function extIcon(name: string, className?: string) {
  const ext = getFileExtension(name);
  const cls = cn("size-5 text-muted-foreground", className);
  switch (ext) {
    case ".eml": return <Mail className={cls} />;
    case ".pptx": return <Presentation className={cls} />;
    case ".xlsx": return <FileSpreadsheet className={cls} />;
    default: return <FileText className={cls} />;
  }
}

export function SourceUploadZone({
  stagedFiles,
  onStagedFilesChange,
  disabled = false,
  uploadProgress = {},
}: {
  stagedFiles: StagedFile[];
  onStagedFilesChange: Dispatch<SetStateAction<StagedFile[]>>;
  disabled?: boolean;
  uploadProgress?: Partial<Record<string, SourceUploadStatus>>;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    if (disabled) return;
    const files = Array.from(fileList).filter(isAcceptedFile);
    if (files.length === 0) return;

    const classified = await Promise.all(
      files.map(async (file) => {
        const { category, categoryConfidence } = await classifyFile(file);
        return {
          id: uid(),
          file,
          name: file.name,
          size: file.size,
          category,
          categoryConfidence,
        } satisfies StagedFile;
      })
    );

    onStagedFilesChange((prev) => [...prev, ...classified]);
  }, [disabled, onStagedFilesChange]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
      e.target.value = "";
    },
    [processFiles]
  );

  const removeFile = useCallback((id: string) => {
    onStagedFilesChange((prev) => prev.filter((f) => f.id !== id));
  }, [onStagedFilesChange]);

  const changeCategory = useCallback((id: string, category: SourceCategory) => {
    onStagedFilesChange((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, category, categoryConfidence: "high" as const } : f
      )
    );
    setOpenPicker(null);
  }, [onStagedFilesChange]);

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "group relative flex min-h-[11rem] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 transition-all",
          isDragOver
            ? "border-ring bg-ring/5 text-foreground"
            : "border-border bg-muted/30 text-muted-foreground hover:border-ring/50 hover:bg-muted/50 hover:text-foreground",
          disabled && "cursor-not-allowed opacity-60 hover:border-border hover:bg-muted/30 hover:text-muted-foreground",
        )}
      >
        <div
          className={cn(
            "flex size-11 items-center justify-center rounded-lg transition-colors",
            isDragOver ? "bg-ring/10 text-ring" : "bg-muted text-muted-foreground group-hover:bg-accent group-hover:text-foreground",
          )}
        >
          <FileUp className="size-5" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-medium">
            {isDragOver ? "Drop files here" : "Click to browse or drag and drop"}
          </span>
          <span className="text-xs text-muted-foreground">
            .eml, .pptx, .xlsx, .txt, .vtt, .srt, .md
          </span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={buildAcceptString()}
          multiple
          className="hidden"
          onChange={handleInputChange}
        />
      </button>

      {/* Staged files */}
      {stagedFiles.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">
              {stagedFiles.length} {stagedFiles.length === 1 ? "file" : "files"} ready
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={disabled}
              onClick={() => {
                onStagedFilesChange([]);
                setOpenPicker(null);
              }}
              className="text-muted-foreground"
            >
              Clear all
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            {stagedFiles.map((staged) => {
              const uploadStatus = uploadProgress[staged.id];

              return (
                <Card
                  key={staged.id}
                  size="sm"
                  className="overflow-visible flex-row items-center gap-3 px-3 py-2.5"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    {extIcon(staged.name)}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium leading-tight">{staged.name}</span>
                    <span className="text-xs text-muted-foreground">{formatFileSize(staged.size)}</span>
                  </div>

                  {uploadStatus && uploadStatusBadge(uploadStatus)}

                  {/* Category picker */}
                  <div className="relative">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => setOpenPicker(openPicker === staged.id ? null : staged.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                        "border-border bg-background text-foreground hover:bg-muted",
                        disabled && "cursor-not-allowed opacity-60 hover:bg-background",
                      )}
                    >
                      {categoryIcon(staged.category, "size-3")}
                      {categoryLabel(staged.category)}
                      <ChevronDown className="size-3 text-muted-foreground" />
                    </button>

                    {openPicker === staged.id && !disabled && (
                      <div className="absolute right-0 z-10 mt-1 w-48 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-md">
                        {CATEGORY_OPTIONS.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => changeCategory(staged.id, opt)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors",
                              staged.category === opt
                                ? "bg-muted text-foreground"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            {categoryIcon(opt, "size-3.5")}
                            <span className="flex-1 text-left">{categoryLabel(opt)}</span>
                            {staged.category === opt && <Check className="size-3" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {staged.categoryConfidence !== "high" && (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      Auto-detected
                    </Badge>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={disabled}
                    onClick={() => removeFile(staged.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function uploadStatusBadge(status: SourceUploadStatus) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="outline" className="shrink-0 text-[10px]">
          Queued
        </Badge>
      );
    case "uploading":
      return (
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          <Loader2 data-icon="inline-start" className="animate-spin" />
          Uploading
        </Badge>
      );
    case "done":
      return (
        <Badge variant="outline" className="shrink-0 border-success/30 text-[10px] text-success">
          <CheckCircle2 data-icon="inline-start" />
          Done
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="shrink-0 text-[10px]">
          <AlertCircle data-icon="inline-start" />
          Failed
        </Badge>
      );
  }
}
