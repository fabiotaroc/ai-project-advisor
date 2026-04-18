import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { getProjectAccessForUser } from "@/lib/server/data";
import {
  triggerOnConversationEnded,
  triggerWikiLint,
} from "@/lib/server/librarian/triggers";

export const maxDuration = 120;

const schema = z.discriminatedUnion("trigger", [
  z.object({
    trigger: z.literal("conversation"),
    conversationId: z.string().uuid(),
  }),
  z.object({
    trigger: z.literal("lint"),
    focus: z.string().min(1).max(500).optional(),
  }),
]);

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

  if (body.trigger === "conversation") {
    const result = await triggerOnConversationEnded({
      projectId,
      userId: user.id,
      conversationId: body.conversationId,
    });
    return NextResponse.json({ run: result });
  }

  const result = await triggerWikiLint({
    projectId,
    userId: user.id,
    userFocus: body.focus,
  });
  return NextResponse.json({ run: result });
}
