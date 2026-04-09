import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/server/auth";

export async function AppHeader() {
  const user = await getSessionUser();

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-12 max-w-[1400px] items-center justify-between px-5">
        <Link href="/app" className="text-sm font-semibold tracking-tight text-foreground">
          Project Advisor
        </Link>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="font-mono text-xs">{user?.email}</span>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
