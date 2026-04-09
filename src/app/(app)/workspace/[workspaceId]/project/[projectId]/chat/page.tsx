import { ChatPanel } from "@/components/chat/chat-panel";

export default async function ChatPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ChatPanel projectId={projectId} />;
}
