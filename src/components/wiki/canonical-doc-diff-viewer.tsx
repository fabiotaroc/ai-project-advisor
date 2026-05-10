"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Check, ExternalLink, FileText, Loader2, Sparkles, X } from "lucide-react";

import { InlineDiffHunk } from "@/components/wiki/inline-diff-hunk";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { classifyPatchType, locatePatch } from "@/lib/wiki-patches";
import type { PendingWikiEdit, PendingWikiEditGroup } from "@/lib/types";

type ResolvingMap = Record<string, "accept" | "reject" | null>;

type LocatedEdit = {
  edit: PendingWikiEdit;
  index: number;
  matchLength: number;
  locationNote: string | null;
  stale: boolean;
};

type RenderBlock =
  | { kind: "text"; key: string; text: string }
  | { kind: "hunk"; key: string; located: LocatedEdit };

type LoaderConfig =
  | { mode: "source"; sourceId: string }
  | { mode: "project-doc"; projectId: string; targetDocId: string };

export function CanonicalDocDiffViewer({
  sourceId,
  projectId,
  selectedEdit,
  open,
  onOpenChange,
  refreshKey,
  onResolved,
  returnFocusRef,
}: {
  /** Source-scoped loader path (used from the source detail page). */
  sourceId?: string;
  /** Project ID — required when opening the drawer from chat for doc-scoped loading. */
  projectId?: string;
  selectedEdit: PendingWikiEdit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refreshKey: number;
  onResolved: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const [groups, setGroups] = useState<PendingWikiEditGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<ResolvingMap>({});
  const [bulkAction, setBulkAction] = useState<"accept" | "reject" | null>(null);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const loader: LoaderConfig | null = useMemo(() => {
    if (sourceId) return { mode: "source", sourceId };
    if (projectId && selectedEdit?.target_doc_id) {
      return { mode: "project-doc", projectId, targetDocId: selectedEdit.target_doc_id };
    }
    return null;
  }, [sourceId, projectId, selectedEdit?.target_doc_id]);

  const load = useCallback(async () => {
    if (!open || !loader) return;
    setLoading(true);
    setError(null);

    try {
      const url =
        loader.mode === "source"
          ? `/api/sources/${loader.sourceId}/pending-edits`
          : `/api/wiki/pending-edits?projectId=${loader.projectId}&targetDocId=${loader.targetDocId}`;
      const response = await fetch(url, { cache: "no-store" });
      const payload = (await response.json()) as {
        groups?: PendingWikiEditGroup[];
        error?: string;
      };
      if (!response.ok || !payload.groups) {
        throw new Error(payload.error ?? "Failed to load proposed changes.");
      }
      setGroups(payload.groups);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load proposed changes.");
    } finally {
      setLoading(false);
    }
  }, [open, loader]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (open && document.activeElement instanceof HTMLElement) {
      previousFocusRef.current = document.activeElement;
    }
  }, [open]);

  // Keep the active doc tab in sync with the user's selected edit.
  useEffect(() => {
    if (selectedEdit) setActiveDocId(selectedEdit.target_doc_id);
  }, [selectedEdit]);

  // Default to the first group when none is active and groups load.
  useEffect(() => {
    if (!activeDocId && groups.length > 0) {
      setActiveDocId(groups[0].target_doc_id);
    }
  }, [activeDocId, groups]);

  const activeGroup = useMemo(() => {
    if (!activeDocId) return groups[0] ?? null;
    return groups.find((group) => group.target_doc_id === activeDocId) ?? groups[0] ?? null;
  }, [groups, activeDocId]);

  const doc = activeGroup?.target_doc ?? selectedEdit?.target_doc ?? null;
  const selectedEditId = selectedEdit?.id ?? null;
  const pendingEdits = useMemo(
    () => (activeGroup?.edits ?? []).filter((edit) => edit.status === "pending"),
    [activeGroup],
  );
  const resolvedEdits = useMemo(
    () => (activeGroup?.edits ?? []).filter((edit) => edit.status !== "pending"),
    [activeGroup],
  );

  const blocks = useMemo(
    () => buildRenderBlocks(doc?.body ?? "", pendingEdits),
    [doc?.body, pendingEdits],
  );

  useEffect(() => {
    if (!open || !selectedEditId) return;
    const timeout = window.setTimeout(() => {
      document
        .getElementById(`wiki-edit-hunk-${selectedEditId}`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 120);
    return () => window.clearTimeout(timeout);
  }, [open, selectedEditId, blocks]);

  const resolveOne = useCallback(
    async (editId: string, action: "accept" | "reject") => {
      setResolving((current) => ({ ...current, [editId]: action }));
      setError(null);

      try {
        const response = await fetch(`/api/wiki/pending-edits/${editId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? `Failed to ${action} proposed change.`);
        }
        await load();
        onResolved();
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to ${action} proposed change.`);
      } finally {
        setResolving((current) => ({ ...current, [editId]: null }));
      }
    },
    [load, onResolved],
  );

  const resolveBulk = useCallback(
    async (action: "accept" | "reject") => {
      if (pendingEdits.length === 0) return;
      setBulkAction(action);
      setError(null);

      try {
        const url =
          loader?.mode === "source"
            ? `/api/sources/${loader.sourceId}/pending-edits/bulk`
            : `/api/wiki/pending-edits/bulk`;
        const body =
          loader?.mode === "source"
            ? { action }
            : {
                action,
                projectId: loader?.projectId,
                targetDocId: activeGroup?.target_doc_id,
                editIds: pendingEdits.map((edit) => edit.id),
              };
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const payload = (await response.json()) as {
          errors?: { editId: string; error: string }[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? `Failed to ${action} proposed changes.`);
        }
        await load();
        onResolved();
        if (payload.errors?.length) {
          setError(
            `${payload.errors.length} proposed change${payload.errors.length === 1 ? "" : "s"} could not be resolved.`,
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to ${action} proposed changes.`);
      } finally {
        setBulkAction(null);
      }
    },
    [activeGroup, load, loader, onResolved, pendingEdits],
  );

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          window.setTimeout(() => (returnFocusRef?.current ?? previousFocusRef.current)?.focus(), 0);
        }
      }}
    >
      <SheetContent
        className="gap-0 p-0 data-[side=right]:w-[min(100vw,72rem)] data-[side=right]:sm:max-w-none"
        side="right"
      >
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="flex min-w-0 items-center gap-2">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate">{doc?.title ?? "Canonical doc"}</span>
          </SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <span>{doc?.slug ?? "wiki"}.md</span>
            <Badge variant="accent" className="h-5 rounded-md px-1.5 text-[10px]">
              {pendingEdits.length} pending
            </Badge>
            {resolvedEdits.length > 0 ? (
              <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">
                {resolvedEdits.length} resolved
              </Badge>
            ) : null}
          </SheetDescription>
          {groups.length > 1 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {groups.map((group) => {
                const groupPending = group.edits.filter((edit) => edit.status === "pending").length;
                const isActive = group.target_doc_id === (activeGroup?.target_doc_id ?? "");
                return (
                  <Button
                    key={group.target_doc_id}
                    type="button"
                    variant={isActive ? "outline" : "ghost"}
                    size="xs"
                    onClick={() => setActiveDocId(group.target_doc_id)}
                    className={cn("h-6 rounded-md", isActive && "border-accent-line bg-accent-soft/40")}
                  >
                    {group.target_doc?.title ?? "Doc"}
                    <Badge
                      variant={groupPending > 0 ? "accent" : "outline"}
                      className="ml-1.5 h-4 rounded-md px-1.5 text-[10px]"
                    >
                      {groupPending}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          ) : null}
          {pendingEdits.length > 0 ? (
            <div className="mt-2 flex items-center justify-end gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                disabled={Boolean(bulkAction)}
                onClick={() => void resolveBulk("reject")}
              >
                {bulkAction === "reject" ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <X data-icon="inline-start" />
                )}
                Reject all
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={Boolean(bulkAction)}
                onClick={() => void resolveBulk("accept")}
              >
                {bulkAction === "accept" ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Check data-icon="inline-start" />
                )}
                Accept all
              </Button>
            </div>
          ) : null}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading diff
            </p>
          ) : error ? (
            <div className="rounded-lg border border-destructive-line bg-destructive-soft px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : blocks.length > 0 ? (
            <div className="rounded-lg border border-border/70 bg-background">
              {blocks.map((block, index) =>
                block.kind === "text" ? (
                  <DocTextBlock
                    key={block.key}
                    text={block.text}
                    first={index === 0}
                    last={index === blocks.length - 1}
                  />
                ) : (
                  <div key={block.key} className="px-3">
                    <InlineDiffHunk
                      edit={block.located.edit}
                      active={block.located.edit.id === selectedEditId}
                      locationNote={block.located.locationNote}
                      stale={block.located.stale}
                      resolving={resolving[block.located.edit.id] ?? null}
                      onAccept={() => void resolveOne(block.located.edit.id, "accept")}
                      onReject={() => void resolveOne(block.located.edit.id, "reject")}
                      evidence={<EditEvidence edit={block.located.edit} />}
                    />
                  </div>
                ),
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {resolvedEdits.length > 0
                ? "No pending edits remain for this doc."
                : "No proposed wiki changes."}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EditEvidence({ edit }: { edit: PendingWikiEdit }) {
  if (edit.origin === "chat") {
    return (
      <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
        <Sparkles className="size-3" />
        Chat proposal
        {edit.confidence != null ? <span>· confidence {Math.round(edit.confidence * 100)}%</span> : null}
      </p>
    );
  }

  if (edit.source_material_id) {
    return (
      <Link
        href={`/project/${edit.project_id}/sources?source=${edit.source_material_id}`}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground"
      >
        <ExternalLink className="size-3" />
        {edit.source_title ?? "Source material"}
        {edit.confidence != null ? <span>· confidence {Math.round(edit.confidence * 100)}%</span> : null}
      </Link>
    );
  }

  return null;
}

function DocTextBlock({
  text,
  first,
  last,
}: {
  text: string;
  first: boolean;
  last: boolean;
}) {
  if (!text.trim()) return null;
  return (
    <pre
      className={cn(
        "whitespace-pre-wrap break-words px-3 py-3 font-mono text-xs leading-6 text-foreground",
        !first && "border-t border-border/50",
        !last && "border-b border-border/50",
      )}
    >
      {text.trim()}
    </pre>
  );
}

function buildRenderBlocks(body: string, edits: PendingWikiEdit[]): RenderBlock[] {
  const located = edits
    .map((edit) => locateEdit(body, edit))
    .sort((left, right) => left.index - right.index || left.edit.created_at.localeCompare(right.edit.created_at));

  if (located.length === 0) {
    return body.trim() ? [{ kind: "text", key: "doc-body", text: body }] : [];
  }

  const blocks: RenderBlock[] = [];
  let cursor = 0;

  for (const item of located) {
    const index = Math.max(cursor, Math.min(item.index, body.length));
    if (index > cursor) {
      blocks.push({
        kind: "text",
        key: `text-${cursor}-${index}`,
        text: body.slice(cursor, index),
      });
    }
    blocks.push({ kind: "hunk", key: `hunk-${item.edit.id}`, located: item });
    // Advance the cursor past the matched span (for Update/Remove) so we
    // don't render the deleted base text twice (once inline, once in the
    // hunk's strikethrough block).
    cursor = Math.min(body.length, index + item.matchLength);
  }

  if (cursor < body.length) {
    blocks.push({ kind: "text", key: `text-${cursor}-end`, text: body.slice(cursor) });
  }

  return blocks;
}

function locateEdit(body: string, edit: PendingWikiEdit): LocatedEdit {
  const patchType = classifyPatchType(edit.inserted_text, edit.deleted_text);
  const located = locatePatch({
    body,
    insertedText: edit.inserted_text,
    deletedText: edit.deleted_text,
    anchor: edit.anchor,
    patchType,
  });
  return {
    edit,
    index: located.index,
    matchLength: located.matchLength,
    locationNote: located.locationNote,
    stale: located.stale,
  };
}
