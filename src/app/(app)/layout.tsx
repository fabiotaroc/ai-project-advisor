import type { ReactNode } from "react";
import { ProjectInviteSync } from "@/components/auth/project-invite-sync";
import { getSessionUser } from "@/lib/server/auth";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  return (
    <>
      <ProjectInviteSync userId={user.id} />
      {children}
    </>
  );
}
