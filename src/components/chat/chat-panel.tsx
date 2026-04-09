"use client";

import { useMemo, useState } from "react";

type Message = { id: string; role: "user" | "assistant"; content: string };

export function ChatPanel({ projectId }: { projectId: string }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isBusy, setIsBusy] = useState(false);

  const timeline = useMemo(
    () => messages,
    [messages],
  );

  return (
    <section className="flex h-[calc(100vh-9.5rem)] flex-col rounded-2xl border border-[var(--line)] bg-white/75 shadow-sm">
      <div className="border-b border-[var(--line)] px-5 py-3">
        <h1 className="display text-2xl">Advisor Chat</h1>
        <p className="text-sm text-[var(--ink-soft)]">Tool-based project reasoning with persistent memory.</p>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {timeline.length === 0 ? <div className="rounded-lg border border-dashed border-[var(--line)] bg-[var(--paper)]/50 p-4 text-sm text-[var(--ink-soft)]">Ask for project decisions, summaries, risk reviews, or updates to specific files.</div> : timeline.map((message) => (
          <article key={message.id} className={`max-w-3xl rounded-xl border px-4 py-3 ${message.role === "user" ? "ml-auto border-[var(--accent)] bg-[color:color-mix(in_oklab,var(--accent)_12%,white)]" : "border-[var(--line)] bg-white"}`}>
            <p className="mb-1 text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">{message.role}</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
          </article>
        ))}
      </div>
      <form className="border-t border-[var(--line)] bg-white/80 p-4" onSubmit={(event) => {
        event.preventDefault();
        if (!input.trim()) return;
        const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        const nextHistory = [...messages, userMessage];
        setInput("");
        setIsBusy(true);
        fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            messages: nextHistory.map((message) => ({
              id: message.id,
              role: message.role,
              parts: [{ type: "text", text: message.content }],
            })),
          }),
        })
          .then(async (response) => {
            if (!response.ok) throw new Error("Chat request failed");
            const text = await response.text();
            setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: text }]);
          })
          .finally(() => setIsBusy(false));
      }}>
        <div className="flex items-end gap-3">
          <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={3} className="w-full resize-none rounded-lg border border-[var(--line)] bg-[var(--paper)]/35 p-3 text-sm outline-none focus:border-[var(--accent)]" />
          <button disabled={isBusy} className="rounded-lg bg-[var(--ink)] px-4 py-2 text-sm text-[var(--paper)] disabled:opacity-50">Send</button>
        </div>
      </form>
    </section>
  );
}
