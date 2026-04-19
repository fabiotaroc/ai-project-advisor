import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="relative isolate overflow-hidden px-6 py-24 md:px-10">
      <div className="absolute top-6 right-6 z-10 md:top-8 md:right-10">
        <ThemeToggle />
      </div>
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">AI Project Advisor</p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          Your project&rsquo;s memory and execution in one place.
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted-foreground">
          Chat with an advisor that reads and writes persistent project files, searches sources, and logs activity.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild size="lg">
            <Link href="/signup">Create account</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
