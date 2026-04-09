import type { SourceMaterial } from "@/lib/types";

export function SourcesPanel({ sources }: { sources: SourceMaterial[] }) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
      <h1 className="display mb-4 text-3xl">Sources</h1>
      <div className="grid gap-3 md:grid-cols-2">
        {sources.map((source) => (
          <article key={source.id} className="rounded-xl border border-[var(--line)] bg-[var(--paper)]/35 p-4">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.15em] text-[var(--ink-soft)]"><span>{source.type}</span><span>{source.status}</span></div>
            <h2 className="text-lg font-semibold">{source.title}</h2>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">{source.summary ?? "No summary yet."}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
