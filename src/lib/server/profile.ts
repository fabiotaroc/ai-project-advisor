import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AccountProfile = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export async function getAccountProfile(userId: string): Promise<AccountProfile | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id,email,first_name,last_name,name,avatar_url,created_at,updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function normalizeName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 80) : null;
}

function normalizeAvatarUrl(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, 1024);
}

export async function updateAccountProfile(
  userId: string,
  patch: { first_name?: unknown; last_name?: unknown; avatar_url?: unknown },
): Promise<AccountProfile> {
  const admin = createSupabaseAdminClient();

  const update: {
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
    name?: string | null;
  } = {};

  if ("first_name" in patch) {
    update.first_name = normalizeName(patch.first_name);
  }
  if ("last_name" in patch) {
    update.last_name = normalizeName(patch.last_name);
  }
  if ("avatar_url" in patch) {
    const next = normalizeAvatarUrl(patch.avatar_url);
    if (next !== undefined) update.avatar_url = next;
  }

  if ("first_name" in patch || "last_name" in patch) {
    const { data: existing } = await admin
      .from("profiles")
      .select("first_name,last_name")
      .eq("id", userId)
      .maybeSingle();
    const first =
      "first_name" in update ? update.first_name : existing?.first_name ?? null;
    const last =
      "last_name" in update ? update.last_name : existing?.last_name ?? null;
    const combined = [first, last].filter((part): part is string => Boolean(part)).join(" ");
    update.name = combined.length > 0 ? combined : null;
  }

  const { data, error } = await admin
    .from("profiles")
    .update(update)
    .eq("id", userId)
    .select("id,email,first_name,last_name,name,avatar_url,created_at,updated_at")
    .single();

  if (error) throw error;
  return data;
}
