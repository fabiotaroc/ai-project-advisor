"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { FileText, Loader2 } from "lucide-react";

import { InlineDiffHunk } from "@/components/wiki/inline-diff-hunk";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PendingWikiEdit, PendingWikiEditGroup } from "@/lib/types";

type ResolvingMap = Record<string, "accept" | "reject" | null>;

type LocatedEdit = {
  edit: PendingWikiEdit;
  index: number;
  locationNote: string | null;
};

type RenderBlock =
  | { kind: "text"; key: string; text: string }
  | { kind: "hunk"; key: string; located: LocatedEdit };

export function CanonicalDocDiffViewer({
  sourceId,
  selectedEdit,
  open,
  onOpenChange,
  refreshKey,
  onResolved,
  returnFocusRef,
}: {
  sourceId: string;
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
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const load = useCallback(async () => {
    if (!open) return;
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
  }, [open, sourceId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (open && document.activeElement instanceof HTMLElement) {
      previousFocusRef.current = document.activeElement;
    }
  }, [open]);

  const selectedDocGroup = useMemo(() => {
    if (!selectedEdit) return null;
    return groups.find((group) => group.target_doc_id === selectedEdit.target_doc_id) ?? null;
  }, [groups, selectedEdit]);

  const doc = selectedDocGroup?.target_doc ?? selectedEdit?.target_doc ?? null;
  const selectedEditId = selectedEdit?.id ?? null;
  const pendingEdits = useMemo(
    () => (selectedDocGroup?.edits ?? []).filter((edit) => edit.status === "pending"),
    [selectedDocGroup],
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
      <SheetContent className="w-[min(100vw,46rem)] gap-0 p-0 sm:max-w-none" side="right">
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="flex min-w-0 items-center gap-2">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate">{doc?.title ?? "Canonical doc"}</span>
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2 font-mono text-[11px]">
            <span>{doc?.slug ?? "wiki"}.md</span>
            <Badge variant="accent" className="h-5 rounded-md px-1.5 text-[10px]">
              {pendingEdits.length} pending
            </Badge>
          </SheetDescription>
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
                      resolving={resolving[block.located.edit.id] ?? null}
                      onAccept={() => void resolveOne(block.located.edit.id, "accept")}
                      onReject={() => void resolveOne(block.located.edit.id, "reject")}
                    />
                  </div>
                ),
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No pending edits remain for this doc.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
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
    return body.trim()
      ? [{ kind: "text", key: "doc-body", text: body }]
      : [];
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
    cursor = index;
  }

  if (cursor < body.length) {
    blocks.push({ kind: "text", key: `text-${cursor}-end`, text: body.slice(cursor) });
  }

  return blocks;
}

function locateEdit(body: string, edit: PendingWikiEdit): LocatedEdit {
  const anchor = normalizeAnchor(edit.anchor);

  if (anchor.heading) {
    const exact = findHeadingSection(body, anchor.heading, "exact");
    if (exact) {
      return {
        edit,
        index: exact.end,
        locationNote: null,
      };
    }

    const bestEffort = findHeadingSection(body, anchor.heading, "best-effort");
    if (bestEffort) {
      return {
        edit,
        index: bestEffort.end,
        locationNote: `repositioned to ${bestEffort.heading}`,
      };
    }
  }

  if (anchor.before) {
    const index = body.indexOf(anchor.before);
    if (index >= 0) {
      return {
        edit,
        index: index + anchor.before.length,
        locationNote: anchor.heading ? "repositioned to matching context" : null,
      };
    }
  }

  return {
    edit,
    index: body.length,
    locationNote: "appended at end of doc",
  };
}

function normalizeAnchor(anchor: Record<string, unknown>) {
  return {
    heading: normalizeOptionalString(anchor.heading),
    before: normalizeOptionalString(anchor.before),
  };
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/[#*_`[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findHeadingSection(body: string, target: string, mode: "exact" | "best-effort") {
  const headings = [...body.matchAll(/^(#{1,6})\s+(.+)$/gm)].map((match) => ({
    start: match.index ?? 0,
    level: match[1].length,
    heading: match[2].trim(),
  }));
  const normalizedTarget = normalizeMatch(target);

  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const normalizedHeading = normalizeMatch(heading.heading);
    const matches =
      mode === "exact"
        ? normalizedHeading === normalizedTarget
        : normalizedHeading.includes(normalizedTarget) ||
          normalizedTarget.includes(normalizedHeading);

    if (!matches) continue;

    const nextPeer = headings
      .slice(index + 1)
      .find((candidate) => candidate.level <= heading.level);
    return {
      heading: heading.heading,
      end: nextPeer ? nextPeer.start : body.length,
    };
  }

  return null;
}
