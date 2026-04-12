import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { getProjectAccessForUser } from "@/lib/server/data";
import { listProjectMembers } from "@/lib/server/project-members";

const paramsSchema = z.object({ projectId: z.string().uuid() });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = await getOptionalSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = paramsSchema.parse(await params);
  const access = await getProjectAccessForUser(user.id, projectId);
  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const members = await listProjectMembers(projectId);
  return NextResponse.json({ members });
}
