import Link from "next/link";

export default function Home() {
  return (
    <main className="relative isolate overflow-hidden px-6 py-16 md:px-10">
      <div className="mx-auto max-w-5xl">
        <p className="mb-4 text-xs uppercase tracking-[0.28em] text-[var(--ink-soft)]">AI Project Advisor</p>
        <h1 className="display max-w-3xl text-6xl leading-[0.95] text-[var(--ink)]">Your project’s memory and execution in one workspace.</h1>
        <p className="mt-6 max-w-2xl text-lg text-[var(--ink-soft)]">Chat with an advisor that reads and writes persistent Markdown files, searches sources, and logs activity.</p>
        <div className="mt-10 flex gap-3"><Link href="/login" className="rounded-lg bg-[var(--ink)] px-5 py-3 text-sm text-[var(--paper)]">Sign in</Link></div>
      </div>
    </main>
  );
}
