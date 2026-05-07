"use client";

import type { LucideIcon } from "lucide-react";
import {
  Check,
  CircleDashed,
  FilePlus2,
  FileText,
  MoveRight,
  Pencil,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LibrarianAction, LibrarianRun } from "@/lib/types";

export type RunStatus = LibrarianRun["status"];
export type TriggerType = LibrarianRun["trigger_type"];

export const STATUS_COPY: Record<
  RunStatus,
  { label: string; variant: "success" | "accent" | "destructive" }
> = {
  succeeded: { label: "Saved", variant: "success" },
  running: { label: "Running", variant: "accent" },
  failed: { label: "Failed", variant: "destructive" },
};

export const TRIGGER_META: Record<TriggerType, { label: string; Icon: LucideIcon }> = {
  source_ingested: { label: "Source indexed", Icon: Upload },
};

export const ACTION_ICONS: Record<LibrarianAction["action"], LucideIcon> = {
  create: FilePlus2,
  edit: Pencil,
  rename: MoveRight,
  delete: Trash2,
};

export type ParsedRunSummary = {
  subject: string | null;
  counts: string | null;
  body: string | null;
};

export function parseRunSummary(summary: string | null): ParsedRunSummary {
  if (!summary) return { subject: null, counts: null, body: null };
  return { subject: null, counts: null, body: summary };
}

export function subjectLabel(subject: string | null) {
  return subject;
}

export function eventMeta(event: { event_type: string }): { label: string; Icon: LucideIcon } {
  if (event.event_type === "source_ingested") {
    return { label: "Source added", Icon: Upload };
  }
  if (event.event_type === "librarian_pending_edits_extracted") {
    return { label: "Pending wiki edits proposed", Icon: Sparkles };
  }
  if (event.event_type === "wiki_edit_accepted") {
    return { label: "Wiki edit accepted", Icon: Check };
  }
  if (event.event_type === "wiki_edit_rejected") {
    return { label: "Wiki edit rejected", Icon: X };
  }
  if (event.event_type === "advisor_suggestion") {
    return { label: "Morgan suggested a follow-up", Icon: Sparkles };
  }
  return { label: prettifyEventType(event.event_type), Icon: FileText };
}

function prettifyEventType(value: string) {
  const cleaned = value.replaceAll("_", " ");
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function TriggerGlyph({
  Icon,
  status,
  className,
}: {
  Icon: LucideIcon;
  status: RunStatus;
  className?: string;
}) {
  if (status === "running") {
    return <CircleDashed className={cn("size-3 animate-spin", className)} strokeWidth={1.75} />;
  }
  return <Icon className={cn("size-3", className)} strokeWidth={1.75} />;
}

export function RowGlyph({
  tone,
  children,
}: {
  tone: "ai" | "quiet";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "grid size-[20px] shrink-0 place-items-center rounded-md border text-[11px]",
        tone === "ai"
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-muted/50 text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function StatusPill({ status }: { status: RunStatus }) {
  const meta = STATUS_COPY[status];
  return (
    <Badge
      variant={meta.variant}
      className="rounded-md px-1.5 py-0 text-[10px] font-medium uppercase tracking-[0.08em]"
    >
      {meta.label}
    </Badge>
  );
}
