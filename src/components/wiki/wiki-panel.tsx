"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookText, Loader2, Pin, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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

export function WikiPanel({
  projectId,
  docs: initialDocs,
}: {
  projectId: string;
  docs: CanonicalDoc[];
}) {
  const router = useRouter();
  const [docs, setDocs] = useState(initialDocs);
  const [selectedId, setSelectedId] = useState<string | null>(initialDocs[0]?.id ?? null);
  const [draftBody, setDraftBody] = useState(initialDocs[0]?.body ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);

  useEffect(() => {
    setDocs(initialDocs);
  }, [initialDocs]);

  const selected = useMemo(
    () => docs.find((d) => d.id === selectedId) ?? null,
    [docs, selectedId],
  );

  useEffect(() => {
    setDraftBody(selected?.body ?? "");
    setSaveState("idle");
    setErrorMessage(null);
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

  return (
    <section className="grid h-[calc(100vh-8rem)] grid-cols-[18rem_1fr] gap-3">
      <Card className="flex min-h-0 flex-col py-0">
        <CardHeader className="shrink-0 gap-2 px-3 pt-3 pb-0">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold">Wiki</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={() => setPinDialogOpen(true)}
            >
              <Plus className="size-3.5" />
              Pin custom
            </Button>
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Five canonical docs are seeded for every project. Pin custom docs to extend.
          </p>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto px-2 pt-2 pb-3">
          <DocList
            heading="Canonical"
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
        </CardContent>
      </Card>

      <Card className="flex min-h-0 flex-col py-0">
        <CardHeader className="shrink-0 border-b border-border px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold">{selected?.title ?? "—"}</CardTitle>
              {selected ? (
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {selected.slug}.md · updated {formatDateTime(selected.updated_at)}
                </p>
              ) : null}
            </div>
            {selected ? (
              <div className="flex items-center gap-1.5">
                {selected.is_default ? (
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    <BookText className="size-2.5" />
                    Default
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <Pin className="size-2.5" />
                    Pinned
                  </Badge>
                )}
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
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 overflow-hidden px-0 py-0">
          <Label htmlFor="canonical-doc-body" className="sr-only">
            Doc content
          </Label>
          <Textarea
            id="canonical-doc-body"
            value={draftBody}
            onChange={(event) => {
              setDraftBody(event.target.value);
              setSaveState("idle");
            }}
            placeholder={selected ? "Write in markdown…" : "Select a doc to edit."}
            disabled={!selected}
            className="field-sizing-fixed h-full min-h-0 flex-1 overflow-y-auto rounded-none border-0 bg-transparent p-4 font-mono text-sm leading-relaxed shadow-none focus-visible:ring-0"
          />
        </CardContent>
        <CardFooter className="shrink-0 items-center justify-between gap-2 px-4 py-2.5">
          <div className="text-xs text-muted-foreground">
            {saveState === "saving" && (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" /> Saving…
              </span>
            )}
            {saveState === "saved" && !dirty && <span>Saved.</span>}
            {saveState === "error" && (
              <span className="text-destructive">{errorMessage ?? "Save failed."}</span>
            )}
            {saveState === "idle" && dirty && <span>Unsaved changes.</span>}
          </div>
          <Button
            type="button"
            onClick={saveDoc}
            disabled={!selected || !dirty || saveState === "saving"}
          >
            Save
          </Button>
        </CardFooter>
      </Card>

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
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left transition-colors",
                selectedId === doc.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent",
              )}
            >
              {doc.is_default ? (
                <BookText className="size-3 shrink-0 opacity-60" />
              ) : (
                <Pin className="size-3 shrink-0 opacity-60" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{doc.title}</div>
                <div
                  className={cn(
                    "truncate font-mono text-[10px]",
                    selectedId === doc.id
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground",
                  )}
                >
                  {doc.slug}.md
                </div>
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
  const [slug, setSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setSlug("");
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
    const cleanedSlug = deriveSlug(slug || title);
    if (!cleanedSlug || !title.trim()) {
      setError("Title and slug are required.");
      return;
    }
    if (existingSlugs.includes(cleanedSlug)) {
      setError(`Slug "${cleanedSlug}" is already in use.`);
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
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slug) setSlug(deriveSlug(e.target.value));
              }}
              placeholder="Bill of Materials"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pin-doc-slug">Slug</Label>
            <Input
              id="pin-doc-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="bom"
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Lowercase letters, numbers, and dashes.
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
