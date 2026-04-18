export type CreatedConversation = {
  id: string;
  title: string;
  created_at: string;
};

async function getResponseError(response: Response, fallbackMessage: string) {
  let message = fallbackMessage;

  try {
    const payload = (await response.json()) as { error?: string };
    if (payload.error) {
      message = payload.error;
    }
  } catch {
    // Keep the fallback error message when the response is not JSON.
  }

  return message;
}

export async function createProjectConversation(projectId: string) {
  const response = await fetch("/api/chat/conversations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ projectId }),
  });

  if (!response.ok) {
    throw new Error(await getResponseError(response, "Failed to create a new chat."));
  }

  return (await response.json()) as CreatedConversation;
}

export async function renameProjectConversation(conversationId: string, title: string) {
  const response = await fetch(`/api/chat/conversations/${conversationId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    throw new Error(await getResponseError(response, "Failed to rename the chat."));
  }

  return (await response.json()) as CreatedConversation;
}

export async function triggerConversationMemory(
  projectId: string,
  conversationId: string,
) {
  fetch(`/api/projects/${projectId}/librarian`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trigger: "conversation", conversationId }),
  }).catch(() => {});
}

export async function triggerWikiLint(projectId: string, focus?: string) {
  const response = await fetch(`/api/projects/${projectId}/librarian`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trigger: "lint", ...(focus ? { focus } : {}) }),
  });
  if (!response.ok) {
    throw new Error(await getResponseError(response, "Failed to run the wiki lint."));
  }
  return response.json();
}

export async function deleteProjectConversation(conversationId: string) {
  const response = await fetch(`/api/chat/conversations/${conversationId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await getResponseError(response, "Failed to delete the chat."));
  }

  return (await response.json()) as { id: string };
}
