import type { UIMessage } from "ai";
import { ChatPanel } from "@/components/chat/chat-panel";
import { getSessionUser } from "@/lib/server/auth";
import {
  getConversationWithMessages,
  getLatestConversationWithMessages,
} from "@/lib/server/chat-history";
import { getAccountProfile, type AccountProfile } from "@/lib/server/profile";

function resolveUserGreetingName(
  profile: AccountProfile | null,
  fallbackEmail: string | null | undefined,
): string {
  const first = profile?.first_name?.trim();
  if (first) return first;
  const fullName = profile?.name?.trim();
  if (fullName) return fullName;
  const localPart = fallbackEmail?.split("@")[0]?.trim();
  if (localPart) return localPart;
  return "there";
}

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
  const profilePromise = getAccountProfile(user.id).catch(() => null);

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

  const profile = await profilePromise;
  const userGreetingName = resolveUserGreetingName(profile, profile?.email ?? user.email);

  return (
    <ChatPanel
      projectId={projectId}
      chatId={activeId}
      initialMessages={initialMessages}
      userGreetingName={userGreetingName}
    />
  );
}
