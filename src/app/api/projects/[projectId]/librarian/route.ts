import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { getProjectAccessForUser } from "@/lib/server/data";
import { triggerOnSourceIngested } from "@/lib/server/librarian/triggers";

export const maxDuration = 120;

const schema = z.object({
  trigger: z.literal("source_ingested"),
  sourceId: z.string().uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const user = await getOptionalSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await getProjectAccessForUser(user.id, projectId);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (access.role === "viewer") {
    return NextResponse.json(
      { error: "Viewers have read-only access to this project." },
      { status: 403 },
    );
  }

  const body = schema.parse(await request.json());

  const result = await triggerOnSourceIngested({
    projectId,
    userId: user.id,
    sourceId: body.sourceId,
  });
  return NextResponse.json({ run: result });
}
