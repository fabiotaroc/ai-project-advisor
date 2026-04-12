import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { getProjectAccessForUser } from "@/lib/server/data";
import { createConversation } from "@/lib/server/chat-history";

const schema = z.object({
  projectId: z.string().uuid(),
});

export async function POST(request: Request) {
  const user = await getOptionalSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = schema.parse(await request.json());

  const access = await getProjectAccessForUser(user.id, body.projectId);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const conversation = await createConversation(body.projectId, user.id);
  return NextResponse.json(conversation);
}
