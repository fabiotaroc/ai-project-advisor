import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { removeMember, updateMemberRole } from "@/lib/server/project-members";

const paramsSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
});

const patchSchema = z.object({
  role: z.enum(["editor", "viewer"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; userId: string }> },
) {
  const user = await getOptionalSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, userId: targetUserId } = paramsSchema.parse(await params);
  const body = patchSchema.parse(await request.json());

  try {
    await updateMemberRole({
      projectId,
      userId: user.id,
      targetUserId,
      newRole: body.role,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update role.";
    const status = message.includes("owner") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string; userId: string }> },
) {
  const user = await getOptionalSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, userId: targetUserId } = paramsSchema.parse(await params);

  try {
    await removeMember({
      projectId,
      userId: user.id,
      targetUserId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove member.";
    const status = message.includes("owner") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
