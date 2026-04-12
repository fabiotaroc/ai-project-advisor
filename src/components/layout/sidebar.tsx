"use client";

import Link from "next/link";
import { useRouter, useSelectedLayoutSegment, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Activity,
  BookOpen,
  BookText,
  FolderOpen,
  LayoutDashboard,
  Library,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import {
  createProjectConversation,
  deleteProjectConversation,
  renameProjectConversation,
} from "@/lib/chat-client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const projectLinks = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "files", label: "Wiki", icon: Library },
  { key: "glossary", label: "Glossary", icon: BookText },
  { key: "sources", label: "Sources", icon: BookOpen },
  { key: "search", label: "Search", icon: Search },
  { key: "activity", label: "Activity", icon: Activity },
  { key: "settings", label: "Settings", icon: Settings },
] as const;

type ConversationSummary = {
  id: string;
  title: string;
  created_at: string;
};

const CONVERSATION_NAVIGATION_DELAY_MS = 180;

function truncateConversationTitle(title: string) {
  return title.length > 36 ? `${title.slice(0, 33)}...` : title;
}

export function ProjectSidebar({
  projectId,
  projectName,
  conversations = [],
}: {
  projectId: string;
  projectName: string;
  conversations?: ConversationSummary[];
}) {
  const router = useRouter();
  const segment = useSelectedLayoutSegment() ?? "chat";
  const searchParams = useSearchParams();
  const activeConversationId = searchParams.get("c");
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [conversationItems, setConversationItems] = useState(conversations);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [pendingConversationId, setPendingConversationId] = useState<string | null>(null);
  const navigationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setConversationItems(conversations);
  }, [conversations]);

  useEffect(() => {
    if (editingConversationId && !conversationItems.some((conversation) => conversation.id === editingConversationId)) {
      setEditingConversationId(null);
      setDraftTitle("");
    }
  }, [conversationItems, editingConversationId]);

  useEffect(() => {
    return () => {
      if (navigationTimerRef.current) {
        clearTimeout(navigationTimerRef.current);
      }
    };
  }, []);

  function clearScheduledNavigation() {
    if (navigationTimerRef.current) {
      clearTimeout(navigationTimerRef.current);
      navigationTimerRef.current = null;
    }
  }

  async function startNewConversation() {
    if (isCreatingConversation) return;

    setIsCreatingConversation(true);

    try {
      const conversation = await createProjectConversation(projectId);
      router.push(`/project/${projectId}/chat?c=${conversation.id}`);
      router.refresh();
    } catch (error) {
      console.error("Failed to create conversation", error);
    } finally {
      setIsCreatingConversation(false);
    }
  }

  function startRenamingConversation(conversation: ConversationSummary) {
    clearScheduledNavigation();
    setEditingConversationId(conversation.id);
    setDraftTitle(conversation.title);
  }

  function cancelRenamingConversation() {
    setEditingConversationId(null);
    setDraftTitle("");
  }

  function scheduleConversationNavigation(conversationId: string) {
    if (editingConversationId || pendingConversationId) return;

    clearScheduledNavigation();
    navigationTimerRef.current = setTimeout(() => {
      navigationTimerRef.current = null;
      router.push(`/project/${projectId}/chat?c=${conversationId}`);
    }, CONVERSATION_NAVIGATION_DELAY_MS);
  }

  async function submitConversationRename(conversation: ConversationSummary) {
    clearScheduledNavigation();

    const trimmedTitle = draftTitle.trim();

    if (!trimmedTitle || trimmedTitle === conversation.title) {
      cancelRenamingConversation();
      return;
    }

    setPendingConversationId(conversation.id);

    try {
      const updatedConversation = await renameProjectConversation(conversation.id, trimmedTitle);
      setConversationItems((current) =>
        current.map((item) =>
          item.id === conversation.id ? { ...item, title: updatedConversation.title } : item,
        ),
      );
      cancelRenamingConversation();
      router.refresh();
    } catch (error) {
      console.error("Failed to rename conversation", error);
    } finally {
      setPendingConversationId(null);
    }
  }

  function handleRenameSubmit(event: FormEvent<HTMLFormElement>, conversation: ConversationSummary) {
    event.preventDefault();
    void submitConversationRename(conversation);
  }

  async function handleDeleteConversation(conversationId: string, wasActive: boolean) {
    clearScheduledNavigation();
    setPendingConversationId(conversationId);

    try {
      await deleteProjectConversation(conversationId);

      let remainingConversations: ConversationSummary[] = [];
      setConversationItems((current) => {
        remainingConversations = current.filter((item) => item.id !== conversationId);
        return remainingConversations;
      });

      if (editingConversationId === conversationId) {
        cancelRenamingConversation();
      }

      if (segment === "chat" && wasActive) {
        const nextConversation = remainingConversations[0];

        if (nextConversation) {
          router.push(`/project/${projectId}/chat?c=${nextConversation.id}`);
        } else {
          router.push(`/project/${projectId}/chat?new=1`);
        }

        return;
      }

      router.refresh();
    } catch (error) {
      console.error("Failed to delete conversation", error);
    } finally {
      setPendingConversationId(null);
    }
  }

  return (
    <aside className="flex min-h-0 w-72 shrink-0 flex-col gap-4 border-r border-border bg-sidebar p-4">
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="mb-1 flex items-center gap-2.5 px-2">
          <FolderOpen className="size-4 text-muted-foreground" />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-foreground">{projectName}</h2>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5">
          {projectLinks.map(({ key, label, icon: Icon }) => {
            const href = `/project/${projectId}/${key}`;
            const active = segment === key;
            return (
              <Link
                key={key}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex items-center justify-between px-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Chats
            </p>
            <button
              type="button"
              onClick={() => void startNewConversation()}
              disabled={isCreatingConversation}
              className={cn(
                "flex size-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                isCreatingConversation && "cursor-wait opacity-60",
              )}
              title={isCreatingConversation ? "Creating chat" : "New chat"}
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          <div className="flex min-h-0 flex-col gap-0.5 overflow-y-auto px-1 pr-1">
            {conversationItems.length === 0 ? (
              <button
                type="button"
                onClick={() => void startNewConversation()}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                  segment === "chat"
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  isCreatingConversation && "cursor-wait opacity-60",
                )}
                disabled={isCreatingConversation}
              >
                <MessageSquare className="size-3.5 shrink-0" />
                <span className="truncate">New chat</span>
              </button>
            ) : (
              conversationItems.map((c) => {
                const isActive =
                  segment === "chat" &&
                  (activeConversationId === c.id ||
                    (!activeConversationId && c.id === conversationItems[0]?.id));
                const isEditing = editingConversationId === c.id;
                const isPending = pendingConversationId === c.id;

                return (
                  <div
                    key={c.id}
                    className={cn("group/conversation relative", isPending && "opacity-70")}
                  >
                    {isEditing ? (
                      <form onSubmit={(event) => handleRenameSubmit(event, c)}>
                        <Input
                          autoFocus
                          value={draftTitle}
                          onChange={(event) => setDraftTitle(event.target.value)}
                          onBlur={() => {
                            if (isPending) return;
                            void submitConversationRename(c);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              event.preventDefault();
                              cancelRenamingConversation();
                            }
                          }}
                          disabled={isPending}
                          className={cn(
                            "h-9 rounded-lg border-border/70 bg-background/90 pr-10 text-sm shadow-none",
                            isActive && "border-accent-foreground/15 bg-accent",
                          )}
                        />
                      </form>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => scheduleConversationNavigation(c.id)}
                          disabled={isPending}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 pr-10 text-left text-sm transition-colors",
                            isActive
                              ? "bg-accent text-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground",
                          )}
                        >
                          <span
                            className="truncate"
                            title={c.title}
                            onDoubleClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              startRenamingConversation(c);
                            }}
                          >
                            {truncateConversationTitle(c.title)}
                          </span>
                        </button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              type="button"
                              onClick={(event) => event.stopPropagation()}
                              disabled={isPending}
                              className={cn(
                                "absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-background/90 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 group-hover/conversation:opacity-100",
                                isActive && "hover:bg-background",
                                isPending && "opacity-100",
                              )}
                              title="Delete chat"
                            >
                              {isPending ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="size-3.5" />
                              )}
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent size="sm">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete chat?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Remove <strong>{c.title}</strong> from your chat history? This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                disabled={isPending}
                                onClick={() => void handleDeleteConversation(c.id, isActive)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
