import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProjectRole, ProjectInviteRole } from "@/lib/types";

export type ProjectMember = {
  user_id: string;
  role: ProjectRole;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
};

async function assertOwner(projectId: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Only the project owner can manage members.");
}

export async function listProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const admin = createSupabaseAdminClient();

  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .single();

  if (projectError) throw projectError;

  const { data: members, error: membersError } = await admin
    .from("project_members")
    .select("user_id,role,created_at")
    .eq("project_id", projectId);

  if (membersError) throw membersError;

  const userIds = [...new Set([project.owner_id, ...(members ?? []).map((m) => m.user_id)])];

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id,email,name,avatar_url")
    .in("id", userIds);

  if (profilesError) throw profilesError;

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const memberMap = new Map((members ?? []).map((m) => [m.user_id, m]));

  return userIds.map((uid) => {
    const profile = profileMap.get(uid);
    const membership = memberMap.get(uid);
    const isOwner = uid === project.owner_id;

    return {
      user_id: uid,
      role: isOwner ? "owner" : (membership?.role as ProjectRole) ?? "viewer",
      email: profile?.email ?? "unknown",
      name: profile?.name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      created_at: membership?.created_at ?? "",
    };
  });
}

export async function updateMemberRole({
  projectId,
  userId,
  targetUserId,
  newRole,
}: {
  projectId: string;
  userId: string;
  targetUserId: string;
  newRole: ProjectInviteRole;
}) {
  await assertOwner(projectId, userId);

  const supabase = await createSupabaseServerClient();
  const { data: project } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .single();

  if (project?.owner_id === targetUserId) {
    throw new Error("Cannot change the owner's role.");
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("project_members")
    .update({ role: newRole })
    .eq("project_id", projectId)
    .eq("user_id", targetUserId);

  if (error) throw error;
}

export async function removeMember({
  projectId,
  userId,
  targetUserId,
}: {
  projectId: string;
  userId: string;
  targetUserId: string;
}) {
  await assertOwner(projectId, userId);

  const supabase = await createSupabaseServerClient();
  const { data: project } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", projectId)
    .single();

  if (project?.owner_id === targetUserId) {
    throw new Error("Cannot remove the project owner.");
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", targetUserId);

  if (error) throw error;
}

export async function revokeInvite({
  projectId,
  userId,
  inviteId,
}: {
  projectId: string;
  userId: string;
  inviteId: string;
}) {
  await assertOwner(projectId, userId);

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("project_invites")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("project_id", projectId)
    .eq("status", "pending");

  if (error) throw error;
}
