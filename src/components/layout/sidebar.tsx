"use client";

import Link from "next/link";
import { useSelectedLayoutSegment, useSearchParams } from "next/navigation";
import {
  Activity,
  BookOpen,
  BookText,
  FolderOpen,
  LayoutDashboard,
  Library,
  MessageSquare,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectRole } from "@/lib/types";

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

export function ProjectSidebar({
  projectId,
  projectName,
  projectRole,
  conversations = [],
}: {
  projectId: string;
  projectName: string;
  projectRole: ProjectRole;
  conversations?: ConversationSummary[];
}) {
  const segment = useSelectedLayoutSegment() ?? "chat";
  const searchParams = useSearchParams();
  const activeConversationId = searchParams.get("c");

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
            <Link
              href={`/project/${projectId}/chat?new`}
              className="flex size-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="New chat"
            >
              <Plus className="size-3.5" />
            </Link>
          </div>

          <div className="flex min-h-0 flex-col gap-0.5 overflow-y-auto px-1 pr-1">
            {conversations.length === 0 ? (
              <Link
                href={`/project/${projectId}/chat?new`}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  segment === "chat"
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <MessageSquare className="size-3.5 shrink-0" />
                <span className="truncate">New chat</span>
              </Link>
            ) : (
              conversations.map((c) => {
                const isActive =
                  segment === "chat" &&
                  (activeConversationId === c.id ||
                    (!activeConversationId && c.id === conversations[0]?.id));

                return (
                  <Link
                    key={c.id}
                    href={`/project/${projectId}/chat?c=${c.id}`}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <MessageSquare className="size-3.5 shrink-0" />
                    <span className="truncate">
                      {c.title.length > 36 ? c.title.slice(0, 33) + "..." : c.title}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
