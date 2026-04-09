"use client";

import { useState } from "react";

export function SearchPanel({ projectId }: { projectId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ type: string; id: string; title: string; excerpt: string }>>([]);

  async function onSearch() {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, query }),
    });
    if (!response.ok) return;
    const payload = await response.json();
    setResults(payload.results);
  }

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
      <h1 className="display mb-4 text-3xl">Unified Search</h1>
      <div className="mb-4 flex gap-2">
        <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded border border-[var(--line)] bg-[var(--paper)]/35 px-3 py-2 text-sm" />
        <button onClick={onSearch} className="rounded bg-[var(--ink)] px-3 py-2 text-sm text-[var(--paper)]">Search</button>
      </div>
      <div className="space-y-2">
        {results.map((result) => (
          <article key={result.id} className="rounded-lg border border-[var(--line)] bg-[var(--paper)]/35 p-3">
            <p className="text-xs uppercase tracking-[0.15em] text-[var(--ink-soft)]">{result.type}</p>
            <h2 className="font-semibold">{result.title}</h2>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">{result.excerpt}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
