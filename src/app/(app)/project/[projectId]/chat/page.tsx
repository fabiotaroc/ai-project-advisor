import { ChatPanel } from "@/components/chat/chat-panel";
import { getSessionUser } from "@/lib/server/auth";
import {
  getLatestConversationWithMessages,
  listProjectConversations,
} from "@/lib/server/chat-history";

export default async function ChatPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await getSessionUser();

  const [chat, conversations] = await Promise.all([
    getLatestConversationWithMessages(projectId, user.id),
    listProjectConversations(projectId, user.id),
  ]);

  return (
    <ChatPanel
      projectId={projectId}
      chatId={chat?.conversation.id ?? projectId}
      initialMessages={chat?.messages ?? []}
      conversations={conversations}
    />
  );
}
