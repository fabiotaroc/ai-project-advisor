import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteConversation,
  getConversationForUser,
  renameConversation,
} from "@/lib/server/chat-history";
import { getOptionalSessionUser } from "@/lib/server/auth";

const renameSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const user = await getOptionalSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await params;
  const conversation = await getConversationForUser(conversationId, user.id);

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const body = renameSchema.parse(await request.json());
  const updatedConversation = await renameConversation(conversationId, body.title);

  return NextResponse.json({
    id: updatedConversation.id,
    title: updatedConversation.title,
    created_at: updatedConversation.created_at,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const user = await getOptionalSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await params;
  const conversation = await getConversationForUser(conversationId, user.id);

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  await deleteConversation(conversationId);

  return NextResponse.json({ id: conversationId });
}
