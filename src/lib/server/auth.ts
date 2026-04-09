import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncPendingProjectInvitesForUser } from "@/lib/server/project-invites";

export const getOptionalSessionUser = cache(async (): Promise<User | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
});

export const getSessionUser = cache(async (): Promise<User> => {
  const user = await getOptionalSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
});

export async function redirectIfAuthenticated() {
  const user = await getOptionalSessionUser();

  if (user) {
    redirect("/app");
  }
}

export const syncSessionProjectInvites = cache(async () => {
  const user = await getOptionalSessionUser();

  if (!user?.email) {
    return [] as string[];
  }

  return syncPendingProjectInvitesForUser({
    userId: user.id,
    email: user.email,
  });
});
