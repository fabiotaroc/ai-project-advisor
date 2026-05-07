"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Loader2, Sparkles, X } from "lucide-react";

import { ProposedEditCard } from "@/components/sources/proposed-edit-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PendingWikiEdit, PendingWikiEditGroup } from "@/lib/types";

type ResolvingMap = Record<string, "accept" | "reject" | null>;

export function ProposedChangesPanel({
  sourceId,
  className,
  onSelectEdit,
  refreshKey = 0,
  onResolved,
}: {
  sourceId: string;
  className?: string;
  onSelectEdit?: (edit: PendingWikiEdit) => void;
  refreshKey?: number;
  onResolved?: () => void;
}) {
  const [groups, setGroups] = useState<PendingWikiEditGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedOpen, setResolvedOpen] = useState(false);
  const [resolving, setResolving] = useState<ResolvingMap>({});
  const [bulkAction, setBulkAction] = useState<"accept" | "reject" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sources/${sourceId}/pending-edits`, {
        cache: "no-store",
      });
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
  }, [sourceId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const pendingGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          edits: group.edits.filter((edit) => edit.status === "pending"),
        }))
        .filter((group) => group.edits.length > 0),
    [groups],
  );

  const resolvedGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          edits: group.edits.filter((edit) => edit.status !== "pending"),
        }))
        .filter((group) => group.edits.length > 0),
    [groups],
  );

  const pendingCount = pendingGroups.reduce((sum, group) => sum + group.edits.length, 0);
  const resolvedCount = resolvedGroups.reduce((sum, group) => sum + group.edits.length, 0);

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
        onResolved?.();
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
      setBulkAction(action);
      setError(null);

      try {
        const response = await fetch(`/api/sources/${sourceId}/pending-edits/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const payload = (await response.json()) as {
          errors?: { editId: string; error: string }[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? `Failed to ${action} proposed changes.`);
        }
        await load();
        onResolved?.();
        if (payload.errors?.length) {
          setError(`${payload.errors.length} proposed change${payload.errors.length === 1 ? "" : "s"} could not be resolved.`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to ${action} proposed changes.`);
      } finally {
        setBulkAction(null);
      }
    },
    [load, onResolved, sourceId],
  );

  return (
    <section
      className={cn("flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-card/40", className)}
    >
      <div className="shrink-0 border-b border-border/70 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex min-w-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            <Sparkles className="size-3.5 shrink-0" />
            <span>Proposed changes</span>
          </h3>
          <Badge variant={pendingCount > 0 ? "accent" : "outline"} className="h-5 rounded-md px-1.5 text-[10px]">
            {pendingCount}
          </Badge>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {loading ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Loading proposals
          </p>
        ) : error ? (
          <div className="rounded-lg border border-destructive-line bg-destructive-soft px-2.5 py-2 text-xs leading-5 text-destructive">
            {error}
          </div>
        ) : pendingCount === 0 && resolvedCount === 0 ? (
          <p className="text-xs leading-5 text-muted-foreground">No proposed wiki changes for this source.</p>
        ) : null}

        {pendingCount > 0 ? (
          <div className="flex items-center justify-end gap-1.5">
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

        {pendingGroups.map((group) => (
          <EditGroup
            key={group.target_doc_id}
            group={group}
            resolving={resolving}
            onResolve={resolveOne}
            onSelectEdit={onSelectEdit}
          />
        ))}

        {resolvedCount > 0 ? (
          <div className="border-t border-border/70 pt-2">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-left text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              onClick={() => setResolvedOpen((open) => !open)}
              aria-expanded={resolvedOpen}
            >
              <span>Resolved</span>
              <span className="inline-flex items-center gap-1">
                <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">
                  {resolvedCount}
                </Badge>
                <ChevronDown className={cn("size-3.5 transition-transform", resolvedOpen && "rotate-180")} />
              </span>
            </button>
            {resolvedOpen ? (
              <div className="mt-2 flex flex-col gap-3">
                {resolvedGroups.map((group) => (
                  <EditGroup
                    key={`resolved-${group.target_doc_id}`}
                    group={group}
                    resolving={resolving}
                    onResolve={resolveOne}
                    onSelectEdit={onSelectEdit}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function EditGroup({
  group,
  resolving,
  onResolve,
  onSelectEdit,
}: {
  group: PendingWikiEditGroup;
  resolving: ResolvingMap;
  onResolve: (editId: string, action: "accept" | "reject") => void;
  onSelectEdit?: (edit: PendingWikiEdit) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-medium text-foreground">
          {group.target_doc?.title ?? "Canonical doc"}
        </p>
        <Badge variant="outline" className="h-5 shrink-0 rounded-md px-1.5 text-[10px]">
          {group.edits.length}
        </Badge>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        {group.edits.map((edit) => (
          <ProposedEditCard
            key={edit.id}
            edit={edit}
            resolving={resolving[edit.id] ?? null}
            onAccept={() => void onResolve(edit.id, "accept")}
            onReject={() => void onResolve(edit.id, "reject")}
            onSelect={edit.status === "pending" && onSelectEdit ? () => onSelectEdit(edit) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
