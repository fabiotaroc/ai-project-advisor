"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY_PREFIX = "project-invite-sync";

export function ProjectInviteSync({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    const storageKey = `${STORAGE_KEY_PREFIX}:${userId}`;

    if (sessionStorage.getItem(storageKey)) {
      return;
    }

    sessionStorage.setItem(storageKey, "pending");

    let cancelled = false;

    const syncInvites = async () => {
      try {
        const response = await fetch("/api/project-invites/sync", {
          method: "POST",
        });

        if (!response.ok) {
          sessionStorage.removeItem(storageKey);
          return;
        }

        const data = (await response.json()) as { projectIds?: string[] };
        sessionStorage.setItem(storageKey, "done");

        if (!cancelled && Array.isArray(data.projectIds) && data.projectIds.length > 0) {
          router.refresh();
        }
      } catch {
        sessionStorage.removeItem(storageKey);
      }
    };

    void syncInvites();

    return () => {
      cancelled = true;
    };
  }, [router, userId]);

  return null;
}
