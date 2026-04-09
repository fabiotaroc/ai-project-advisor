"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

const copy = {
  login: {
    eyebrow: "Secure access",
    title: "Sign in to your project advisor.",
    description:
      "Pick up where you left off with persistent files, project memory, and shared project access.",
    button: "Sign in",
    footerLabel: "Need an account?",
    footerHref: "/signup",
    footerAction: "Create one",
  },
  signup: {
    eyebrow: "Create your workspace",
    title: "Start with a personal workspace and grow into collaboration.",
    description:
      "Create your account, get your personal workspace automatically, and join invited projects as soon as you sign in.",
    button: "Create account",
    footerLabel: "Already have an account?",
    footerHref: "/login",
    footerAction: "Sign in",
  },
} satisfies Record<
  AuthMode,
  {
    eyebrow: string;
    title: string;
    description: string;
    button: string;
    footerLabel: string;
    footerHref: string;
    footerAction: string;
  }
>;

export function AuthForm({ mode }: { mode: AuthMode }) {
  const content = copy[mode];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const highlights = useMemo(
    () => [
      {
        icon: ShieldCheck,
        title: "Cookie-backed sessions",
        description: "Stay signed in across refreshes and deep links.",
      },
      {
        icon: Users,
        title: "Project collaboration",
        description: "Join shared projects without giving up your own workspace.",
      },
      {
        icon: Sparkles,
        title: "Persistent project memory",
        description: "Chat, files, search, and activity stay attached to each project.",
      },
    ],
    [],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const supabase = createSupabaseBrowserClient();

    setIsPending(true);
    setError(null);
    setNotice(null);

    try {
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          setError(authError.message);
          return;
        }
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name.trim(),
            },
          },
        });

        if (authError) {
          setError(authError.message);
          return;
        }

        if (!data.session) {
          setNotice(
            "Account created, but Supabase email confirmation is still enabled. Disable it for this flow or add confirmation handling before using signup in production.",
          );
          return;
        }
      }

      // Use a full page navigation so the browser has the latest auth cookies
      // before the authenticated app renders.
      window.location.assign("/app");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-background px-6 py-10 md:px-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-linear-to-b from-muted/60 via-muted/20 to-transparent" />
      <div className="pointer-events-none absolute -left-24 top-24 size-72 rounded-full bg-primary/6 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 size-80 rounded-full bg-secondary blur-3xl" />

      <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_420px]">
        <section className="hidden min-h-[34rem] flex-col justify-between rounded-[2rem] border border-border/70 bg-card/85 p-8 shadow-[0_32px_120px_-48px_rgba(15,23,42,0.35)] lg:flex">
          <div className="max-w-xl">
            <p className="text-[0.72rem] font-medium uppercase tracking-[0.32em] text-muted-foreground">
              {content.eyebrow}
            </p>
            <h1 className="mt-4 max-w-2xl text-5xl font-semibold tracking-tight text-foreground">
              {content.title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              {content.description}
            </p>
          </div>

          <div className="grid gap-3">
            {highlights.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/85 px-4 py-3"
              >
                <div className="rounded-2xl border border-border/70 bg-muted/60 p-2.5">
                  <Icon className="size-4 text-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Card className="border border-border/70 bg-card/95 py-0 shadow-[0_26px_100px_-44px_rgba(15,23,42,0.45)]">
          <CardHeader className="border-b border-border/70 bg-linear-to-br from-background via-background to-muted/35 px-6 py-6">
            <CardDescription className="text-[0.72rem] font-medium uppercase tracking-[0.3em] text-muted-foreground">
              {content.eyebrow}
            </CardDescription>
            <CardTitle className="mt-2 text-3xl tracking-tight">{content.title}</CardTitle>
            <CardDescription className="max-w-md text-sm leading-6">
              {content.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 py-6">
            <form onSubmit={onSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-4">
                {mode === "signup" ? (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      required
                      autoComplete="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                ) : null}

                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    required
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@company.com"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    required
                    type="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={mode === "login" ? "Enter your password" : "Create a password"}
                  />
                </div>
              </div>

              {error ? (
                <p className="rounded-xl border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              {notice ? (
                <p className="rounded-xl border border-border/80 bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  {notice}
                </p>
              ) : null}

              <Button type="submit" size="lg" className="w-full" disabled={isPending}>
                <LockKeyhole data-icon="inline-start" />
                {isPending ? "Working..." : content.button}
                <ArrowRight data-icon="inline-end" />
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-border/70 pt-5 text-sm text-muted-foreground">
              <span>{content.footerLabel}</span>
              <Button asChild variant="ghost">
                <Link href={content.footerHref}>{content.footerAction}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
