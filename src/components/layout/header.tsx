import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/server/auth";

export async function AppHeader() {
  const user = await getSessionUser();

  return (
    <header className="border-b border-border bg-card">
      <div className="flex h-12 w-full items-center justify-between px-5">
        <Link href="/app" className="text-sm font-semibold tracking-tight text-foreground">
          Project Advisor
        </Link>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ThemeToggle />
          <span className="hidden font-mono text-xs md:inline">{user?.email}</span>
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
