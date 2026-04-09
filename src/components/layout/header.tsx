import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function AppHeader() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-[var(--line)] bg-white/70 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-5">
        <Link href="/" className="display text-2xl text-[var(--accent)]">
          Atelier Advisor
        </Link>
        <div className="flex items-center gap-3 text-sm text-[var(--ink-soft)]">
          <span>{user?.email}</span>
          <form action="/auth/signout" method="post">
            <button className="rounded-md border border-[var(--line)] bg-[var(--paper)] px-3 py-1.5 text-[var(--ink)] hover:bg-white">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
