export type CreatedConversation = {
  id: string;
  title: string;
  created_at: string;
};

export async function createProjectConversation(projectId: string) {
  const response = await fetch("/api/chat/conversations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ projectId }),
  });

  if (!response.ok) {
    let message = "Failed to create a new conversation.";

    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      // Keep the fallback error message when the response is not JSON.
    }

    throw new Error(message);
  }

  return (await response.json()) as CreatedConversation;
}
