"use client";

import { useState } from "react";
import { FileText, BookOpen, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SearchResult = {
  type: "doc" | "source";
  id: string;
  title: string;
  excerpt: string;
  similarity: number | null;
};

export function SearchPanel({ projectId }: { projectId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function onSearch() {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    setIsSearching(true);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, query: trimmedQuery }),
      });
      if (!response.ok) return;
      const payload = await response.json();
      setResults(payload.results);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold tracking-tight">Search</h1>
      <p className="text-sm text-muted-foreground">
        Search across canonical wiki docs and project inputs.
      </p>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void onSearch();
        }}
      >
        <div className="flex-1">
          <Label htmlFor="search-query" className="sr-only">
            Search query
          </Label>
          <Input
            id="search-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search wiki docs, files, meetings, emails, and memories..."
          />
        </div>
        <Button type="submit" disabled={!query.trim() || isSearching}>
          {isSearching ? <Loader2 data-icon="inline-start" className="animate-spin" /> : null}
          Search
        </Button>
      </form>

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            {results.length} result{results.length !== 1 ? "s" : ""}
          </p>
          {results.map((result) => (
            <Card key={`${result.type}-${result.id}`} size="sm">
              <CardContent className="flex items-start gap-3 px-4 py-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  {result.type === "doc" ? (
                    <FileText className="size-4 text-muted-foreground" />
                  ) : (
                    <BookOpen className="size-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-semibold">{result.title}</h2>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {result.type === "doc" ? "Wiki" : "Input"}
                    </Badge>
                    {result.similarity != null && (
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {(result.similarity * 100).toFixed(0)}% match
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{result.excerpt}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {hasSearched && results.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No results found for &ldquo;{query}&rdquo;.
        </p>
      )}
    </div>
  );
}
