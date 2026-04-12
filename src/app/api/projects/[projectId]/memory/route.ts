import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { getProjectAccessForUser } from "@/lib/server/data";
import { getConversationMessages } from "@/lib/server/chat-history";
import { generateConversationMemory } from "@/lib/server/memory";

export const maxDuration = 30;

const schema = z.object({
  conversationId: z.string().uuid(),
  conversationTitle: z.string().min(1).max(200).default("Untitled chat"),
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

  const body = schema.parse(await request.json());
  const uiMessages = await getConversationMessages(body.conversationId);

  const messages = uiMessages.map((m) => ({
    role: m.role,
    content: m.parts
      .flatMap((p) => (p.type === "text" && p.text ? [p.text] : []))
      .join("\n\n"),
  }));

  await generateConversationMemory({
    projectId,
    userId: user.id,
    conversationTitle: body.conversationTitle,
    messages,
  });

  return NextResponse.json({ ok: true });
}
