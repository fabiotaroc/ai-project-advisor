import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProjectInvite, ProjectInviteRole } from "@/lib/types";

type InviteResult =
  | { status: "already_member" }
  | { status: "member_added" }
  | { status: "invite_pending"; invite: ProjectInvite }
  | { status: "invite_created"; invite: ProjectInvite };

type OwnerProject = {
  id: string;
  name: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function getOwnedProject(projectId: string, userId: string): Promise<OwnerProject | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_members")
    .select("role, project:projects!inner(id,name)")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .eq("role", "owner")
    .maybeSingle();

  if (error) throw error;

  const project = Array.isArray(data?.project) ? data.project[0] : data?.project;

  if (!project) {
    return null;
  }

  return {
    id: project.id,
    name: project.name,
  };
}

export function canUseProjectInvites() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

export async function listPendingProjectInvitesForOwner({
  projectId,
  userId,
}: {
  projectId: string;
  userId: string;
}) {
  if (!canUseProjectInvites()) {
    return [] satisfies ProjectInvite[];
  }

  const project = await getOwnedProject(projectId, userId);
  if (!project) {
    return [] satisfies ProjectInvite[];
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("project_invites")
    .select("id,project_id,email,role,status,created_at,accepted_at,revoked_at")
    .eq("project_id", projectId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ProjectInvite[];
}

export async function syncPendingProjectInvitesForUser({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  if (!canUseProjectInvites()) {
    return [] as string[];
  }

  const normalizedEmail = normalizeEmail(email);
  const admin = createSupabaseAdminClient();

  const { data: invites, error: inviteError } = await admin
    .from("project_invites")
    .select("id,project_id,role")
    .eq("email", normalizedEmail)
    .eq("status", "pending");

  if (inviteError) throw inviteError;
  if (!invites || invites.length === 0) return [];

  const projectIds = [...new Set(invites.map((invite) => invite.project_id))];

  const { data: memberships, error: membershipError } = await admin
    .from("project_members")
    .select("project_id")
    .eq("user_id", userId)
    .in("project_id", projectIds);

  if (membershipError) throw membershipError;

  const existingProjectIds = new Set((memberships ?? []).map((membership) => membership.project_id));
  const membershipsToInsert = invites
    .filter((invite) => !existingProjectIds.has(invite.project_id))
    .map((invite) => ({
      project_id: invite.project_id,
      user_id: userId,
      role: invite.role,
    }));

  if (membershipsToInsert.length > 0) {
    const { error: insertError } = await admin.from("project_members").insert(membershipsToInsert);
    if (insertError) throw insertError;
  }

  const { error: acceptError } = await admin
    .from("project_invites")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .in(
      "id",
      invites.map((invite) => invite.id),
    );

  if (acceptError) throw acceptError;

  return projectIds;
}

export async function createProjectInvite({
  projectId,
  userId,
  email,
  role,
  appUrl,
}: {
  projectId: string;
  userId: string;
  email: string;
  role: ProjectInviteRole;
  appUrl: string;
}): Promise<InviteResult> {
  const project = await getOwnedProject(projectId, userId);
  if (!project) {
    throw new Error("You do not have permission to invite collaborators to this project.");
  }

  if (!canUseProjectInvites()) {
    throw new Error("Project invites require SUPABASE_SECRET_KEY to be configured.");
  }

  const normalizedEmail = normalizeEmail(email);
  const admin = createSupabaseAdminClient();

  const { data: existingProfile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (profileError) throw profileError;

  if (existingProfile) {
    const { data: existingMembership, error: membershipLookupError } = await admin
      .from("project_members")
      .select("user_id")
      .eq("project_id", projectId)
      .eq("user_id", existingProfile.id)
      .maybeSingle();

    if (membershipLookupError) throw membershipLookupError;
    if (existingMembership) {
      return { status: "already_member" };
    }

    const { error: insertMemberError } = await admin.from("project_members").insert({
      project_id: projectId,
      user_id: existingProfile.id,
      role,
    });

    if (insertMemberError) throw insertMemberError;

    return { status: "member_added" };
  }

  const { data: existingInvite, error: inviteLookupError } = await admin
    .from("project_invites")
    .select("id,project_id,email,role,status,created_at,accepted_at,revoked_at")
    .eq("project_id", projectId)
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .maybeSingle();

  if (inviteLookupError) throw inviteLookupError;
  if (existingInvite) {
    return { status: "invite_pending", invite: existingInvite as ProjectInvite };
  }

  const { data: invite, error: createInviteError } = await admin
    .from("project_invites")
    .insert({
      project_id: projectId,
      email: normalizedEmail,
      role,
      invited_by: userId,
      status: "pending",
    })
    .select("id,project_id,email,role,status,created_at,accepted_at,revoked_at")
    .single();

  if (createInviteError) throw createInviteError;

  const { error: sendInviteError } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
    redirectTo: new URL("/app", appUrl).toString(),
    data: {
      invitedProjectId: projectId,
      invitedProjectName: project.name,
    },
  });

  if (sendInviteError) {
    await admin.from("project_invites").delete().eq("id", invite.id);
    throw sendInviteError;
  }

  return {
    status: "invite_created",
    invite: invite as ProjectInvite,
  };
}
