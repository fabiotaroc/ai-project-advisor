import Link from "next/link";
import { FolderOpen, MessageSquare, Search, Activity, Files, BookOpen } from "lucide-react";

const links = [
  { key: "chat", label: "Chat", icon: MessageSquare },
  { key: "files", label: "Files", icon: Files },
  { key: "sources", label: "Sources", icon: BookOpen },
  { key: "search", label: "Search", icon: Search },
  { key: "activity", label: "Activity", icon: Activity },
];

export function ProjectSidebar({ workspaceId, projectId, projectName, current }: { workspaceId: string; projectId: string; projectName: string; current: string }) {
  return (
    <aside className="w-72 shrink-0 border-r border-[var(--line)] bg-[color:color-mix(in_oklab,var(--paper)_82%,white)] p-5">
      <div className="mb-7 rounded-xl border border-[var(--line)] bg-white/65 p-4 shadow-sm">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--ink-soft)]">Project</p>
        <div className="mt-2 flex items-start gap-3">
          <FolderOpen className="mt-0.5 size-5 text-[var(--accent)]" />
          <div>
            <h2 className="display text-xl leading-tight">{projectName}</h2>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">Workspace memory + source intelligence</p>
          </div>
        </div>
      </div>

      <nav className="space-y-1">
        {links.map(({ key, label, icon: Icon }) => {
          const href = `/workspace/${workspaceId}/project/${projectId}/${key}`;
          const active = current === key;
          return (
            <Link key={key} href={href} className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-[var(--ink)] text-[var(--paper)] shadow" : "text-[var(--ink)] hover:bg-white/70 hover:shadow-sm"}`}>
              <Icon className={`size-4 ${active ? "text-[var(--accent-2)]" : "text-[var(--ink-soft)]"}`} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
