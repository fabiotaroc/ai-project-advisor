"use client";

import { Check, Loader2, MapPin, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PendingWikiEdit } from "@/lib/types";

export function InlineDiffHunk({
  edit,
  active,
  locationNote,
  resolving,
  onAccept,
  onReject,
}: {
  edit: PendingWikiEdit;
  active: boolean;
  locationNote: string | null;
  resolving: "accept" | "reject" | null;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div
      id={`wiki-edit-hunk-${edit.id}`}
      className={cn(
        "my-3 rounded-lg border border-success-line bg-success-soft/55 p-3 transition-colors",
        active && "wiki-edit-flash border-ring bg-accent-soft",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground">{edit.reason ?? "Proposed insertion"}</p>
          {locationNote ? (
            <Badge variant="outline" className="mt-1 h-5 rounded-md px-1.5 text-[10px]">
              <MapPin data-icon="inline-start" />
              {locationNote}
            </Badge>
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
            disabled={Boolean(resolving)}
            onClick={onAccept}
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
      <div className="rounded-md border border-success-line/70 bg-background/65 p-2 font-mono text-xs leading-5 text-success">
        <span className="select-none text-success/70">+ </span>
        <span className="whitespace-pre-wrap">{edit.inserted_text.trim()}</span>
      </div>
      {edit.deleted_text ? (
        <div className="mt-2 rounded-md border border-destructive-line/70 bg-destructive-soft p-2 font-mono text-xs leading-5 text-destructive line-through">
          <span className="select-none text-destructive/70">- </span>
          <span className="whitespace-pre-wrap">{edit.deleted_text.trim()}</span>
        </div>
      ) : null}
    </div>
  );
}
