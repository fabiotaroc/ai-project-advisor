"use client";

import Link from "next/link";
import { useRouter, useSelectedLayoutSegment, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Activity,
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  FolderOpen,
  Library,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import { SearchCommand } from "@/components/search/search-command";
import {
  createProjectConversation,
  deleteProjectConversation,
  renameProjectConversation,
  triggerConversationMemory,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const primaryLinks = [
  { key: "files", label: "Wiki", icon: Library },
  { key: "sources", label: "Sources", icon: BookOpen },
  { key: "activity", label: "Activity", icon: Activity },
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

function getConversationInitial(title: string) {
  const trimmed = title.trim();
  if (!trimmed) return "?";
  return trimmed[0].toUpperCase();
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
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
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
      const outgoing = activeConversationId
        ? conversationItems.find((c) => c.id === activeConversationId)
        : conversationItems[0];

      if (outgoing) {
        triggerConversationMemory(projectId, outgoing.id);
      }

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

  function renderNavLink(
    { key, label, icon: Icon }: { key: string; label: string; icon: React.ComponentType<{ className?: string }> },
  ) {
    const href = `/project/${projectId}/${key}`;
    const active = segment === key;

    const linkContent = (
      <Link
        href={href}
        className={cn(
          "flex items-center rounded-md transition-colors",
          collapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-1.5",
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" />
        {!collapsed && <span className="text-sm">{label}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip key={key}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      );
    }

    return <div key={key}>{linkContent}</div>;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "sticky top-12 flex h-[calc(100vh-3rem)] shrink-0 flex-col self-start border-r border-border bg-sidebar transition-[width] duration-200",
          collapsed ? "w-14" : "w-72",
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 p-2">
          {/* Project header + collapse; shared min-height keeps Search/nav aligned when toggling */}
          <div
            className={cn(
              "flex shrink-0 py-1",
              collapsed
                ? "min-h-[4.75rem] flex-col items-center justify-center gap-1"
                : "min-h-[4.75rem] flex-row items-center justify-between gap-2 px-2",
            )}
          >
            {collapsed ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={`/project/${projectId}/settings`}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-md transition-colors",
                        segment === "settings"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <Settings className="size-4" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{projectName} — Settings</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setCollapsed(false)}
                      className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <ChevronsRight className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Expand sidebar</TooltipContent>
                </Tooltip>
              </>
            ) : (
              <>
                <Link
                  href={`/project/${projectId}/settings`}
                  className={cn(
                    "group/project flex min-w-0 items-center gap-2.5 rounded-md px-1 py-0.5 transition-colors hover:bg-accent",
                    segment === "settings" && "bg-accent",
                  )}
                >
                  <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
                  <h2 className="truncate text-sm font-semibold text-foreground">{projectName}</h2>
                  <Settings className="size-3 shrink-0 text-muted-foreground/0 transition-colors group-hover/project:text-muted-foreground" />
                </Link>
                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <ChevronsLeft className="size-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Search trigger */}
          {collapsed ? (
            <div className="flex min-h-10 items-center justify-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Search className="size-4 shrink-0" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Search &middot; ⌘K</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className={cn(
                "flex min-h-10 items-center gap-2.5 rounded-md border border-border bg-background/50 px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              )}
            >
              <Search className="size-4 shrink-0" />
              <span className="flex-1 text-left">Search</span>
              <kbd className="pointer-events-none flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>
          )}

          {/* Primary nav links */}
          <nav className="flex flex-col gap-0.5">
            {primaryLinks.map((link) => renderNavLink(link))}
          </nav>

          {/* Chats section */}
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            {collapsed ? (
              <>
                {/* Collapsed: new-chat button + initial badges */}
                <div className="flex flex-col items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => void startNewConversation()}
                        disabled={isCreatingConversation}
                        className={cn(
                          "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                          isCreatingConversation && "cursor-wait opacity-60",
                        )}
                      >
                        <Plus className="size-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">New chat</TooltipContent>
                  </Tooltip>
                </div>

                <div className="flex min-h-0 flex-col items-center gap-1 overflow-y-auto">
                  {conversationItems.length === 0 ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => void startNewConversation()}
                          disabled={isCreatingConversation}
                          className={cn(
                            "flex size-8 items-center justify-center rounded-md text-xs font-medium transition-colors",
                            segment === "chat"
                              ? "bg-accent text-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground",
                            isCreatingConversation && "cursor-wait opacity-60",
                          )}
                        >
                          <MessageSquare className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">New chat</TooltipContent>
                    </Tooltip>
                  ) : (
                    conversationItems.map((c) => {
                      const isActive =
                        segment === "chat" &&
                        (activeConversationId === c.id ||
                          (!activeConversationId && c.id === conversationItems[0]?.id));

                      return (
                        <Tooltip key={c.id}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => scheduleConversationNavigation(c.id)}
                              className={cn(
                                "flex size-8 items-center justify-center rounded-md text-xs font-semibold transition-colors",
                                isActive
                                  ? "bg-accent text-foreground"
                                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                              )}
                            >
                              {getConversationInitial(c.title)}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right">{c.title}</TooltipContent>
                        </Tooltip>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Expanded: full chat list */}
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
              </>
            )}
          </div>
        </div>

      </aside>

      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
    </TooltipProvider>
  );
}
