import type { ReactNode } from "react";
import { getSessionUser, syncSessionProjectInvites } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await getSessionUser();
  await syncSessionProjectInvites();

  return children;
}
