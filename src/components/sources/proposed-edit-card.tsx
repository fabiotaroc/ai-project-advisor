"use client";

import { Check, Loader2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PendingWikiEdit } from "@/lib/types";

export function ProposedEditCard({
  edit,
  resolving,
  onAccept,
  onReject,
  onSelect,
}: {
  edit: PendingWikiEdit;
  resolving: "accept" | "reject" | null;
  onAccept: () => void;
  onReject: () => void;
  onSelect?: () => void;
}) {
  const resolved = edit.status !== "pending";
  const preview = edit.inserted_text.trim() || "(empty proposed insertion)";

  return (
    <article
      className={cn(
        "group/edit flex min-w-0 flex-col gap-2 rounded-lg border border-border/70 bg-background/65 p-2.5 text-left",
        !resolved && onSelect && "cursor-pointer transition-colors hover:bg-muted/30",
        edit.status === "accepted" && "border-success-line bg-success-soft/40",
        edit.status === "rejected" && "border-destructive-line bg-destructive-soft/40",
      )}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (!onSelect) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-xs leading-5 text-foreground">
          {edit.reason ?? "Proposed wiki update"}
        </p>
        <Badge
          variant={edit.status === "accepted" ? "success" : edit.status === "rejected" ? "destructive" : "accent"}
          className="h-5 shrink-0 rounded-md px-1.5 font-mono text-[10px] uppercase tracking-wide"
        >
          {edit.status}
        </Badge>
      </div>

      <blockquote className="line-clamp-4 border-l border-border pl-2 text-xs leading-5 text-muted-foreground">
        {preview}
      </blockquote>

      {edit.status === "pending" ? (
        <div className="flex items-center justify-end gap-1.5 pt-0.5">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={Boolean(resolving)}
            onClick={(event) => {
              event.stopPropagation();
              onReject();
            }}
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
            onClick={(event) => {
              event.stopPropagation();
              onAccept();
            }}
          >
            {resolving === "accept" ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Check data-icon="inline-start" />
            )}
            Accept
          </Button>
        </div>
      ) : null}
    </article>
  );
}
