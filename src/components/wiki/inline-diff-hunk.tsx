"use client";

import { AlertTriangle, Check, Loader2, MapPin, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { classifyPatchType, type PendingEditPatchType } from "@/lib/wiki-patches";
import type { PendingWikiEdit } from "@/lib/types";

const TYPE_LABEL: Record<PendingEditPatchType, string> = {
  add: "Add",
  update: "Update",
  remove: "Remove",
};

const TYPE_BADGE: Record<PendingEditPatchType, "success" | "accent" | "destructive"> = {
  add: "success",
  update: "accent",
  remove: "destructive",
};

export function InlineDiffHunk({
  edit,
  active,
  locationNote,
  stale,
  resolving,
  onAccept,
  onReject,
  evidence,
}: {
  edit: PendingWikiEdit;
  active: boolean;
  locationNote: string | null;
  stale?: boolean;
  resolving: "accept" | "reject" | null;
  onAccept: () => void;
  onReject: () => void;
  evidence?: React.ReactNode;
}) {
  const patchType = classifyPatchType(edit.inserted_text, edit.deleted_text);
  const typeLabel = TYPE_LABEL[patchType];
  const typeVariant = TYPE_BADGE[patchType];

  const containerStyle = stale
    ? "border-warning-line bg-warning-soft/55"
    : patchType === "remove"
      ? "border-destructive-line bg-destructive-soft/45"
      : patchType === "update"
        ? "border-accent-line bg-accent-soft/45"
        : "border-success-line bg-success-soft/55";

  return (
    <div
      id={`wiki-edit-hunk-${edit.id}`}
      className={cn(
        "my-3 rounded-lg border p-3 transition-colors",
        containerStyle,
        active && "wiki-edit-flash ring-2 ring-ring/60",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={typeVariant} className="h-5 rounded-md px-1.5 font-mono text-[10px] uppercase tracking-wide">
              {typeLabel}
            </Badge>
            {stale ? (
              <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px] text-warning">
                <AlertTriangle data-icon="inline-start" />
                Needs attention
              </Badge>
            ) : null}
            {locationNote ? (
              <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">
                <MapPin data-icon="inline-start" />
                {locationNote}
              </Badge>
            ) : null}
          </div>
          {edit.reason ? (
            <p className="text-xs leading-5 text-foreground">{edit.reason}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={Boolean(resolving)}
            onClick={onReject}
          >
            {resolving === "reject" ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <X data-icon="inline-start" />
            )}
            Reject
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={Boolean(resolving) || stale}
            onClick={onAccept}
            title={stale ? "The base text no longer matches the canonical doc." : undefined}
          >
            {resolving === "accept" ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Check data-icon="inline-start" />
            )}
            Accept
          </Button>
        </div>
      </div>

      {edit.deleted_text ? (
        <div
          className={cn(
            "rounded-md border p-2 font-mono text-xs leading-5",
            "border-destructive-line/70 bg-destructive-soft text-destructive line-through",
          )}
        >
          <span className="select-none text-destructive/70">- </span>
          <span className="whitespace-pre-wrap">{edit.deleted_text.trim()}</span>
        </div>
      ) : null}

      {edit.inserted_text && patchType !== "remove" ? (
        <div
          className={cn(
            "rounded-md border p-2 font-mono text-xs leading-5",
            "border-success-line/70 bg-background/65 text-success",
            edit.deleted_text && "mt-2",
          )}
        >
          <span className="select-none text-success/70">+ </span>
          <span className="whitespace-pre-wrap">{edit.inserted_text.trim()}</span>
        </div>
      ) : null}

      {evidence ? (
        <div className="mt-2 border-t border-border/50 pt-2">{evidence}</div>
      ) : null}
    </div>
  );
}
