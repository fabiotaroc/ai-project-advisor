"use client";

import { FormEvent, useCallback, useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ProjectInvite, ProjectInviteRole, ProjectRole } from "@/lib/types";
import {
  ChevronDown,
  Crown,
  Loader2,
  Mail,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";

export type MemberData = {
  user_id: string;
  role: ProjectRole;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
};

function initials(name: string | null | undefined, email: string) {
  const safeName = typeof name === "string" ? name.trim() : "";

  if (safeName) {
    return safeName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function roleBadgeVariant(role: ProjectRole) {
  switch (role) {
    case "owner":
      return "default" as const;
    case "editor":
      return "secondary" as const;
    case "viewer":
      return "outline" as const;
  }
}

function formatInviteFeedback(status: string) {
  switch (status) {
    case "member_added":
      return "User added to the project.";
    case "invite_pending":
      return "That email already has a pending invite.";
    case "invite_created":
      return "Invite sent.";
    case "already_member":
      return "That user already has access.";
    default:
      return "Done.";
  }
}

function MemberRow({
  member,
  isOwner,
  projectId,
  onRemoved,
  onRoleChanged,
}: {
  member: MemberData;
  isOwner: boolean;
  projectId: string;
  onRemoved: (userId: string) => void;
  onRoleChanged: (userId: string, newRole: ProjectRole) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const canManage = isOwner && member.role !== "owner";

  function changeRole(newRole: ProjectInviteRole) {
    startTransition(async () => {
      const res = await fetch(`/api/projects/${projectId}/members/${member.user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) onRoleChanged(member.user_id, newRole);
    });
  }

  function removeMember() {
    startTransition(async () => {
      const res = await fetch(`/api/projects/${projectId}/members/${member.user_id}`, {
        method: "DELETE",
      });
      if (res.ok) onRemoved(member.user_id);
    });
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
        isPending && "opacity-50",
      )}
    >
      <Avatar className="size-9 shrink-0">
        <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
          {initials(member.name, member.email)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {member.name ?? member.email}
        </p>
        {member.name ? (
          <p className="truncate text-xs text-muted-foreground">{member.email}</p>
        ) : null}
      </div>

      {canManage ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs">
              <Badge variant={roleBadgeVariant(member.role)} className="pointer-events-none">
                {member.role}
              </Badge>
              <ChevronDown className="size-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem
              disabled={member.role === "editor"}
              onSelect={() => changeRole("editor")}
            >
              Editor
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={member.role === "viewer"}
              onSelect={() => changeRole("viewer")}
            >
              Viewer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Badge variant={roleBadgeVariant(member.role)}>
          {member.role === "owner" && <Crown className="mr-1 size-3" />}
          {member.role}
        </Badge>
      )}

      {canManage ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive">
              <UserMinus className="size-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove member</AlertDialogTitle>
              <AlertDialogDescription>
                Remove <strong>{member.name ?? member.email}</strong> from this project? They will
                lose all access immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={removeMember}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}

function PendingInviteRow({
  invite,
  isOwner,
  projectId,
  onRevoked,
}: {
  invite: ProjectInvite;
  isOwner: boolean;
  projectId: string;
  onRevoked: (inviteId: string) => void;
}) {
  const [isPending, startTransition] = useTransition();

  function revoke() {
    startTransition(async () => {
      const res = await fetch(`/api/projects/${projectId}/invites/${invite.id}`, {
        method: "DELETE",
      });
      if (res.ok) onRevoked(invite.id);
    });
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
        isPending && "opacity-50",
      )}
    >
      <Avatar className="size-9 shrink-0">
        <AvatarFallback className="border border-dashed border-border bg-muted/50 text-xs text-muted-foreground">
          <Mail className="size-3.5" />
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{invite.email}</p>
        <p className="text-xs text-muted-foreground">Pending invite</p>
      </div>

      <Badge variant="outline" className="text-muted-foreground">
        {invite.role}
      </Badge>

      {isOwner ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive">
              <Trash2 className="size-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke invite</AlertDialogTitle>
              <AlertDialogDescription>
                Revoke the pending invite for <strong>{invite.email}</strong>? They will not be able
                to join this project.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={revoke}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Revoke
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}

export function MembersPanel({
  projectId,
  projectRole,
  initialMembers,
  initialInvites,
}: {
  projectId: string;
  projectRole: ProjectRole;
  initialMembers: MemberData[];
  initialInvites: ProjectInvite[];
}) {
  const isOwner = projectRole === "owner";
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ProjectInviteRole>("editor");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRemoved = useCallback((userId: string) => {
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
  }, []);

  const handleRoleChanged = useCallback((userId: string, newRole: ProjectRole) => {
    setMembers((prev) =>
      prev.map((m) => (m.user_id === userId ? { ...m, role: newRole } : m)),
    );
  }, []);

  const handleRevoked = useCallback((inviteId: string) => {
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
  }, []);

  async function inviteCollaborator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || isSubmitting || !isOwner) return;

    setIsSubmitting(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, role: inviteRole }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(payload.error ?? "Unable to send the invite right now.");
        return;
      }

      setFeedback(formatInviteFeedback(payload.status));
      setEmail("");

      if (payload.status === "member_added") {
        const res = await fetch(`/api/projects/${projectId}/members`);
        if (res.ok) {
          const { members: updatedMembers } = await res.json();
          setMembers(updatedMembers);
        }
      }

      if (payload.invite) {
        setInvites((prev) => {
          const next = prev.filter((i) => i.id !== payload.invite.id);
          return [payload.invite, ...next];
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Members</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage who has access to this project and their permissions.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">
              Team members
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {members.length}
              </span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <div className="divide-y divide-border/60">
            {members.map((member) => (
              <MemberRow
                key={member.user_id}
                member={member}
                isOwner={isOwner}
                projectId={projectId}
                onRemoved={handleRemoved}
                onRoleChanged={handleRoleChanged}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {invites.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground" />
              <CardTitle className="text-base">
                Pending invites
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {invites.length}
                </span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            <div className="divide-y divide-border/60">
              {invites.map((invite) => (
                <PendingInviteRow
                  key={invite.id}
                  invite={invite}
                  isOwner={isOwner}
                  projectId={projectId}
                  onRevoked={handleRevoked}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {isOwner ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="size-4 text-muted-foreground" />
              <CardTitle className="text-base">Invite collaborator</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Send an invite by email. New users will be prompted to create an account.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={inviteCollaborator} className="flex flex-col gap-4">
              <div className="flex items-end gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="invite-email">Email address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFeedback(null);
                      setError(null);
                    }}
                    placeholder="teammate@company.com"
                  />
                </div>
                <div className="w-32 space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as ProjectInviteRole)}>
                    <SelectTrigger id="invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" disabled={isSubmitting || !email.trim()} className="w-fit">
                {isSubmitting ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <UserPlus data-icon="inline-start" />
                )}
                {isSubmitting ? "Sending…" : "Send invite"}
              </Button>
            </form>

            {error ? (
              <p className="mt-4 rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            {feedback ? (
              <p className="mt-4 rounded-lg border border-border/80 bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {feedback}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
