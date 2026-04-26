"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Maximize2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { SourceMaterialDetail } from "@/lib/types";

const PARSED_PREVIEW_CHARS = 1200;

type CitationRange = {
  chunkIndex: number;
  start: number;
  end: number;
};

function getDocumentText(source: SourceMaterialDetail, citationChunkId: string | null) {
  const parsed = source.parsed_content ?? "";
  if (parsed) return parsed;

  if (!citationChunkId) return "";
  return source.chunks.find((chunk) => chunk.id === citationChunkId)?.content ?? "";
}

function getCitationRange(
  source: SourceMaterialDetail,
  citationChunkId: string | null,
  text: string,
): CitationRange | null {
  if (!citationChunkId || !text) return null;

  const chunk = source.chunks.find((item) => item.id === citationChunkId);
  if (!chunk) return null;

  const isParsedDocument = Boolean(source.parsed_content) && text === source.parsed_content;
  if (
    isParsedDocument &&
    chunk.char_start !== null &&
    chunk.char_end !== null &&
    chunk.char_start >= 0 &&
    chunk.char_end > chunk.char_start &&
    chunk.char_start < text.length
  ) {
    return {
      chunkIndex: chunk.chunk_index,
      start: chunk.char_start,
      end: Math.min(chunk.char_end, text.length),
    };
  }

  const exactStart = chunk.content ? text.indexOf(chunk.content) : -1;
  if (exactStart >= 0) {
    return {
      chunkIndex: chunk.chunk_index,
      start: exactStart,
      end: exactStart + chunk.content.length,
    };
  }

  if (text === chunk.content) {
    return {
      chunkIndex: chunk.chunk_index,
      start: 0,
      end: text.length,
    };
  }

  return null;
}

export function sourceHasPreviewContent(
  source: SourceMaterialDetail,
  citationChunkId: string | null,
) {
  return getDocumentText(source, citationChunkId).trim().length > 0;
}

function HighlightedDocumentText({
  text,
  citationRange,
  windowStart = 0,
  windowEnd = text.length,
  highlightRef,
}: {
  text: string;
  citationRange: CitationRange | null;
  windowStart?: number;
  windowEnd?: number;
  highlightRef?: RefObject<HTMLElement | null>;
}) {
  const start = Math.max(0, Math.min(windowStart, text.length));
  const end = Math.max(start, Math.min(windowEnd, text.length));
  const citationStart = citationRange ? Math.max(start, citationRange.start) : -1;
  const citationEnd = citationRange ? Math.min(end, citationRange.end) : -1;
  const hasVisibleCitation = citationStart >= start && citationEnd > citationStart;

  if (!hasVisibleCitation) {
    return (
      <>
        {start > 0 ? "... " : ""}
        {text.slice(start, end)}
        {end < text.length ? " ..." : ""}
      </>
    );
  }

  return (
    <>
      {start > 0 ? "... " : ""}
      {text.slice(start, citationStart)}
      <mark ref={highlightRef} className="rounded bg-cite-bg px-0.5 text-cite-fg ring-1 ring-accent-line/60">
        {text.slice(citationStart, citationEnd)}
      </mark>
      {text.slice(citationEnd, end)}
      {end < text.length ? " ..." : ""}
    </>
  );
}

export function CitedSourcePreview({
  source,
  citationChunkId,
  className,
}: {
  source: SourceMaterialDetail;
  citationChunkId: string | null;
  className?: string;
}) {
  const text = useMemo(() => getDocumentText(source, citationChunkId), [source, citationChunkId]);
  const citationRange = useMemo(
    () => getCitationRange(source, citationChunkId, text),
    [source, citationChunkId, text],
  );
  const [open, setOpen] = useState(() => Boolean(citationChunkId && citationRange));
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const highlightedPassageRef = useRef<HTMLElement | null>(null);
  const previewEnd = Math.min(text.length, PARSED_PREVIEW_CHARS);
  const hasCitation = Boolean(citationRange);

  useEffect(() => {
    if (!open) return;

    const scrollToHighlight = (behavior: ScrollBehavior) => {
      const viewport = scrollViewportRef.current;
      const highlight = highlightedPassageRef.current;
      if (!viewport || !highlight) return;

      const viewportRect = viewport.getBoundingClientRect();
      const highlightRect = highlight.getBoundingClientRect();
      const top =
        viewport.scrollTop +
        highlightRect.top -
        viewportRect.top -
        viewport.clientHeight / 2 +
        highlightRect.height / 2;

      viewport.scrollTo({ top: Math.max(0, top), behavior });
    };

    const firstFrame = requestAnimationFrame(() => {
      scrollToHighlight("auto");
      requestAnimationFrame(() => scrollToHighlight("smooth"));
    });
    const settlingTimer = window.setTimeout(() => scrollToHighlight("auto"), 180);

    return () => {
      cancelAnimationFrame(firstFrame);
      window.clearTimeout(settlingTimer);
    };
  }, [open, citationRange]);

  if (!text.trim()) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "relative overflow-visible rounded-lg border border-border/60 bg-muted/25 shadow-[var(--shadow-1)]",
          className,
        )}
      >
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="absolute -top-7 right-0"
          >
            <Maximize2 data-icon="inline-end" />
          </Button>
        </DialogTrigger>
        <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap p-3 font-sans text-xs leading-relaxed text-foreground/90">
          <HighlightedDocumentText
            text={text}
            citationRange={citationRange}
            windowEnd={previewEnd}
          />
        </pre>
      </div>

      <DialogContent
        className="grid h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-[min(72rem,calc(100vw-2rem))]"
        overlayClassName="bg-background/25 supports-backdrop-filter:backdrop-blur-md"
      >
        <DialogHeader className="border-b border-border/70 bg-card/95 px-5 py-4 pr-14">
          <DialogTitle className="truncate">{source.title}</DialogTitle>
          <DialogDescription>
            {hasCitation ? "Full source text with the cited passage highlighted." : "Full source text."}
          </DialogDescription>
        </DialogHeader>
        <div ref={scrollViewportRef} className="min-h-0 overflow-y-auto bg-background">
          <pre className="mx-auto min-h-full max-w-4xl whitespace-pre-wrap px-5 py-5 font-sans text-sm leading-7 text-foreground/90 sm:px-8">
            <HighlightedDocumentText
              text={text}
              citationRange={citationRange}
              highlightRef={highlightedPassageRef}
            />
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}
