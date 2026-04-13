"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FileText, BookOpen, Search, Loader2 } from "lucide-react";
import {
  CommandDialog,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SearchResult = {
  type: "file" | "source";
  id: string;
  title: string;
  excerpt: string;
  similarity: number | null;
};

export function SearchCommand({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(
    async (searchQuery: string) => {
      abortRef.current?.abort();

      if (searchQuery.length < 2) {
        setResults([]);
        setHasSearched(false);
        setIsSearching(false);
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setIsSearching(true);

      try {
        const response = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, query: searchQuery }),
          signal: controller.signal,
        });

        if (!response.ok) return;
        const payload = await response.json();
        setResults(payload.results);
        setHasSearched(true);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    },
    [projectId],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      void doSearch(query.trim());
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setHasSearched(false);
      setIsSearching(false);
      abortRef.current?.abort();
    }
  }, [open]);

  const fileResults = results.filter((r) => r.type === "file");
  const sourceResults = results.filter((r) => r.type === "source");

  function handleSelect(result: SearchResult) {
    onOpenChange(false);
    if (result.type === "file") {
      router.push(`/project/${projectId}/files/${result.id}`);
    } else {
      router.push(`/project/${projectId}/search?q=${encodeURIComponent(query)}`);
    }
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Search across wiki files and ingested sources"
      className="sm:max-w-xl"
    >
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search files, sources, and memories..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-80">
          {isSearching && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Searching...
            </div>
          )}

          {!isSearching && hasSearched && results.length === 0 && (
            <CommandEmpty>
              No results found for &ldquo;{query}&rdquo;
            </CommandEmpty>
          )}

          {!isSearching && !hasSearched && query.length < 2 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search...
            </div>
          )}

          {!isSearching && fileResults.length > 0 && (
            <CommandGroup heading="Wiki">
              {fileResults.map((result) => (
                <CommandItem
                  key={`file-${result.id}`}
                  onSelect={() => handleSelect(result)}
                  className="gap-3"
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                    <FileText className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{result.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {result.excerpt}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!isSearching && fileResults.length > 0 && sourceResults.length > 0 && (
            <CommandSeparator />
          )}

          {!isSearching && sourceResults.length > 0 && (
            <CommandGroup heading="Sources">
              {sourceResults.map((result) => (
                <CommandItem
                  key={`source-${result.id}`}
                  onSelect={() => handleSelect(result)}
                  className="gap-3"
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                    <BookOpen className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{result.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {result.excerpt}
                    </p>
                  </div>
                  {result.similarity != null && (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {(result.similarity * 100).toFixed(0)}%
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>

        {hasSearched && results.length > 0 && (
          <div className="border-t border-border px-3 py-2">
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                router.push(
                  `/project/${projectId}/search?q=${encodeURIComponent(query)}`,
                );
              }}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-md py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground",
              )}
            >
              <Search className="size-3" />
              View all results on search page
            </button>
          </div>
        )}
      </Command>
    </CommandDialog>
  );
}
