"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SearchPanel({ projectId }: { projectId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ type: string; id: string; title: string; excerpt: string }>>([]);

  async function onSearch() {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, query: trimmedQuery }),
    });
    if (!response.ok) return;
    const payload = await response.json();
    setResults(payload.results);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold tracking-tight">Search</h1>
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
            placeholder="Search files, sources, and memories..."
          />
        </div>
        <Button type="submit" disabled={!query.trim()}>
          Search
        </Button>
      </form>
      <div className="flex flex-col gap-2">
        {results.map((result) => (
          <Card key={result.id} size="sm">
            <CardContent className="px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{result.type}</p>
              <h2 className="text-sm font-semibold">{result.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{result.excerpt}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
