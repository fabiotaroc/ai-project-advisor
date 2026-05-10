"use client";

import { ArrowUpRight, FilePenLine, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PendingWikiEdit } from "@/lib/types";
import { classifyPatchType } from "@/lib/wiki-patches";

export type WikiProposalToolOutput = {
  proposed?: boolean;
  error?: string;
  edit_id?: string;
  status?: "pending" | "accepted" | "rejected";
  target_doc_id?: string;
  target_doc_slug?: string;
  target_doc_title?: string;
  inserted_text?: string;
  reason?: string | null;
};

type CardState = "draft" | "saved" | "discarded";

function stateForStatus(status: WikiProposalToolOutput["status"]): CardState {
  if (status === "accepted") return "saved";
  if (status === "rejected") return "discarded";
  return "draft";
}

export function WikiProposalCard({
  output,
  className,
  onReview,
}: {
  output: WikiProposalToolOutput;
  className?: string;
  /** Open the unified review drawer focused on this edit. */
  onReview?: (edit: PendingWikiEdit) => void;
}) {
  const [state, setState] = useState<CardState>(() => stateForStatus(output.status));
  const [edit, setEdit] = useState<PendingWikiEdit | null>(null);
  const [error, setError] = useState<string | null>(output.error ?? null);
  const [busyAction, setBusyAction] = useState<"discard" | null>(null);

  useEffect(() => {
    if (!output.edit_id) return;

    let cancelled = false;

    async function refresh() {
      try {
        const response = await fetch(`/api/wiki/pending-edits/${output.edit_id}`);
        const payload = (await response.json()) as { edit?: PendingWikiEdit; error?: string };
        if (cancelled || !response.ok) return;
        if (payload.edit) {
          setEdit(payload.edit);
          setState(stateForStatus(payload.edit.status));
        }
      } catch {
        // Keep persisted output visible on transient failure.
      }
    }

    void refresh();
    // Light polling while still in draft, so the card reflects drawer actions.
    const interval = window.setInterval(() => {
      if (state === "draft") void refresh();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [output.edit_id, state]);

  if (!output.proposed || !output.edit_id) {
    return (
      <div
        className={cn(
          "rounded-lg border border-destructive-line bg-destructive-soft px-3 py-2 text-sm text-destructive",
          className,
        )}
      >
        {output.error ?? "The memory proposal could not be created."}
      </div>
    );
  }

  const target = output.target_doc_slug ? `${output.target_doc_slug}.md` : "wiki";
  const reason = edit?.reason ?? output.reason ?? null;
  const patchType = edit
    ? classifyPatchType(edit.inserted_text, edit.deleted_text)
    : "add";
  const typeLabel = patchType === "update" ? "Update" : patchType === "remove" ? "Remove" : "Add";

  async function discard() {
    if (!output.edit_id) return;
    setBusyAction("discard");
    setError(null);

    try {
      const response = await fetch(`/api/wiki/pending-edits/${output.edit_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      const payload = (await response.json()) as { edit?: PendingWikiEdit; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to discard memory proposal.");
      }
      if (payload.edit) {
        setEdit(payload.edit);
        setState(stateForStatus(payload.edit.status));
      } else {
        setState("discarded");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discard memory proposal.");
    } finally {
      setBusyAction(null);
    }
  }

  function openReview() {
    if (!edit && !output.edit_id) return;
    if (edit) {
      onReview?.(edit);
      return;
    }
    // Fall back to a synthetic edit shape if metadata isn't loaded yet so
    // the drawer can still open and load real data via its own loader.
    onReview?.({
      id: output.edit_id!,
      project_id: "",
      target_doc_id: output.target_doc_id ?? "",
      source_material_id: null,
      origin: "chat",
      anchor: {},
      inserted_text: output.inserted_text ?? "",
      deleted_text: null,
      reason: output.reason ?? null,
      confidence: null,
      status: "pending",
      repositioned: false,
      fallback_applied: false,
      created_by: null,
      resolved_by: null,
      created_at: new Date().toISOString(),
      resolved_at: null,
      target_doc: null,
      source_title: null,
    });
  }

  if (state === "saved" || state === "discarded") {
    return (
      <div
        className={cn(
          "inline-flex w-fit items-center gap-2 rounded-lg border border-ai-line bg-ai-surface px-3 py-2 text-sm",
          className,
        )}
      >
        <Badge
          variant={state === "saved" ? "success" : "outline"}
          className="h-5 rounded-md px-1.5 text-[10px]"
        >
          {state === "saved" ? "Saved" : "Discarded"}
        </Badge>
        <span className="text-muted-foreground">
          {state === "saved" ? `Saved to ${target}` : "Memory proposal discarded"}
        </span>
        {onReview ? (
          <Button type="button" variant="ghost" size="xs" onClick={openReview} className="-mr-2">
            View
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <section
      className={cn(
        "max-w-[38rem] rounded-xl border border-dashed border-accent-line bg-ai-surface p-3 shadow-[var(--shadow-1)]",
        className,
      )}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-accent-ink">
          <FilePenLine className="size-3.5" />
          Memory · proposed {typeLabel.toLowerCase()}
        </p>
        <Badge variant="accent" className="h-5 rounded-md px-1.5 text-[10px]">
          Pending review
        </Badge>
      </div>

      <p className="text-sm leading-6 text-foreground">
        {typeLabel} to <span className="font-medium">{target}</span>
        {reason ? <span className="text-muted-foreground"> · {reason}</span> : null}
      </p>

      {error ? (
        <p className="mt-2 rounded-md border border-destructive-line bg-destructive-soft px-2 py-1.5 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={Boolean(busyAction)}
          onClick={() => void discard()}
        >
          {busyAction === "discard" ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : (
            <X data-icon="inline-start" />
          )}
          Discard
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={openReview}
          disabled={!onReview}
        >
          Review
          <ArrowUpRight data-icon="inline-end" />
        </Button>
      </div>
    </section>
  );
}
