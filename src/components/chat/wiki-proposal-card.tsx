"use client";

import { Check, Edit3, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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

type CardState = "draft" | "editing" | "saved" | "discarded";

function stateForStatus(status: WikiProposalToolOutput["status"]): CardState {
  if (status === "accepted") return "saved";
  if (status === "rejected") return "discarded";
  return "draft";
}

export function WikiProposalCard({
  output,
  className,
}: {
  output: WikiProposalToolOutput;
  className?: string;
}) {
  const [state, setState] = useState<CardState>(() => stateForStatus(output.status));
  const [draft, setDraft] = useState(output.inserted_text ?? "");
  const [error, setError] = useState<string | null>(output.error ?? null);
  const [busyAction, setBusyAction] = useState<"save" | "discard" | "draft" | null>(null);

  useEffect(() => {
    if (!output.edit_id || state !== "draft") return;

    let cancelled = false;

    async function refreshProposalState() {
      try {
        const response = await fetch(`/api/wiki/pending-edits/${output.edit_id}`);
        const payload = (await response.json()) as {
          edit?: { status?: WikiProposalToolOutput["status"]; inserted_text?: string };
        };
        if (!response.ok || cancelled) return;

        const nextState = stateForStatus(payload.edit?.status);
        setState(nextState);
        if (payload.edit?.inserted_text && nextState === "draft") {
          setDraft(payload.edit.inserted_text);
        }
      } catch {
        // Keep the persisted chat output visible if the status refresh is unavailable.
      }
    }

    void refreshProposalState();

    return () => {
      cancelled = true;
    };
  }, [output.edit_id, state]);

  if (!output.proposed || !output.edit_id) {
    return (
      <div className={cn("rounded-lg border border-destructive-line bg-destructive-soft px-3 py-2 text-sm text-destructive", className)}>
        {output.error ?? "The memory proposal could not be created."}
      </div>
    );
  }

  const target = output.target_doc_slug ? `${output.target_doc_slug}.md` : "wiki";

  async function resolve(action: "accept" | "reject") {
    if (!output.edit_id) return;
    setBusyAction(action === "accept" ? "save" : "discard");
    setError(null);

    try {
      const response = await fetch(`/api/wiki/pending-edits/${output.edit_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json()) as {
        edit?: { status?: WikiProposalToolOutput["status"] };
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to resolve memory proposal.");
      }
      setState(stateForStatus(payload.edit?.status ?? (action === "accept" ? "accepted" : "rejected")));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve memory proposal.");
    } finally {
      setBusyAction(null);
    }
  }

  async function saveDraft() {
    if (!output.edit_id) return;
    const trimmed = draft.trim();
    if (!trimmed) {
      setError("Proposal content is required.");
      return;
    }

    setBusyAction("draft");
    setError(null);
    try {
      const response = await fetch(`/api/wiki/pending-edits/${output.edit_id}/draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inserted_text: trimmed }),
      });
      const payload = (await response.json()) as {
        edit?: { inserted_text?: string };
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update proposal draft.");
      }
      setDraft(payload.edit?.inserted_text ?? trimmed);
      setState("draft");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update proposal draft.");
    } finally {
      setBusyAction(null);
    }
  }

  if (state === "saved" || state === "discarded") {
    return (
      <div className={cn("inline-flex w-fit items-center gap-2 rounded-lg border border-ai-line bg-ai-surface px-3 py-2 text-sm", className)}>
        <Badge variant={state === "saved" ? "success" : "outline"} className="h-5 rounded-md px-1.5 text-[10px]">
          {state === "saved" ? "Saved" : "Discarded"}
        </Badge>
        <span className="text-muted-foreground">
          {state === "saved" ? `Saved to ${target}` : "Memory proposal discarded"}
        </span>
      </div>
    );
  }

  return (
    <section className={cn("max-w-[38rem] rounded-xl border border-dashed border-accent-line bg-ai-surface p-3 shadow-[var(--shadow-1)]", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-wide text-accent-ink">
          Memory · proposed update
        </p>
        <Badge variant="accent" className="h-5 rounded-md px-1.5 text-[10px]">
          Draft
        </Badge>
      </div>

      <p className="text-sm leading-6 text-foreground">
        Proposed update to <span className="font-medium">{target}</span>
        {output.reason ? <span className="text-muted-foreground"> · {output.reason}</span> : null}
      </p>

      {state === "editing" ? (
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="mt-3 min-h-32 font-mono text-sm leading-6"
          aria-label="Edit memory proposal draft"
        />
      ) : (
        <blockquote className="mt-3 whitespace-pre-wrap rounded-lg border border-ai-line bg-background/70 p-3 font-mono text-xs leading-6 text-foreground">
          {draft}
        </blockquote>
      )}

      {error ? (
        <p className="mt-2 rounded-md border border-destructive-line bg-destructive-soft px-2 py-1.5 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {state === "editing" ? (
          <>
            <Button type="button" variant="ghost" size="sm" disabled={Boolean(busyAction)} onClick={() => setState("draft")}>
              Cancel
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={Boolean(busyAction)} onClick={() => void saveDraft()}>
              {busyAction === "draft" ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Check data-icon="inline-start" />}
              Save draft
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="ghost" size="sm" disabled={Boolean(busyAction)} onClick={() => void resolve("reject")}>
              {busyAction === "discard" ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <X data-icon="inline-start" />}
              Discard
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={Boolean(busyAction)} onClick={() => setState("editing")}>
              <Edit3 data-icon="inline-start" />
              Edit draft
            </Button>
            <Button type="button" size="sm" disabled={Boolean(busyAction)} onClick={() => void resolve("accept")}>
              {busyAction === "save" ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Check data-icon="inline-start" />}
              Save to memory
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
