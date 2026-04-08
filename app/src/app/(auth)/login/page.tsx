"use client";

import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) return setError(authError.message);
    window.location.href = "/workspace";
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-6">
      <form onSubmit={onSubmit} className="w-full rounded-2xl border border-[var(--line)] bg-white/70 p-6 shadow-sm">
        <h1 className="display text-4xl">Welcome back</h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">Sign in to your project workspace.</p>
        <div className="mt-5 space-y-3">
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="w-full rounded border border-[var(--line)] bg-[var(--paper)]/30 px-3 py-2 text-sm" />
          <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" className="w-full rounded border border-[var(--line)] bg-[var(--paper)]/30 px-3 py-2 text-sm" />
        </div>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        <button className="mt-5 w-full rounded bg-[var(--ink)] py-2 text-sm text-[var(--paper)]">Sign in</button>
      </form>
    </main>
  );
}
