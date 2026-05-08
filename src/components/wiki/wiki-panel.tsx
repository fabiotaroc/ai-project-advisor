"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookText, Loader2, Pin, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/date-format";
import { cn } from "@/lib/utils";
import type { CanonicalDoc } from "@/lib/types";

type SaveState = "idle" | "saving" | "saved" | "error";
type ViewMode = "read" | "edit";

const WIKI_RAIL_WIDTH_STORAGE_KEY = "morgan:wiki:rail-width";
const WIKI_RAIL_DEFAULT_WIDTH = 232;
const WIKI_RAIL_MIN_WIDTH = 200;
const WIKI_RAIL_MAX_WIDTH = 360;
const WIKI_DETAIL_MIN_WIDTH = 480;

function clampWikiRailWidth(value: number, maxWidth = WIKI_RAIL_MAX_WIDTH) {
  return Math.min(Math.max(value, WIKI_RAIL_MIN_WIDTH), maxWidth);
}

function storeWikiRailWidth(value: number) {
  window.localStorage.setItem(WIKI_RAIL_WIDTH_STORAGE_KEY, String(Math.round(value)));
}

export function WikiPanel({
  projectId,
  docs: initialDocs,
}: {
  projectId: string;
  docs: CanonicalDoc[];
}) {
  const router = useRouter();
  const gridRef = useRef<HTMLElement>(null);
  const [docs, setDocs] = useState(initialDocs);
  const [selectedId, setSelectedId] = useState<string | null>(initialDocs[0]?.id ?? null);
  const [draftBody, setDraftBody] = useState(initialDocs[0]?.body ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("read");
  const [wikiRailWidth, setWikiRailWidth] = useState(WIKI_RAIL_DEFAULT_WIDTH);

  useEffect(() => {
    setDocs(initialDocs);
  }, [initialDocs]);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(WIKI_RAIL_WIDTH_STORAGE_KEY));
    if (Number.isFinite(stored)) {
      setWikiRailWidth(clampWikiRailWidth(stored));
    }
  }, []);

  const selected = useMemo(
    () => docs.find((d) => d.id === selectedId) ?? null,
    [docs, selectedId],
  );

  useEffect(() => {
    setDraftBody(selected?.body ?? "");
    setSaveState("idle");
    setErrorMessage(null);
    setViewMode("read");
  }, [selected?.id, selected?.body]);

  const dirty = selected ? draftBody !== selected.body : false;

  async function saveDoc() {
    if (!selected || !dirty || saveState === "saving") return;
    setSaveState("saving");
    setErrorMessage(null);
    try {
      const response = await fetch(`/api/canonical-docs/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draftBody }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? `Save failed (${response.status})`);
      }
      const payload = (await response.json()) as { doc: CanonicalDoc };
      setDocs((prev) => prev.map((d) => (d.id === payload.doc.id ? payload.doc : d)));
      setSaveState("saved");
      router.refresh();
    } catch (err) {
      setSaveState("error");
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function unpinDoc(doc: CanonicalDoc) {
    if (doc.is_default) return;
    if (!confirm(`Remove the pinned doc "${doc.title}"? Its content will be discarded.`)) return;

    const response = await fetch(`/api/canonical-docs/${doc.id}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      alert(payload?.error ?? "Failed to remove doc");
      return;
    }
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    if (selectedId === doc.id) {
      const next = docs.find((d) => d.id !== doc.id) ?? null;
      setSelectedId(next?.id ?? null);
    }
    router.refresh();
  }

  function onPinned(doc: CanonicalDoc) {
    setDocs((prev) => [...prev, doc]);
    setSelectedId(doc.id);
    setPinDialogOpen(false);
    router.refresh();
  }

  const defaults = useMemo(() => docs.filter((d) => d.is_default), [docs]);
  const customs = useMemo(() => docs.filter((d) => !d.is_default), [docs]);

  const nudgeWikiRailWidth = useCallback((delta: number) => {
    setWikiRailWidth((current) => {
      const gridMax = gridRef.current
        ? Math.max(WIKI_RAIL_MIN_WIDTH, gridRef.current.clientWidth - WIKI_DETAIL_MIN_WIDTH)
        : WIKI_RAIL_MAX_WIDTH;
      const next = clampWikiRailWidth(current + delta, Math.min(WIKI_RAIL_MAX_WIDTH, gridMax));
      storeWikiRailWidth(next);
      return next;
    });
  }, []);

  const startWikiRailResize = useCallback((event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = wikiRailWidth;
    const gridMax = gridRef.current
      ? Math.max(WIKI_RAIL_MIN_WIDTH, gridRef.current.clientWidth - WIKI_DETAIL_MIN_WIDTH)
      : WIKI_RAIL_MAX_WIDTH;
    const maxWidth = Math.min(WIKI_RAIL_MAX_WIDTH, gridMax);
    let nextWidth = startWidth;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      nextWidth = clampWikiRailWidth(startWidth + moveEvent.clientX - startX, maxWidth);
      setWikiRailWidth(nextWidth);
    };

    const handlePointerUp = () => {
      storeWikiRailWidth(nextWidth);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  }, [wikiRailWidth]);

  return (
    <section
      ref={gridRef}
      className="-m-4 grid h-svh min-h-0 grid-cols-1 grid-rows-[16rem_minmax(0,1fr)] overflow-hidden bg-background lg:grid-cols-[var(--wiki-rail-width)_minmax(0,1fr)] lg:grid-rows-1"
      style={{ "--wiki-rail-width": `${wikiRailWidth}px` } as CSSProperties}
    >
      <aside className="relative flex min-h-0 flex-col border-b border-border/70 bg-card/40 lg:border-b-0 lg:border-r">
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3" aria-label="Wiki documents">
          <div className="mb-6 flex items-start justify-between gap-2 px-1">
            <div className="min-w-0">
              <h1 className="text-sm font-semibold tracking-tight">Wiki</h1>
              <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                Durable project memory.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setPinDialogOpen(true)}
              aria-label="Pin custom doc"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
          <DocList
            heading="Core"
            docs={defaults}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          {customs.length > 0 && (
            <DocList
              heading="Pinned"
              docs={customs}
              selectedId={selectedId}
              onSelect={setSelectedId}
              className="mt-3"
            />
          )}
        </nav>
        <div
          role="separator"
          aria-label="Resize wiki sidebar"
          aria-orientation="vertical"
          tabIndex={0}
          className="group absolute inset-y-0 right-0 hidden w-2 translate-x-1 cursor-col-resize touch-none outline-none lg:block"
          onPointerDown={startWikiRailResize}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              nudgeWikiRailWidth(-16);
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              nudgeWikiRailWidth(16);
            }
          }}
        >
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover:bg-border group-focus-visible:bg-ring" />
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-col bg-background">
        <header className="shrink-0 border-b border-border/70 bg-background/95 px-6 py-3 supports-[backdrop-filter]:bg-background/80 supports-[backdrop-filter]:backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-semibold tracking-tight">
                {selected?.title ?? "—"}
              </h2>
              {selected ? (
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  updated {formatDateTime(selected.updated_at)}
                </p>
              ) : null}
            </div>
            {selected ? (
              <div className="flex shrink-0 items-center gap-2">
                {saveState === "error" && (
                  <span className="max-w-48 truncate text-xs text-destructive">
                    {errorMessage ?? "Save failed."}
                  </span>
                )}
                {viewMode === "edit" && dirty && (
                  <Button
                    type="button"
                    onClick={saveDoc}
                    disabled={saveState === "saving"}
                    size="sm"
                  >
                    {saveState === "saving" ? "Saving…" : "Save"}
                  </Button>
                )}
                <div className="flex items-center rounded-md border border-border/70 bg-card/70 p-0.5">
                  <Button
                    type="button"
                    variant={viewMode === "read" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    aria-pressed={viewMode === "read"}
                    onClick={() => setViewMode("read")}
                  >
                    Read
                  </Button>
                  <Button
                    type="button"
                    variant={viewMode === "edit" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    aria-pressed={viewMode === "edit"}
                    onClick={() => setViewMode("edit")}
                  >
                    Edit
                  </Button>
                </div>
                {!selected.is_default && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => unpinDoc(selected)}
                    aria-label="Remove pinned doc"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">
          <Label htmlFor="canonical-doc-body" className="sr-only">
            Doc content
          </Label>
          {viewMode === "read" ? (
            <MarkdownDocument body={draftBody} hasSelection={Boolean(selected)} />
          ) : (
            <div className="mx-auto h-full max-w-4xl px-6 py-6">
              <Textarea
                id="canonical-doc-body"
                value={draftBody}
                onChange={(event) => {
                  setDraftBody(event.target.value);
                  setSaveState("idle");
                }}
                placeholder={selected ? "Write in markdown…" : "Select a doc to edit."}
                disabled={!selected}
                className="field-sizing-fixed h-full min-h-0 resize-none overflow-y-auto rounded-none border-0 bg-transparent p-0 font-mono text-sm leading-7 shadow-none focus-visible:ring-0 disabled:cursor-default disabled:opacity-60"
              />
            </div>
          )}
        </div>
      </main>

      <PinCustomDocDialog
        open={pinDialogOpen}
        onOpenChange={setPinDialogOpen}
        projectId={projectId}
        existingSlugs={docs.map((d) => d.slug)}
        onPinned={onPinned}
      />
    </section>
  );
}

function MarkdownDocument({ body, hasSelection }: { body: string; hasSelection: boolean }) {
  if (!hasSelection) {
    return (
      <div className="mx-auto flex h-full max-w-4xl items-center px-6 py-6">
        <p className="text-sm text-muted-foreground">Select a doc to read or edit.</p>
      </div>
    );
  }

  if (!body.trim()) {
    return (
      <div className="mx-auto flex h-full max-w-4xl items-center px-6 py-6">
        <div className="max-w-md">
          <h3 className="text-sm font-medium">This doc is empty.</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Switch to Edit to add project memory in markdown.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <article
        className={cn(
          "mx-auto max-w-4xl px-6 py-8 text-sm text-foreground/95",
          "[&_p]:whitespace-pre-wrap [&_p]:leading-7",
          "[&_p:not(:first-child)]:mt-4",
          "[&_strong]:font-semibold",
          "[&_em]:italic",
          "[&_h1]:mt-8 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight",
          "[&_h1:first-child]:mt-0",
          "[&_h2]:mt-7 [&_h2]:border-b [&_h2]:border-border/70 [&_h2]:pb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight",
          "[&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold",
          "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6",
          "[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6",
          "[&_li]:mt-1.5 [&_li>p]:whitespace-normal",
          "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4",
          "[&_blockquote]:my-5 [&_blockquote]:border-l-2 [&_blockquote]:border-border/70 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
          "[&_hr]:my-6 [&_hr]:border-border/70",
          "[&_table]:my-5 [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-lg",
          "[&_th]:border-b [&_th]:border-border/70 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium",
          "[&_td]:border-b [&_td]:border-border/40 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top",
          "[&_pre]:my-5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-border/70 [&_pre]:bg-muted/45 [&_pre]:px-4 [&_pre]:py-3",
          "[&_code]:rounded-md [&_code]:bg-muted/60 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]",
          "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
      </article>
    </div>
  );
}

function DocList({
  heading,
  docs,
  selectedId,
  onSelect,
  className,
}: {
  heading: string;
  docs: CanonicalDoc[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <p className="px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {heading}
      </p>
      <ul className="flex flex-col gap-0.5">
        {docs.map((doc) => (
          <li key={doc.id}>
            <button
              type="button"
              onClick={() => onSelect(doc.id)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors",
                selectedId === doc.id
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground hover:bg-accent/70",
              )}
            >
              {doc.is_default ? (
                <BookText className="size-3 shrink-0 opacity-60" />
              ) : (
                <Pin className="size-3 shrink-0 opacity-60" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{doc.title}</div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PinCustomDocDialog({
  open,
  onOpenChange,
  projectId,
  existingSlugs,
  onPinned,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  existingSlugs: string[];
  onPinned: (doc: CanonicalDoc) => void;
}) {
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  function deriveSlug(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function submit() {
    setError(null);
    const cleanedSlug = deriveSlug(title);
    if (!cleanedSlug || !title.trim()) {
      setError("Title is required.");
      return;
    }
    if (existingSlugs.includes(cleanedSlug)) {
      setError(`A doc with that title already exists (slug: ${cleanedSlug}).`);
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/canonical-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, slug: cleanedSlug, title: title.trim() }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? `Pin failed (${response.status})`);
      }
      const payload = (await response.json()) as { doc: CanonicalDoc };
      onPinned(payload.doc);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pin custom doc</DialogTitle>
          <DialogDescription>
            Add a project-specific canonical doc alongside the five defaults.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pin-doc-title">Title</Label>
            <Input
              id="pin-doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bill of Materials"
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              The filename will be derived from the title (e.g. bill-of-materials.md).
            </p>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="size-3.5 animate-spin" /> : "Pin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
