import type { ActivityEvent } from "@/lib/types";

export function ActivityPanel({ events }: { events: ActivityEvent[] }) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
      <h1 className="display mb-4 text-3xl">Activity</h1>
      <ol className="space-y-3">
        {events.map((event) => (
          <li key={event.id} className="rounded-xl border border-[var(--line)] bg-[var(--paper)]/35 p-3">
            <p className="text-sm">{event.summary}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--ink-soft)]">{event.event_type} · {new Date(event.created_at).toLocaleString()}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
