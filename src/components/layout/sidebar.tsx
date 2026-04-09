"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import {
  Activity,
  BookOpen,
  Files,
  FolderOpen,
  Loader2,
  Mail,
  MessageSquare,
  Search,
  Shield,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ProjectInvite, ProjectRole } from "@/lib/types";

const projectLinks = [
  { key: "files", label: "Files", icon: Files },
  { key: "sources", label: "Sources", icon: BookOpen },
  { key: "search", label: "Search", icon: Search },
  { key: "activity", label: "Activity", icon: Activity },
 ] as const;

const chatLinks = [{ key: "chat", label: "Chat", icon: MessageSquare }] as const;

function formatInviteFeedback(status: string) {
  switch (status) {
    case "member_added":
      return "Existing user added directly to the project.";
    case "invite_pending":
      return "That email already has a pending invite.";
    case "invite_created":
      return "Invite email sent.";
    case "already_member":
      return "That user already has access to this project.";
    default:
      return "Collaborator updated.";
  }
}

export function ProjectSidebar({
  projectId,
  projectName,
  projectRole,
  initialInvites,
}: {
  projectId: string;
  projectName: string;
  projectRole: ProjectRole;
  initialInvites: ProjectInvite[];
}) {
  const current = useSelectedLayoutSegment() ?? "chat";
  const [email, setEmail] = useState("");
  const [invites, setInvites] = useState(initialInvites);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function inviteCollaborator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || isSubmitting || projectRole !== "owner") return;

    setIsSubmitting(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          role: "editor",
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error ?? "Unable to send the invite right now.");
        return;
      }

      setFeedback(formatInviteFeedback(payload.status));
      setEmail("");

      if (payload.invite) {
        setInvites((currentInvites) => {
          const nextInvites = currentInvites.filter((invite) => invite.id !== payload.invite.id);
          return [payload.invite, ...nextInvites];
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <aside className="flex min-h-0 w-72 shrink-0 flex-col gap-4 border-r border-border bg-sidebar p-4">
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="mb-1 flex items-center gap-2.5 px-2">
          <FolderOpen className="size-4 text-muted-foreground" />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-foreground">{projectName}</h2>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5">
          {projectLinks.map(({ key, label, icon: Icon }) => {
            const href = `/project/${projectId}/${key}`;
            const active = current === key;
            return (
              <Link
                key={key}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex min-h-0 flex-1 flex-col gap-2 px-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Chats
          </p>
          <div className="flex min-h-0 flex-col gap-1 overflow-y-auto pr-1">
            {chatLinks.map(({ key, label, icon: Icon }) => {
              const href = `/project/${projectId}/${key}`;
              const active = current === key;
              return (
                <Link
                  key={key}
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm transition-colors",
                    active
                      ? "border-primary/30 bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="rounded-2xl border border-border/70 bg-background/85 p-3">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            <Shield className="size-3.5" />
            Access
          </div>
          <p className="mt-2 text-sm font-medium text-foreground">
            {projectRole === "owner" ? "Project owner" : `${projectRole} access`}
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {projectRole === "owner"
              ? "You can invite collaborators and manage who joins this project."
              : "Your permissions follow the role assigned to this project."}
          </p>
        </div>

        {projectRole === "owner" ? (
          <div className="rounded-2xl border border-border/70 bg-background/90 p-3">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              <Mail className="size-3.5" />
              Project invites
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">Invite by email</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              New invites grant editor access and will attach to the account once the user signs in.
            </p>

            <form onSubmit={inviteCollaborator} className="mt-3 flex flex-col gap-2.5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite-email" className="sr-only">
                  Invite collaborator email
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="teammate@company.com"
                />
              </div>
              <Button type="submit" variant="outline" disabled={isSubmitting || !email.trim()}>
                {isSubmitting ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <UserPlus data-icon="inline-start" />
                )}
                {isSubmitting ? "Sending..." : "Invite collaborator"}
              </Button>
            </form>

            {error ? (
              <p className="mt-3 rounded-xl border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            {feedback ? (
              <p className="mt-3 rounded-xl border border-border/80 bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {feedback}
              </p>
            ) : null}

            <div className="mt-4 flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                Pending invites
              </p>
              {invites.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  No pending invites yet.
                </p>
              ) : (
                invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2"
                  >
                    <p className="truncate text-sm font-medium text-foreground">{invite.email}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {invite.role}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
