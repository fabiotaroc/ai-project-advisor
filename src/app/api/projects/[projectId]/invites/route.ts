import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { createProjectInvite } from "@/lib/server/project-invites";

const schema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["editor", "viewer"]).default("editor"),
});

const paramsSchema = z.object({
  projectId: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = await getOptionalSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = paramsSchema.parse(await params);
  const body = schema.parse(await request.json());

  try {
    const result = await createProjectInvite({
      projectId,
      userId: user.id,
      email: body.email,
      role: body.role,
      appUrl: request.nextUrl.origin,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create invite.";
    const status = message.includes("permission") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
