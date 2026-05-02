"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type SetStateAction,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  HardDrive,
  FileUp,
  Loader2,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  RowGlyph,
  StatusPill,
  TRIGGER_META,
  TriggerGlyph,
  eventMeta,
  parseRunSummary,
  subjectLabel,
} from "@/components/activity/activity-shared";
import type { SourceLinkedActivity, SourceLinkedRun } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatChatListTime, formatDate, formatDateTime } from "@/lib/date-format";
import { cn } from "@/lib/utils";
import type { SourceMaterialDetail } from "@/lib/types";
import {
  CitedSourcePreview,
  sourceHasPreviewContent,
} from "@/components/sources/cited-source-preview";
import { SourceAddDialog } from "@/components/sources/source-add-dialog";
import { SourceUploadZone, type SourceUploadStatus } from "@/components/sources/source-upload-zone";
import {
  fileGlyph,
  formatBytes,
  readMetaNumber,
  readMetaString,
  sourceFileTypeShortLabel,
  sourceTypeIcon,
  statusBadge,
  typeLabel,
} from "@/components/sources/source-helpers";
import type { StagedFile } from "@/lib/source-classification";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Sources created within this window show a "new" tag in the list. */
const NEW_SOURCE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function isVeryRecentSource(createdAt: string): boolean {
  const t = Date.parse(createdAt);
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= NEW_SOURCE_MAX_AGE_MS;
}

type SourceType = SourceMaterialDetail["type"];
const SOURCE_TYPE_FILTERS: SourceType[] = ["meeting", "document", "email", "note"];
const SOURCE_LIST_WIDTH_STORAGE_KEY = "morgan:sources:list-width";
const SOURCE_LIST_DEFAULT_WIDTH = 336;
const SOURCE_LIST_MIN_WIDTH = 288;
const SOURCE_LIST_MAX_WIDTH = 560;
const SOURCE_DETAIL_MIN_WIDTH = 520;

function clampSourceListWidth(value: number, maxWidth = SOURCE_LIST_MAX_WIDTH) {
  return Math.min(Math.max(value, SOURCE_LIST_MIN_WIDTH), maxWidth);
}

function storeSourceListWidth(value: number) {
  window.localStorage.setItem(SOURCE_LIST_WIDTH_STORAGE_KEY, String(Math.round(value)));
}

type ActiveCitation = {
  sourceId: string;
  chunkId: string;
};

export function SourcesPanel({
  projectId,
  sources: initialSources,
}: {
  projectId: string;
  sources: SourceMaterialDetail[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const citedSourceId = searchParams.get("source");
  const citedChunkId = searchParams.get("chunk");
  const gridRef = useRef<HTMLDivElement>(null);
  const [sources, setSources] = useState(initialSources);
  const [sourceListWidth, setSourceListWidth] = useState(SOURCE_LIST_DEFAULT_WIDTH);
  const [retryingSourceId, setRetryingSourceId] = useState<string | null>(null);
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<SourceType | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    citedSourceId ?? initialSources[0]?.id ?? null,
  );
  const [activeCitation, setActiveCitation] = useState<ActiveCitation | null>(() =>
    citedSourceId && citedChunkId ? { sourceId: citedSourceId, chunkId: citedChunkId } : null,
  );

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(SOURCE_LIST_WIDTH_STORAGE_KEY));
    if (Number.isFinite(stored)) {
      setSourceListWidth(clampSourceListWidth(stored));
    }
  }, []);

  const sourceTypeCounts = useMemo(() => {
    const counts = Object.fromEntries(SOURCE_TYPE_FILTERS.map((type) => [type, 0])) as Record<
      SourceType,
      number
    >;
    for (const source of sources) {
      counts[source.type] += 1;
    }
    return counts;
  }, [sources]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return sources.filter((s) => {
      if (typeFilter && s.type !== typeFilter) return false;
      if (!q) return true;
      const haystack = `${s.title} ${s.summary ?? ""} ${typeLabel(s.type)}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [sources, filter, typeFilter]);

  const selected = useMemo(
    () => filtered.find((s) => s.id === selectedId) ?? filtered[0] ?? null,
    [selectedId, filtered],
  );

  const clearCitationParams = useCallback(() => {
    if (!citedSourceId && !citedChunkId) return;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("source");
    nextParams.delete("chunk");

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [citedChunkId, citedSourceId, pathname, router, searchParams]);

  useEffect(() => {
    if (!citedSourceId || !sources.some((source) => source.id === citedSourceId)) return;
    setSelectedId(citedSourceId);
    setActiveCitation(citedChunkId ? { sourceId: citedSourceId, chunkId: citedChunkId } : null);
    clearCitationParams();
  }, [citedChunkId, citedSourceId, clearCitationParams, sources]);

  const handleSelectSource = useCallback(
    (sourceId: string) => {
      setSelectedId(sourceId);
      setActiveCitation(null);
      clearCitationParams();
    },
    [clearCitationParams],
  );

  const handleSourceAdded = useCallback(
    (source: SourceMaterialDetail) => {
      setSources((prev) => {
        const existing = prev.findIndex((s) => s.id === source.id);
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = source;
          return next;
        }
        return [source, ...prev];
      });
      setTypeFilter((current) => (current && current !== source.type ? null : current));
      setSelectedId(source.id);
      setActiveCitation(null);
      clearCitationParams();
    },
    [clearCitationParams],
  );

  const handleSourceReplaced = useCallback((source: SourceMaterialDetail) => {
    setSources((prev) => prev.map((item) => (item.id === source.id ? source : item)));
    setTypeFilter((current) => (current && current !== source.type ? null : current));
    setSelectedId(source.id);
    setActiveCitation(null);
    clearCitationParams();
  }, [clearCitationParams]);

  const handleDeleteSource = useCallback(async (sourceId: string) => {
    if (deletingSourceId) return;
    setDeletingSourceId(sourceId);

    try {
      const response = await fetch(`/api/sources/${sourceId}`, { method: "DELETE" });
      if (!response.ok) return;

      const nextSources = sources.filter((source) => source.id !== sourceId);
      setSources(nextSources);
      setSelectedId((current) => (current === sourceId ? nextSources[0]?.id ?? null : current));
      setActiveCitation(null);
      clearCitationParams();
    } finally {
      setDeletingSourceId(null);
    }
  }, [clearCitationParams, deletingSourceId, sources]);

  const retryIngestion = useCallback(
    async (sourceId: string) => {
      if (retryingSourceId) return;
      setRetryingSourceId(sourceId);
      try {
        const response = await fetch(`/api/sources/${sourceId}/retry`, { method: "POST" });
        const data = await response.json();
        if (response.ok && data.source) {
          setSources((prev) =>
            prev.map((s) => (s.id === sourceId ? { ...s, ...data.source } : s)),
          );
        }
      } finally {
        setRetryingSourceId(null);
      }
    },
    [retryingSourceId],
  );

  const nudgeSourceListWidth = useCallback((delta: number) => {
    setSourceListWidth((current) => {
      const gridMax = gridRef.current
        ? Math.max(SOURCE_LIST_MIN_WIDTH, gridRef.current.clientWidth - SOURCE_DETAIL_MIN_WIDTH)
        : SOURCE_LIST_MAX_WIDTH;
      const next = clampSourceListWidth(current + delta, Math.min(SOURCE_LIST_MAX_WIDTH, gridMax));
      storeSourceListWidth(next);
      return next;
    });
  }, []);

  const startSourceListResize = useCallback((event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = sourceListWidth;
    const gridMax = gridRef.current
      ? Math.max(SOURCE_LIST_MIN_WIDTH, gridRef.current.clientWidth - SOURCE_DETAIL_MIN_WIDTH)
      : SOURCE_LIST_MAX_WIDTH;
    const maxWidth = Math.min(SOURCE_LIST_MAX_WIDTH, gridMax);
    let nextWidth = startWidth;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      nextWidth = clampSourceListWidth(startWidth + moveEvent.clientX - startX, maxWidth);
      setSourceListWidth(nextWidth);
    };

    const handlePointerUp = () => {
      storeSourceListWidth(nextWidth);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  }, [sourceListWidth]);

  return (
    <div className="-m-4 flex h-svh min-h-0 flex-col overflow-hidden">
      <div
        ref={gridRef}
        className={cn(
          "grid min-h-0 flex-1 grid-rows-[20rem_minmax(0,1fr)] overflow-hidden overscroll-none bg-background",
          "lg:grid-cols-[var(--sources-list-width)_minmax(0,1fr)] lg:grid-rows-1",
        )}
        style={{ "--sources-list-width": `${sourceListWidth}px` } as CSSProperties}
      >
        <SourceList
          sources={filtered}
          totalCount={sources.length}
          projectId={projectId}
          selectedId={selected?.id ?? null}
          onSelect={handleSelectSource}
          filter={filter}
          onFilterChange={setFilter}
          typeFilter={typeFilter}
          sourceTypeCounts={sourceTypeCounts}
          onTypeFilterChange={setTypeFilter}
          onSourceAdded={handleSourceAdded}
          onResizeStart={startSourceListResize}
          onResizeByKeyboard={nudgeSourceListWidth}
        />
        <SourceDetail
          source={selected}
          projectId={projectId}
          citationChunkId={selected?.id === activeCitation?.sourceId ? activeCitation.chunkId : null}
          onRetry={retryIngestion}
          retryingSourceId={retryingSourceId}
          onSourceReplaced={handleSourceReplaced}
          onDelete={handleDeleteSource}
          deletingSourceId={deletingSourceId}
        />
      </div>
    </div>
  );
}

function SourceList({
  sources,
  totalCount,
  projectId,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
  typeFilter,
  sourceTypeCounts,
  onTypeFilterChange,
  onSourceAdded,
  onResizeStart,
  onResizeByKeyboard,
}: {
  sources: SourceMaterialDetail[];
  totalCount: number;
  projectId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  filter: string;
  onFilterChange: (value: string) => void;
  typeFilter: SourceType | null;
  sourceTypeCounts: Record<SourceType, number>;
  onTypeFilterChange: (type: SourceType | null) => void;
  onSourceAdded: (source: SourceMaterialDetail) => void;
  onResizeStart: (event: PointerEvent<HTMLDivElement>) => void;
  onResizeByKeyboard: (delta: number) => void;
}) {
  return (
    <div className="relative flex min-h-0 w-full flex-col overflow-hidden border-b border-border/70 bg-card/40 p-2 lg:h-full lg:border-b-0 lg:border-r">
      <div className="shrink-0 border-b border-border/60 bg-card/95 px-1 pb-3 pt-1">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h1 className="min-w-0 text-lg font-semibold tracking-tight">Sources</h1>
          <SourceAddDialog
            projectId={projectId}
            onSourceAdded={onSourceAdded}
            triggerLabel="Add"
          />
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(event) => onFilterChange(event.target.value)}
            placeholder="Search sources"
            className="pl-8"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Filter sources by type">
          {SOURCE_TYPE_FILTERS.map((type) => {
            const active = typeFilter === type;
            return (
              <Button
                key={type}
                type="button"
                variant="outline"
                size="xs"
                aria-pressed={active}
                onClick={() => onTypeFilterChange(active ? null : type)}
                className={cn(
                  "h-6 rounded-4xl px-2 font-mono text-[10px] uppercase tracking-wide",
                  active
                    ? "border-transparent bg-sidebar-primary text-sidebar-primary-foreground shadow-sm hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground focus-visible:ring-sidebar-primary/35"
                    : "bg-background/60 text-muted-foreground",
                )}
              >
                {sourceTypeIcon(type, "size-3")}
                {typeLabel(type)}
                <span
                  className={cn(
                    active ? "text-sidebar-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {sourceTypeCounts[type]}
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        {sources.length === 0 ? (
          <div className="flex min-h-[12rem] flex-1 items-center justify-center px-4 py-10 text-center text-xs text-muted-foreground">
            {totalCount === 0
              ? "No sources yet. Add a file to get started."
              : "No sources match your filters."}
          </div>
        ) : (
          sources.map((source, index) => (
            <div key={source.id} className={cn(index > 0 && "border-t border-border/60")}>
              <SourceListRow
                source={source}
                active={selectedId === source.id}
                onSelect={() => onSelect(source.id)}
              />
            </div>
          ))
        )}
      </div>
      <div
        role="separator"
        aria-label="Resize sources list"
        aria-orientation="vertical"
        tabIndex={0}
        onPointerDown={onResizeStart}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            onResizeByKeyboard(-24);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            onResizeByKeyboard(24);
          }
        }}
        className="absolute inset-y-0 right-0 z-20 hidden w-2 translate-x-1/2 cursor-col-resize touch-none bg-transparent outline-none transition-colors hover:bg-ring/25 focus-visible:bg-ring/35 lg:block"
      />
    </div>
  );
}

function SourceListRow({
  source,
  active,
  onSelect,
}: {
  source: SourceMaterialDetail;
  active: boolean;
  onSelect: () => void;
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  }

  const fileTypeLabel = sourceFileTypeShortLabel(source);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        "group relative flex w-full cursor-pointer flex-col gap-1.5 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        active ? "bg-muted/35" : "hover:bg-muted/30",
      )}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-0.5 transition-colors",
          active ? "bg-ring" : "bg-transparent",
        )}
      />
      <div className="flex items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {fileGlyph(source.title, source.type, "size-3.5")}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate text-sm font-medium leading-tight">
            {source.title}
          </span>
          {isVeryRecentSource(source.created_at) && (
            <Badge
              className="h-4 shrink-0 rounded-md border-0 bg-success px-1.5 py-0 text-[10px] font-medium text-success-foreground"
              aria-label="Added recently"
            >
              NEW
            </Badge>
          )}
        </div>
        {statusBadge(source.status)}
      </div>
      {source.summary && (
        <p className="line-clamp-2 text-xs text-muted-foreground">{source.summary}</p>
      )}
      <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {formatDate(source.created_at)}
        {fileTypeLabel ? (
          <>
            <span className="text-muted-foreground/50" aria-hidden="true">
              {" "}
              ·{" "}
            </span>
            {fileTypeLabel}
          </>
        ) : null}
      </p>
    </div>
  );
}

function SourceDetail({
  source,
  projectId,
  citationChunkId,
  onRetry,
  retryingSourceId,
  onSourceReplaced,
  onDelete,
  deletingSourceId,
}: {
  source: SourceMaterialDetail | null;
  projectId: string;
  citationChunkId: string | null;
  onRetry: (sourceId: string) => void;
  retryingSourceId: string | null;
  onSourceReplaced: (source: SourceMaterialDetail) => void;
  onDelete: (sourceId: string) => void;
  deletingSourceId: string | null;
}) {
  if (!source) {
    return (
      <div className="flex h-full min-h-[12rem] items-center justify-center p-6 text-center text-sm text-muted-foreground lg:min-h-0">
        Select a source to view its details.
      </div>
    );
  }

  const originalSize = readMetaNumber(source.metadata, "originalSize");
  const mimeType = readMetaString(source.metadata, "mimeType");
  const canRetry = source.status === "processing" || source.status === "failed";
  const hasContentPreview = sourceHasPreviewContent(source, citationChunkId);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-8 overflow-y-auto overscroll-contain bg-background p-5">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              {sourceTypeIcon(source.type, "size-3")}
              {typeLabel(source.type)}
            </span>
            {statusBadge(source.status)}
            <Badge variant="outline" className="text-[10px]">
              {source.chunk_count} {source.chunk_count === 1 ? "chunk" : "chunks"}
            </Badge>
          </div>
          <div className="flex items-start justify-between gap-3">
            <h2 className="min-w-0 flex-1 text-xl font-semibold tracking-tight">{source.title}</h2>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <SourceReplaceDialog source={source} onSourceReplaced={onSourceReplaced} />
              <SourceDeleteButton
                source={source}
                deleting={deletingSourceId === source.id}
                onDelete={() => onDelete(source.id)}
              />
              {canRetry && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={retryingSourceId === source.id}
                  onClick={() => onRetry(source.id)}
                  title="Re-run extraction and embedding from the stored file"
                >
                  {retryingSourceId === source.id ? (
                    <Loader2 data-icon="inline-start" className="animate-spin" />
                  ) : (
                    <RotateCcw data-icon="inline-start" />
                  )}
                  Retry ingestion
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="size-3.5" />
              {source.uploader?.name ?? source.uploader?.email ?? "Unknown uploader"}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              {formatDateTime(source.created_at)}
            </span>
            {originalSize !== null && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1.5">
                  <HardDrive className="size-3.5" />
                  {formatBytes(originalSize)}
                </span>
              </>
            )}
          </div>
        </header>

        {source.summary ? (
          <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_min(100%,14rem)] lg:items-stretch lg:gap-5">
            <div className="flex min-h-0 min-w-0 flex-col gap-8">
              <Section title="AI summary" className="min-w-0">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{source.summary}</p>
              </Section>
              {hasContentPreview ? (
                <Section title="Content preview" className="min-w-0">
                  <CitedSourcePreview
                    key={`${source.id}:${citationChunkId ?? "preview"}`}
                    source={source}
                    citationChunkId={citationChunkId}
                  />
                </Section>
              ) : null}
            </div>
            <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-3">
              <FileDetailsTable
                source={source}
                mimeType={mimeType}
                originalSize={originalSize}
              />
              <LinkedArtifactsTable className="min-h-0 flex-1" source={source} projectId={projectId} />
            </div>
          </div>
        ) : (
          <>
            <div className="grid w-full max-w-md gap-3 sm:grid-cols-2">
              <FileDetailsTable
                source={source}
                mimeType={mimeType}
                originalSize={originalSize}
              />
              <LinkedArtifactsTable source={source} projectId={projectId} />
            </div>
            {hasContentPreview ? (
              <Section title="Content preview">
                <CitedSourcePreview
                  key={`${source.id}:${citationChunkId ?? "preview"}`}
                  source={source}
                  citationChunkId={citationChunkId}
                />
              </Section>
            ) : null}
          </>
        )}
    </div>
  );
}

function SourceReplaceDialog({
  source,
  onSourceReplaced,
}: {
  source: SourceMaterialDetail;
  onSourceReplaced: (source: SourceMaterialDetail) => void;
}) {
  const [open, setOpen] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, SourceUploadStatus>>({});
  const [isReplacing, setIsReplacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStagedFilesChange = useCallback((next: SetStateAction<StagedFile[]>) => {
    setStagedFiles((current) => {
      const value = typeof next === "function" ? next(current) : next;
      return value.slice(-1);
    });
    setUploadProgress({});
    setError(null);
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    if (isReplacing) return;
    setOpen(next);
    if (!next) {
      setStagedFiles([]);
      setUploadProgress({});
      setError(null);
    }
  }, [isReplacing]);

  const replaceSource = useCallback(async () => {
    const staged = stagedFiles[0];
    if (!staged || isReplacing) return;

    setIsReplacing(true);
    setError(null);
    setUploadProgress({ [staged.id]: "uploading" });

    try {
      const formData = new FormData();
      formData.append("file", staged.file);
      formData.append("category", staged.category);

      const response = await fetch(`/api/sources/${source.id}`, {
        method: "PUT",
        body: formData,
      });

      const data = (await response.json()) as {
        source?: SourceMaterialDetail;
        error?: string;
      };

      if (!response.ok || !data.source) {
        throw new Error(data.error ?? "Failed to replace source.");
      }

      setUploadProgress({ [staged.id]: data.source.status === "failed" ? "failed" : "done" });
      onSourceReplaced(data.source);
      handleOpenChange(false);
    } catch (err) {
      setUploadProgress({ [staged.id]: "failed" });
      setError(err instanceof Error ? err.message : "Failed to replace source.");
    } finally {
      setIsReplacing(false);
    }
  }, [handleOpenChange, isReplacing, onSourceReplaced, source.id, stagedFiles]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <FileUp data-icon="inline-start" />
          Replace
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl" showCloseButton={!isReplacing}>
        <DialogHeader className="pr-8">
          <DialogTitle>Replace source</DialogTitle>
          <DialogDescription>
            Upload one file to replace the selected source. Existing chunks and preview content will be regenerated.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <SourceUploadZone
          stagedFiles={stagedFiles}
          onStagedFilesChange={handleStagedFilesChange}
          disabled={isReplacing}
          uploadProgress={uploadProgress}
        />

        <DialogFooter>
          <Button variant="ghost" disabled={isReplacing} onClick={() => handleOpenChange(false)}>
            Close
          </Button>
          <Button onClick={replaceSource} disabled={!stagedFiles[0] || isReplacing}>
            {isReplacing ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Upload data-icon="inline-start" />
            )}
            Replace source
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SourceDeleteButton({
  source,
  deleting,
  onDelete,
}: {
  source: SourceMaterialDetail;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 data-icon="inline-start" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete this source?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes <span className="font-medium text-foreground">{source.title}</span> and its indexed chunks from the project.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleting}
            onClick={(event) => {
              event.preventDefault();
              onDelete();
            }}
          >
            {deleting ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Trash2 data-icon="inline-start" />}
            Delete source
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Section({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("flex min-h-0 flex-col gap-2", className)}>
      <h3 className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function SidebarSection({
  title,
  className,
  contentClassName,
  children,
}: {
  title: string;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card/40", className)}
    >
      <div className="shrink-0 border-b border-border/70 px-3 py-2">
        <h3 className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{title}</h3>
      </div>
      <div className={cn("flex flex-col", contentClassName)}>{children}</div>
    </div>
  );
}

function FileDetailsTable({
  source,
  mimeType,
  originalSize,
}: {
  source: SourceMaterialDetail;
  mimeType: string | null;
  originalSize: number | null;
}) {
  return (
    <SidebarSection className="shrink-0" title="File details">
      <SidebarRow label="Type" value={typeLabel(source.type)} />
      <SidebarRow label="Created" value={formatDateTime(source.created_at)} />
      {source.updated_at && source.updated_at !== source.created_at && (
        <SidebarRow label="Updated" value={formatDateTime(source.updated_at)} />
      )}
      {mimeType && <SidebarRow label="MIME" value={<span className="font-mono text-[10px]">{mimeType}</span>} />}
      {originalSize !== null && <SidebarRow label="Size" value={formatBytes(originalSize) ?? "—"} />}
      <SidebarRow label="Chunks" value={String(source.chunk_count)} />
    </SidebarSection>
  );
}

function LinkedArtifactsTable({
  source,
  projectId,
  className,
}: {
  source: SourceMaterialDetail;
  projectId: string;
  className?: string;
}) {
  const activityHref = (params: string) => `/project/${projectId}/activity?${params}`;
  const total = source.linked_runs.length + source.linked_activity.length;

  return (
    <SidebarSection
      className={cn("min-h-0", className)}
      contentClassName="min-h-0 flex-1"
      title="Recent activity"
    >
      {total === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">No linked activity yet.</p>
      ) : (
        <div className="min-h-0 flex-1 divide-y divide-border/60 overflow-y-auto overflow-x-hidden">
          {source.linked_runs.map((run) => (
            <CompactRunRow
              key={run.id}
              run={run}
              href={activityHref(`run=${encodeURIComponent(run.id)}`)}
            />
          ))}
          {source.linked_activity.map((event) => (
            <CompactEventRow
              key={event.id}
              event={event}
              href={activityHref(`event=${encodeURIComponent(event.id)}`)}
            />
          ))}
        </div>
      )}
    </SidebarSection>
  );
}

function CompactRunRow({ run, href }: { run: SourceLinkedRun; href: string }) {
  const trigger = TRIGGER_META.source_ingested;
  const parsed = parseRunSummary(run.summary);
  const subject = subjectLabel(parsed.subject);
  const sub = parsed.body ?? parsed.counts ?? null;
  const timestamp = run.finished_at ?? run.started_at;

  return (
    <CompactRow
      href={href}
      tone="ai"
      glyph={<TriggerGlyph Icon={trigger.Icon} status={run.status} />}
      headline={
        <>
          <span className="font-medium text-foreground">{trigger.label}</span>
          {subject ? (
            <>
              <span className="mx-1 text-muted-foreground">·</span>
              <span className="truncate text-muted-foreground">{subject}</span>
            </>
          ) : null}
        </>
      }
      sub={sub}
      pill={<StatusPill status={run.status} />}
      timestamp={timestamp}
    />
  );
}

function CompactEventRow({ event, href }: { event: SourceLinkedActivity; href: string }) {
  const meta = eventMeta(event);
  return (
    <CompactRow
      href={href}
      tone="quiet"
      glyph={<meta.Icon className="size-3" strokeWidth={1.75} />}
      headline={<span className="text-foreground">{meta.label}</span>}
      sub={event.summary || null}
      pill={null}
      timestamp={event.created_at}
    />
  );
}

function CompactRow({
  href,
  tone,
  glyph,
  headline,
  sub,
  pill,
  timestamp,
}: {
  href: string;
  tone: "ai" | "quiet";
  glyph: React.ReactNode;
  headline: React.ReactNode;
  sub: React.ReactNode;
  pill: React.ReactNode;
  timestamp: string;
}) {
  return (
    <Link
      href={href}
      className="group/activity flex items-start gap-2 px-3 py-2 text-xs transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
    >
      <span className="mt-[2px]">
        <RowGlyph tone={tone}>{glyph}</RowGlyph>
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          <p className="min-w-0 flex-1 truncate leading-snug">{headline}</p>
          {pill}
        </div>
        {sub ? (
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{sub}</p>
        ) : null}
        <p
          className="mt-0.5 font-mono text-[10px] text-muted-foreground/80"
          title={formatDateTime(timestamp)}
        >
          {formatChatListTime(timestamp)}
        </p>
      </div>
    </Link>
  );
}

function SidebarRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/60 px-3 py-2 last:border-b-0 text-xs">
      <dt className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="truncate text-foreground">{value}</dd>
    </div>
  );
}
