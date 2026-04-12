import type { UIMessage } from "ai";
import { ChatPanel } from "@/components/chat/chat-panel";
import { getSessionUser } from "@/lib/server/auth";
import {
  getConversationWithMessages,
  getLatestConversationWithMessages,
} from "@/lib/server/chat-history";

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ c?: string; new?: string }>;
}) {
  const { projectId } = await params;
  const sp = await searchParams;
  const conversationId = sp.c;
  const isNewChat = sp.new !== undefined;
  const user = await getSessionUser();

  let activeId: string | undefined;
  let initialMessages: UIMessage[] = [];

  if (conversationId) {
    const conversation = await getConversationWithMessages(projectId, user.id, conversationId);

    if (conversation) {
      activeId = conversation.conversation.id;
      initialMessages = conversation.messages;
    }
  } else if (!isNewChat) {
    const latest = await getLatestConversationWithMessages(projectId, user.id);
    if (latest) {
      activeId = latest.conversation.id;
      initialMessages = latest.messages;
    }
  }

  return (
    <ChatPanel
      projectId={projectId}
      chatId={activeId}
      initialMessages={initialMessages}
    />
  );
}
