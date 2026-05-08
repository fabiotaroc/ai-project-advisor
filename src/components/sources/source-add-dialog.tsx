"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from "react";
import { AlertCircle, CheckCircle2, Clipboard, Loader2, Plus, Upload, UploadCloud } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { SourceUploadZone, type SourceUploadStatus } from "@/components/sources/source-upload-zone";
import type { StagedFile } from "@/lib/source-classification";
import type { SourceMaterialDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

type UploadPhase = "idle" | "uploading" | "success" | "failed";
type ImportMode = "upload" | "paste";

const SUCCESS_CLOSE_DELAY_MS = 950;
const PASTED_MEETING_ID = "pasted-meeting";

export function SourceAddDialog({
  projectId,
  onSourceAdded,
  triggerLabel = "Add source",
  dialogTitle = "Add source",
  dialogDescription = "Drop files to stage them. Categories are auto-detected, then you can adjust before uploading.",
  allowPastedMeetingImport = false,
}: {
  projectId: string;
  onSourceAdded: (source: SourceMaterialDetail) => void;
  triggerLabel?: string;
  dialogTitle?: string;
  dialogDescription?: string;
  allowPastedMeetingImport?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>("upload");
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [pastedTitle, setPastedTitle] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [uploadProgress, setUploadProgress] = useState<Record<string, SourceUploadStatus>>({});
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearCloseTimer();
    setImportMode("upload");
    setStagedFiles([]);
    setPastedTitle("");
    setPastedText("");
    setUploadProgress({});
    setUploadPhase("idle");
    setFailureMessage(null);
  }, [clearCloseTimer]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  const uploadStats = useMemo(() => {
    const statuses = Object.values(uploadProgress);
    const total =
      statuses.length ||
      (uploadPhase !== "idle" && importMode === "paste" ? 1 : stagedFiles.length);
    return {
      completed: statuses.filter((status) => status === "done").length,
      failed: statuses.filter((status) => status === "failed").length,
      total,
      activeFileName:
        uploadProgress[PASTED_MEETING_ID] === "uploading"
          ? pastedTitle.trim() || "Pasted meeting"
          : stagedFiles.find((file) => uploadProgress[file.id] === "uploading")?.name ??
            stagedFiles.find((file) => uploadProgress[file.id] === "pending")?.name ??
            null,
    };
  }, [importMode, pastedTitle, stagedFiles, uploadPhase, uploadProgress]);

  const handleStagedFilesChange = useCallback((next: SetStateAction<StagedFile[]>) => {
    setStagedFiles(next);
    if (uploadPhase === "failed") {
      setUploadProgress({});
      setUploadPhase("idle");
      setFailureMessage(null);
    }
  }, [uploadPhase]);

  const handleOpenChange = useCallback((next: boolean) => {
    if (isUploading || uploadPhase === "success") return;
    setOpen(next);
    if (!next) reset();
  }, [isUploading, reset, uploadPhase]);

  const uploadAll = useCallback(async () => {
    if (stagedFiles.length === 0 || isUploading) return;
    clearCloseTimer();
    setIsUploading(true);
    setUploadPhase("uploading");
    setFailureMessage(null);

    const progress: Record<string, SourceUploadStatus> = {};
    stagedFiles.forEach((f) => {
      progress[f.id] = "pending";
    });
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
          const { source } = (await response.json()) as { source: SourceMaterialDetail };
          onSourceAdded(source);
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

    if (failedIds.size === 0) {
      setUploadPhase("success");
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setOpen(false);
        reset();
      }, SUCCESS_CLOSE_DELAY_MS);
    } else {
      setUploadPhase("failed");
      setFailureMessage(
        `${failedIds.size} ${failedIds.size === 1 ? "file needs" : "files need"} attention before the upload can finish.`,
      );
    }
  }, [clearCloseTimer, stagedFiles, isUploading, projectId, onSourceAdded, reset]);

  const importPastedMeeting = useCallback(async () => {
    const title = pastedTitle.trim();
    const text = pastedText.trim();
    if (!title || !text || isUploading) return;

    clearCloseTimer();
    setIsUploading(true);
    setUploadPhase("uploading");
    setFailureMessage(null);
    setUploadProgress({ [PASTED_MEETING_ID]: "uploading" });

    try {
      const file = new File([text], ensureTextFileName(title), { type: "text/plain" });
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);
      formData.append("category", "meeting");

      const response = await fetch("/api/sources/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const { source } = (await response.json()) as { source: SourceMaterialDetail };
        onSourceAdded(source);

        if (source.status === "failed") {
          setUploadProgress({ [PASTED_MEETING_ID]: "failed" });
          setUploadPhase("failed");
          setFailureMessage("The pasted meeting was saved, but processing needs attention.");
        } else {
          setUploadProgress({ [PASTED_MEETING_ID]: "done" });
          setUploadPhase("success");
          closeTimerRef.current = setTimeout(() => {
            closeTimerRef.current = null;
            setOpen(false);
            reset();
          }, SUCCESS_CLOSE_DELAY_MS);
        }
      } else {
        setUploadProgress({ [PASTED_MEETING_ID]: "failed" });
        setUploadPhase("failed");
        setFailureMessage("The pasted meeting could not be imported. Please try again.");
      }
    } catch {
      setUploadProgress({ [PASTED_MEETING_ID]: "failed" });
      setUploadPhase("failed");
      setFailureMessage("The pasted meeting could not be imported. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }, [clearCloseTimer, isUploading, onSourceAdded, pastedText, pastedTitle, projectId, reset]);

  const isUploadLocked = isUploading || uploadPhase === "success";
  const showStatusPanel = uploadPhase !== "idle";
  const canImportPastedMeeting = pastedTitle.trim().length > 0 && pastedText.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus data-icon="inline-start" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl" showCloseButton={!isUploadLocked}>
        <DialogHeader className="pr-8">
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        {showStatusPanel && (
          <UploadStatusPanel
            phase={uploadPhase}
            total={uploadStats.total}
            completed={uploadStats.completed}
            failed={uploadStats.failed}
            activeFileName={uploadStats.activeFileName}
            message={failureMessage}
          />
        )}

        {!isUploadLocked && allowPastedMeetingImport && (
          <Tabs
            value={importMode}
            onValueChange={(value) => {
              setImportMode(value as ImportMode);
              if (uploadPhase === "failed") {
                setUploadProgress({});
                setUploadPhase("idle");
                setFailureMessage(null);
              }
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">
                <Upload data-icon="inline-start" />
                Upload file
              </TabsTrigger>
              <TabsTrigger value="paste">
                <Clipboard data-icon="inline-start" />
                Paste text
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="mt-2">
              <SourceUploadZone
                stagedFiles={stagedFiles}
                onStagedFilesChange={handleStagedFilesChange}
                uploadProgress={uploadProgress}
              />
            </TabsContent>
            <TabsContent value="paste" className="mt-2">
              <PastedMeetingForm
                title={pastedTitle}
                text={pastedText}
                onTitleChange={setPastedTitle}
                onTextChange={setPastedText}
              />
            </TabsContent>
          </Tabs>
        )}

        {!isUploadLocked && !allowPastedMeetingImport && (
          <SourceUploadZone
            stagedFiles={stagedFiles}
            onStagedFilesChange={handleStagedFilesChange}
            uploadProgress={uploadProgress}
          />
        )}

        {!isUploadLocked && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
            <Button
              onClick={importMode === "paste" ? importPastedMeeting : uploadAll}
              disabled={importMode === "paste" ? !canImportPastedMeeting : stagedFiles.length === 0}
            >
              <Upload data-icon="inline-start" />
              {getActionLabel({
                importMode,
                uploadPhase,
                stagedCount: stagedFiles.length,
              })}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ensureTextFileName(title: string) {
  const base = title
    .trim()
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return `${base || "pasted-meeting"}.txt`;
}

function getActionLabel({
  importMode,
  uploadPhase,
  stagedCount,
}: {
  importMode: ImportMode;
  uploadPhase: UploadPhase;
  stagedCount: number;
}) {
  if (uploadPhase === "failed") return "Try again";
  if (importMode === "paste") return "Import pasted meeting";
  if (stagedCount === 0) return "Upload";
  return `Upload ${stagedCount} file${stagedCount !== 1 ? "s" : ""}`;
}

function PastedMeetingForm({
  title,
  text,
  onTitleChange,
  onTextChange,
}: {
  title: string;
  text: string;
  onTitleChange: (value: string) => void;
  onTextChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/20 p-4">
      <div className="grid gap-2">
        <Label htmlFor="pasted-meeting-title">Meeting title</Label>
        <Input
          id="pasted-meeting-title"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="e.g. Weekly client sync"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="pasted-meeting-text">Transcript or notes</Label>
        <Textarea
          id="pasted-meeting-text"
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="Paste the meeting transcript, notes, or action-item recap..."
          className="field-sizing-fixed h-64 max-h-[50vh] min-h-64 resize-y overflow-y-auto"
        />
        <p className="text-xs text-muted-foreground">
          Pasted text is imported as a meeting transcript and processed like an uploaded text file.
        </p>
      </div>
    </div>
  );
}

function UploadStatusPanel({
  phase,
  total,
  completed,
  failed,
  activeFileName,
  message,
}: {
  phase: UploadPhase;
  total: number;
  completed: number;
  failed: number;
  activeFileName: string | null;
  message: string | null;
}) {
  const isSuccess = phase === "success";
  const isFailed = phase === "failed";
  const title = isSuccess
    ? total === 1
      ? "Source uploaded"
      : "Sources uploaded"
    : isFailed
      ? "Upload needs attention"
      : total === 1
        ? "Uploading source"
        : `Uploading ${total} files`;
  const description = isSuccess
    ? "Success. Closing this dialog now."
    : isFailed
      ? message ?? "Something failed. Review the remaining files and try again."
      : activeFileName
        ? `Working on ${activeFileName}`
        : "Preparing files for extraction.";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/70 bg-card p-5 ring-1 ring-border/20",
        isSuccess && "border-success/30",
        isFailed && "border-destructive/30",
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-ring/30" />
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <StatusOrb phase={phase} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div>
            <h3 className="text-base font-semibold tracking-tight">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              {completed} / {total} complete
            </span>
            {failed > 0 && (
              <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-destructive">
                {failed} failed
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusOrb({ phase }: { phase: UploadPhase }) {
  const isSuccess = phase === "success";
  const isFailed = phase === "failed";

  return (
    <div
      className={cn(
        "relative flex size-16 shrink-0 items-center justify-center rounded-full bg-muted/40",
        isSuccess && "bg-success/10 text-success",
        isFailed && "bg-destructive/10 text-destructive",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 rounded-full border-2 border-border/70",
          phase === "uploading" && "animate-spin border-t-ring",
          isSuccess && "border-success/40",
          isFailed && "border-destructive/40",
        )}
      />
      <div className="relative flex size-11 items-center justify-center rounded-full bg-background shadow-sm">
        {phase === "uploading" && <UploadCloud className="size-5 text-ring" />}
        {isSuccess && <CheckCircle2 className="size-5" />}
        {isFailed && <AlertCircle className="size-5" />}
        {phase === "idle" && <Loader2 className="size-5 animate-spin" />}
      </div>
    </div>
  );
}
