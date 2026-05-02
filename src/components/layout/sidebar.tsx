"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSelectedLayoutSegment, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Activity,
  BookOpen,
  ChevronRight,
  ChevronsUpDown,
  House,
  Library,
  Loader2,
  Mail,
  MessageSquare,
  PanelLeft,
  Plus,
  Search,
  Settings,
  Trash2,
  Users,
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
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { formatChatListTime } from "@/lib/date-format";
import type { ProjectConversationListItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const primaryLinks = [
  { key: "files", label: "Wiki", icon: Library },
  { key: "sources", label: "Files", icon: BookOpen },
  { key: "meetings", label: "Meetings", icon: Users },
  { key: "emails", label: "Emails", icon: Mail },
  { key: "activity", label: "Activity", icon: Activity },
] as const;

type ConversationSummary = ProjectConversationListItem;

const CONVERSATION_NAVIGATION_DELAY_MS = 180;

function truncateConversationTitle(title: string) {
  return title.length > 36 ? `${title.slice(0, 33)}...` : title;
}

function getConversationInitial(title: string) {
  const trimmed = title.trim();
  if (!trimmed) return "?";
  return trimmed[0].toUpperCase();
}

function getAccountInitial({
  firstName,
  lastName,
  email,
}: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}) {
  const candidates = [firstName, lastName]
    .map((value) => value?.trim() ?? "")
    .filter((value) => value.length > 0);
  if (candidates.length > 0) {
    return candidates
      .slice(0, 2)
      .map((value) => value[0]?.toUpperCase() ?? "")
      .join("");
  }
  const trimmedEmail = email?.trim();
  if (!trimmedEmail) return "?";
  return trimmedEmail[0].toUpperCase();
}

function getAccountDisplayName({
  firstName,
  lastName,
}: {
  firstName: string | null;
  lastName: string | null;
}) {
  const combined = [firstName, lastName]
    .map((value) => value?.trim() ?? "")
    .filter((value) => value.length > 0)
    .join(" ");
  return combined.length > 0 ? combined : "Account";
}

export function ProjectSidebar({
  projectId,
  projectName,
  userEmail,
  userFirstName = null,
  userLastName = null,
  userAvatarUrl = null,
  conversations = [],
}: {
  projectId: string;
  projectName: string;
  userEmail: string | null;
  userFirstName?: string | null;
  userLastName?: string | null;
  userAvatarUrl?: string | null;
  conversations?: ConversationSummary[];
}) {
  const router = useRouter();
  const segment = useSelectedLayoutSegment() ?? "chat";
  const searchParams = useSearchParams();
  const activeConversationId = searchParams.get("c");
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [conversationItems, setConversationItems] = useState(conversations);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [pendingConversationId, setPendingConversationId] = useState<string | null>(null);
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

  return (
    <>
      <Sidebar
        collapsible="icon"
        className={cn(
          segment !== "chat" && "group-data-[side=left]/sidebar-wrapper:border-r",
        )}
      >
        <SidebarHeader className="gap-3">
          <div
            className={cn(
              "flex gap-1",
              collapsed
                ? "w-full flex-col items-start"
                : "items-center justify-between",
            )}
          >
            {collapsed ? (
              <button
                type="button"
                onClick={toggleSidebar}
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                title="Expand sidebar"
              >
                <PanelLeft className="size-4" />
                <span className="sr-only">Expand sidebar</span>
              </button>
            ) : (
              <>
                <SidebarMenuButton
                  asChild
                  tooltip="Morgan — home"
                  className="min-w-0 flex-1 font-semibold hover:bg-transparent hover:text-sidebar-foreground data-active:bg-transparent data-active:text-sidebar-foreground"
                >
                  <Link href="/app">
                    <House />
                    <span className="truncate group-data-[collapsible=icon]:hidden">Morgan</span>
                  </Link>
                </SidebarMenuButton>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  title="Collapse sidebar"
                >
                  <PanelLeft className="size-3.5" />
                  <span className="sr-only">Collapse sidebar</span>
                </button>
              </>
            )}
          </div>

          <SidebarMenuButton
            tooltip="Search ⌘K"
            onClick={() => setSearchOpen(true)}
            className="border border-border bg-background/50 text-muted-foreground hover:text-foreground"
          >
            <Search />
            <span className="flex-1 text-left group-data-[collapsible=icon]:hidden">
              Search
            </span>
            <kbd className="pointer-events-none flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground group-data-[collapsible=icon]:hidden">
              <span className="text-xs">⌘</span>K
            </kbd>
          </SidebarMenuButton>
        </SidebarHeader>

        <SidebarContent className="gap-3 overflow-hidden">
          <SidebarGroup>
            <SidebarMenu className="gap-2">
              {primaryLinks.map(({ key, label, icon: Icon }) => (
                <SidebarMenuItem key={key}>
                  <SidebarMenuButton
                    asChild
                    isActive={segment === key}
                    tooltip={label}
                    className={cn(
                      segment === key &&
                        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground data-active:bg-primary data-active:text-primary-foreground",
                    )}
                  >
                    <Link href={`/project/${projectId}/${key}`}>
                      <Icon />
                      <span className="group-data-[collapsible=icon]:hidden">
                        {label}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup className="min-h-0 flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel className="text-[11px] uppercase tracking-[0.22em]">Chats</SidebarGroupLabel>
            <SidebarGroupAction
              onClick={() => void startNewConversation()}
              disabled={isCreatingConversation}
              title={isCreatingConversation ? "Creating chat" : "New chat"}
              className={cn(isCreatingConversation && "cursor-wait opacity-60")}
            >
              <Plus />
              <span className="sr-only">New chat</span>
            </SidebarGroupAction>
            <SidebarMenu className="min-h-0 flex-1 gap-2 overflow-y-auto">
              {conversationItems.length === 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={segment === "chat"}
                    onClick={() => void startNewConversation()}
                    disabled={isCreatingConversation}
                    tooltip="New chat"
                    className={cn(isCreatingConversation && "cursor-wait opacity-60")}
                  >
                    <MessageSquare />
                    <span className="group-data-[collapsible=icon]:hidden">
                      New chat
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                conversationItems.map((c) => {
                  const isActive =
                    segment === "chat" &&
                    (activeConversationId === c.id ||
                      (!activeConversationId && c.id === conversationItems[0]?.id));
                  const isEditing = editingConversationId === c.id;
                  const isPending = pendingConversationId === c.id;

                  if (isEditing && !collapsed) {
                    return (
                      <SidebarMenuItem key={c.id}>
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
                              "h-9 rounded-md border-border/70 bg-background/90 text-sm shadow-none",
                              isActive && "border-accent-foreground/15 bg-sidebar-accent",
                            )}
                          />
                        </form>
                      </SidebarMenuItem>
                    );
                  }

                  return (
                    <SidebarMenuItem key={c.id} className={cn(isPending && "opacity-70")}>
                      <SidebarMenuButton
                        size="lg"
                        isActive={isActive}
                        disabled={isPending}
                        onClick={() => scheduleConversationNavigation(c.id)}
                        tooltip={{
                          children: (
                            <>
                              <span className="block font-medium">{c.title}</span>
                              <span className="text-muted-foreground">
                                {formatChatListTime(c.last_activity_at ?? c.created_at)}
                              </span>
                            </>
                          ),
                        }}
                        className="group-data-[collapsible=icon]:!h-8"
                      >
                        <span className="hidden size-4 shrink-0 items-center justify-center text-xs font-semibold group-data-[collapsible=icon]:flex">
                          {getConversationInitial(c.title)}
                        </span>
                        <div
                          className="flex min-w-0 flex-1 flex-col items-start gap-0.5 overflow-hidden group-data-[collapsible=icon]:hidden"
                          onDoubleClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            startRenamingConversation(c);
                          }}
                        >
                          <span className="w-full truncate text-sm" title={c.title}>
                            {truncateConversationTitle(c.title)}
                          </span>
                          <span
                            className={cn(
                              "font-mono text-[11px] leading-none tabular-nums",
                              isActive ? "text-foreground/60" : "text-muted-foreground",
                            )}
                            title={c.last_activity_at ?? c.created_at}
                          >
                            {formatChatListTime(c.last_activity_at ?? c.created_at)}
                          </span>
                        </div>
                      </SidebarMenuButton>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <SidebarMenuAction
                            showOnHover
                            disabled={isPending}
                            title="Delete chat"
                            className={cn(
                              "hover:text-destructive",
                              isPending && "opacity-100",
                            )}
                            onClick={(event) => event.stopPropagation()}
                          >
                            {isPending ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <Trash2 />
                            )}
                            <span className="sr-only">Delete chat</span>
                          </SidebarMenuAction>
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
                    </SidebarMenuItem>
                  );
                })
              )}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="mt-auto border-t border-sidebar-border p-0">
          <SidebarMenu className="gap-1 p-2">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={segment === "settings"}
                tooltip="Project settings"
                size="lg"
                className={cn(
                  "h-14 rounded-md px-1.5 py-2 hover:bg-sidebar-accent group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:rounded-md group-data-[collapsible=icon]:p-2",
                  segment === "settings" &&
                    "bg-sidebar-accent text-sidebar-accent-foreground",
                )}
              >
                <Link href={`/project/${projectId}/settings`}>
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-foreground text-sidebar group-data-[collapsible=icon]:size-4 group-data-[collapsible=icon]:rounded-none group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:text-sidebar-foreground">
                    <Settings className="size-3.5" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 pl-1 text-left group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-sm font-medium leading-none text-sidebar-foreground">
                      {projectName}
                    </span>
                    <span className="text-[12px] leading-none text-muted-foreground">
                      Project settings
                    </span>
                  </span>
                  <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Account settings"
                size="lg"
                className="h-11 rounded-md px-1.5 py-2 hover:bg-sidebar-accent group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-2"
              >
                <Link href="/account">
                  <span className="relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-sidebar-border bg-background font-mono text-xs font-medium text-sidebar-foreground group-data-[collapsible=icon]:size-4 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent">
                    {userAvatarUrl ? (
                      <Image
                        src={userAvatarUrl}
                        alt=""
                        fill
                        sizes="28px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      getAccountInitial({
                        firstName: userFirstName,
                        lastName: userLastName,
                        email: userEmail,
                      })
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 pl-1 text-left group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-sm font-medium leading-none text-sidebar-foreground">
                      {getAccountDisplayName({
                        firstName: userFirstName,
                        lastName: userLastName,
                      })}
                    </span>
                    <span className="truncate text-[12px] leading-none text-muted-foreground">
                      {userEmail ?? "Signed in"}
                    </span>
                  </span>
                  <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
