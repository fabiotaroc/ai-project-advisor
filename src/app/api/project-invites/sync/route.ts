import { NextResponse } from "next/server";
import { syncSessionProjectInvites } from "@/lib/server/auth";

export async function POST() {
  const projectIds = await syncSessionProjectInvites();

  return NextResponse.json({ projectIds });
}
