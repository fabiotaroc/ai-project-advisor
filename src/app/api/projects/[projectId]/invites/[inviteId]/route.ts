import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { revokeInvite } from "@/lib/server/project-members";

const paramsSchema = z.object({
  projectId: z.string().uuid(),
  inviteId: z.string().uuid(),
});

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; inviteId: string }> },
) {
  const user = await getOptionalSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, inviteId } = paramsSchema.parse(await params);

  try {
    await revokeInvite({
      projectId,
      userId: user.id,
      inviteId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to revoke invite.";
    const status = message.includes("owner") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
