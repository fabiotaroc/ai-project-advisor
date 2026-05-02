"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, FileText, Lightbulb, Upload } from "lucide-react";
import type {
  ActivityEvent,
  LibrarianAction,
  LibrarianRun,
  LibrarianSuggestion,
  ProjectActivity,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatChatListTime, formatDateTime } from "@/lib/date-format";
import { cn } from "@/lib/utils";
import {
  ACTION_ICONS,
  STATUS_COPY,
  TRIGGER_META,
  TriggerGlyph,
  eventMeta,
  parseRunSummary,
  subjectLabel,
} from "@/components/activity/activity-shared";

type TimelineItem =
  | {
      kind: "librarian";
      id: string;
      timestamp: string;
      run: LibrarianRun;
    }
  | {
      kind: "event";
      id: string;
      timestamp: string;
      event: ActivityEvent;
    };

export function ActivityPanel({
  activity,
  projectId,
}: {
  activity: ProjectActivity;
  projectId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const runParam = searchParams.get("run");
  const eventParam = searchParams.get("event");

  const relatedEventsByRun = groupLibrarianEvents(activity.events);
  const genericEvents = activity.events.filter((event) => !isGroupedLibrarianEvent(event));

  const timelineItems = useMemo<TimelineItem[]>(() => {
    const generic = activity.events.filter((event) => !isGroupedLibrarianEvent(event));
    return [
      ...activity.librarianRuns.map((run) => ({
        kind: "librarian" as const,
        id: run.id,
        timestamp: run.finished_at ?? run.started_at,
        run,
      })),
      ...generic.map((event) => ({
        kind: "event" as const,
        id: event.id,
        timestamp: event.created_at,
        event,
      })),
    ].sort(
      (left, right) =>
        new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
    );
  }, [activity.librarianRuns, activity.events]);

  const groups = useMemo(() => groupByDay(timelineItems), [timelineItems]);

  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);
  const [dayExpanded, setDayExpanded] = useState<Record<string, boolean>>({});
  const rowRefs = useRef(new Map<string, HTMLElement>());

  const registerRow = useCallback((key: string, element: HTMLElement | null) => {
    if (element) {
      rowRefs.current.set(key, element);
    } else {
      rowRefs.current.delete(key);
    }
  }, []);

  const clearActivityParams = useCallback(() => {
    if (!runParam && !eventParam) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("run");
    next.delete("event");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [eventParam, pathname, router, runParam, searchParams]);

  useEffect(() => {
    if (!runParam && !eventParam) return;

    let key: string | null = null;
    if (runParam && activity.librarianRuns.some((run) => run.id === runParam)) {
      key = `librarian-${runParam}`;
    } else if (eventParam) {
      const event = activity.events.find((candidate) => candidate.id === eventParam);
      if (event) {
        if (isGroupedLibrarianEvent(event)) {
          const runId = runIdForEvent(event);
          if (runId && activity.librarianRuns.some((run) => run.id === runId)) {
            key = `librarian-${runId}`;
          }
        } else {
          key = `event-${eventParam}`;
        }
      }
    }

    if (key) {
      setHighlightedKey(key);
      const dayKey = findGroupKeyForRow(groups, key);
      if (dayKey) {
        setDayExpanded((prev) => ({ ...prev, [dayKey]: true }));
      }
      const scrollToTarget = () => {
        const target = rowRefs.current.get(key);
        if (target) {
          if (target instanceof HTMLDetailsElement) target.open = true;
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      };
      requestAnimationFrame(() => {
        requestAnimationFrame(scrollToTarget);
      });
    }

    clearActivityParams();
  }, [activity.events, activity.librarianRuns, clearActivityParams, eventParam, runParam, groups]);

  const handleRowClick = useCallback((key: string) => {
    setHighlightedKey((current) => (current === key ? current : null));
  }, []);

  const collapseAllDays = useCallback(() => {
    setDayExpanded((prev) => {
      const next = { ...prev };
      for (const group of groups) {
        next[group.key] = false;
      }
      return next;
    });
  }, [groups]);

  const expandAllDays = useCallback(() => {
    setDayExpanded((prev) => {
      const next = { ...prev };
      for (const group of groups) {
        next[group.key] = true;
      }
      return next;
    });
  }, [groups]);

  const allDaysCollapsed = useMemo(
    () => groups.length > 0 && groups.every((group) => dayExpanded[group.key] === false),
    [groups, dayExpanded],
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10 sm:px-10">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="text-3xl font-medium tracking-[-0.02em]">Activity</h1>
          {timelineItems.length > 0 && groups.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="-my-0.5 h-6 px-2 text-[11px] font-normal text-muted-foreground hover:text-foreground"
              onClick={allDaysCollapsed ? expandAllDays : collapseAllDays}
              aria-label={allDaysCollapsed ? "Expand all days" : "Collapse all days"}
            >
              {allDaysCollapsed ? "Expand all" : "Collapse all"}
            </Button>
          ) : null}
        </div>
        <p className="text-[15px] text-muted-foreground">
          What changed in this project — drafts Morgan proposed, sources you added, files
          Morgan edited.
        </p>
      </header>

      {timelineItems.length > 0 ? (
        <Card className="overflow-hidden rounded-xl border-border bg-card p-0 shadow-none">
          <ol className="divide-y divide-border">
            {groups.map((group) => (
              <li key={group.key}>
                <details
                  className="group/day"
                  open={dayExpanded[group.key] !== false}
                  onToggle={(event) => {
                    const details = event.currentTarget;
                    setDayExpanded((prev) => {
                      const nextOpen =
                        details != null
                          ? details.open
                          : !(prev[group.key] !== false);
                      return { ...prev, [group.key]: nextOpen };
                    });
                  }}
                >
                  <summary
                    className={cn(
                      "flex cursor-pointer list-none items-baseline justify-between border-b border-border bg-muted/30 px-5 py-2",
                      "[&::-webkit-details-marker]:hidden",
                    )}
                  >
                    <span className="flex items-baseline gap-2">
                      <ChevronRight
                        className="size-3.5 shrink-0 translate-y-[1px] text-muted-foreground transition-transform group-open/day:rotate-90"
                        strokeWidth={1.75}
                      />
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
                        {group.label}
                      </span>
                    </span>
                    <span className="font-mono text-[10.5px] text-muted-foreground/70">
                      {group.items.length} update{group.items.length === 1 ? "" : "s"}
                    </span>
                  </summary>
                  <ol className="divide-y divide-border">
                    {group.items.map((item) => {
                      const rowKey = `${item.kind}-${item.id}`;
                      const isHighlighted = highlightedKey === rowKey;
                      return (
                        <li key={rowKey}>
                          {item.kind === "librarian" ? (
                            <LibrarianRow
                              run={item.run}
                              relatedEvents={relatedEventsByRun.get(item.run.id) ?? []}
                              projectId={projectId}
                              rowKey={rowKey}
                              highlighted={isHighlighted}
                              onRegister={registerRow}
                              onClick={handleRowClick}
                            />
                          ) : (
                            <EventRow
                              event={item.event}
                              projectId={projectId}
                              rowKey={rowKey}
                              highlighted={isHighlighted}
                              onRegister={registerRow}
                              onClick={handleRowClick}
                            />
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </details>
              </li>
            ))}
          </ol>
        </Card>
      ) : (
        <Card className="rounded-xl border-dashed bg-card/60 p-10 text-center text-sm text-muted-foreground">
          Nothing has happened yet. Once Morgan reads a source or finishes a chat, you&apos;ll
          see updates here.
        </Card>
      )}
    </div>
  );
}

type RowHighlightProps = {
  rowKey: string;
  highlighted: boolean;
  onRegister: (key: string, element: HTMLElement | null) => void;
  onClick: (key: string) => void;
};

function LibrarianRow({
  run,
  relatedEvents,
  projectId,
  rowKey,
  highlighted,
  onRegister,
  onClick,
}: {
  run: LibrarianRun;
  relatedEvents: ActivityEvent[];
  projectId: string;
} & RowHighlightProps) {
  const status = STATUS_COPY[run.status];
  const trigger = TRIGGER_META[run.trigger_type];
  const parsed = parseRunSummary(run.summary);
  const subject = subjectLabel(parsed.subject);
  const summary = parsed.body ?? run.error ?? null;
  const headline = (
    <>
      <span className="font-medium text-foreground">{trigger.label}</span>
      {subject ? (
        <>
          <span className="mx-1.5 text-muted-foreground">·</span>
          <span className="text-muted-foreground">{subject}</span>
        </>
      ) : null}
    </>
  );
  const actions = run.actions.slice(0, 8);
  const hiddenActionCount = Math.max(run.actions.length - actions.length, 0);
  const suggestions = suggestionsForRun(run, relatedEvents).slice(0, 3);
  const files = filesForRun(run);
  const totalActions = runActionCount(run);
  const totalFiles = files.length;
  const totalSuggestions = Math.max(run.suggestion_count, suggestions.length);
  const hasDetail = actions.length > 0 || suggestions.length > 0 || (files.length > 0 && actions.length === 0) || Boolean(summary);
  const proposalLabel = run.mode === "proposal" ? "Proposal" : null;
  const subjectHref = subjectHrefFor(run, projectId);

  const metaLine = [
    durationLabel(run),
    totalActions ? `${totalActions} change${totalActions === 1 ? "" : "s"}` : null,
    totalFiles ? `${totalFiles} file${totalFiles === 1 ? "" : "s"}` : null,
    totalSuggestions ? `${totalSuggestions} suggestion${totalSuggestions === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Row
      rowKey={rowKey}
      highlighted={highlighted}
      onRegister={onRegister}
      onClick={onClick}
      timestamp={run.finished_at ?? run.started_at}
      glyph={<TriggerGlyph Icon={trigger.Icon} status={run.status} />}
      glyphTone="ai"
      headline={
        subjectHref ? (
          <Link href={subjectHref} className="hover:underline underline-offset-2">
            {headline}
          </Link>
        ) : (
          headline
        )
      }
      sub={metaLine || null}
      pill={
        <div className="flex items-center gap-1.5">
          {proposalLabel ? (
            <Badge variant="secondary" className="rounded-md px-1.5 py-0 text-[10.5px] font-medium uppercase tracking-[0.08em]">
              {proposalLabel}
            </Badge>
          ) : null}
          <Badge variant={status.variant} className="rounded-md px-1.5 py-0 text-[10.5px] font-medium uppercase tracking-[0.08em]">
            {status.label}
          </Badge>
        </div>
      }
      details={
        hasDetail ? (
          <RunDetails
            summary={summary}
            actions={actions}
            hiddenActionCount={hiddenActionCount}
            files={files}
            suggestions={suggestions}
          />
        ) : null
      }
    />
  );
}

function EventRow({
  event,
  projectId,
  rowKey,
  highlighted,
  onRegister,
  onClick,
}: { event: ActivityEvent; projectId: string } & RowHighlightProps) {
  const meta = eventMeta(event);
  const href = eventHrefFor(event, projectId);

  return (
    <Row
      rowKey={rowKey}
      highlighted={highlighted}
      onRegister={onRegister}
      onClick={onClick}
      timestamp={event.created_at}
      glyph={
        <span className="grid h-full w-full place-items-center text-muted-foreground">
          <meta.Icon className="size-3.5" strokeWidth={1.75} />
        </span>
      }
      glyphTone="quiet"
      headline={
        href ? (
          <Link href={href} className="hover:underline underline-offset-2">
            {meta.label}
          </Link>
        ) : (
          meta.label
        )
      }
      sub={event.summary || null}
      pill={null}
      details={null}
    />
  );
}

function Row({
  rowKey,
  highlighted,
  onRegister,
  onClick,
  timestamp,
  glyph,
  glyphTone,
  headline,
  sub,
  pill,
  details,
}: {
  timestamp: string;
  glyph: React.ReactNode;
  glyphTone: "ai" | "quiet";
  headline: React.ReactNode;
  sub: React.ReactNode;
  pill: React.ReactNode;
  details: React.ReactNode;
} & RowHighlightProps) {
  return (
    <details
      ref={(node) => onRegister(rowKey, node)}
      className={cn(
        "group/row relative block transition-colors",
        highlighted && "bg-cite-bg/50 ring-1 ring-inset ring-accent-line/60",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-0.5 transition-colors",
          highlighted ? "bg-ring" : "bg-transparent",
        )}
      />
      <summary
        onClick={() => onClick(rowKey)}
        className={cn(
          "flex cursor-pointer list-none items-start gap-3 px-5 py-3.5 transition-colors",
          "hover:bg-muted/30",
          "[&::-webkit-details-marker]:hidden",
          details ? "" : "cursor-default",
        )}
      >
        <span
          className="mt-[3px] w-[78px] shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground"
          title={formatDateTime(timestamp)}
        >
          {formatChatListTime(timestamp)}
        </span>
        <span
          className={cn(
            "mt-[1px] grid size-[22px] shrink-0 place-items-center rounded-md border text-[11px]",
            glyphTone === "ai"
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-muted/50",
          )}
        >
          {glyph}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 text-[13.5px] leading-[1.45] text-foreground">{headline}</p>
            {pill}
            {details ? (
              <ChevronRight
                className="mt-[3px] size-3.5 shrink-0 text-muted-foreground transition-transform group-open/row:rotate-90"
                strokeWidth={1.75}
              />
            ) : null}
          </div>
          {sub ? (
            <p className="mt-1 line-clamp-2 text-[12px] leading-[1.45] text-muted-foreground">{sub}</p>
          ) : null}
        </div>
      </summary>
      {details ? <div className="px-5 pb-5 pl-[112px]">{details}</div> : null}
    </details>
  );
}

function RunDetails({
  summary,
  actions,
  hiddenActionCount,
  files,
  suggestions,
}: {
  summary: string | null;
  actions: LibrarianAction[];
  hiddenActionCount: number;
  files: string[];
  suggestions: LibrarianSuggestion[];
}) {
  return (
    <div className="flex flex-col gap-3 pt-1">
      {summary ? (
        <p className="text-[13px] leading-[1.55] text-foreground/85">{summary}</p>
      ) : null}

      {actions.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {actions.map((action, index) => (
            <ActionLine key={`${action.action}-${action.path}-${index}`} action={action} />
          ))}
          {hiddenActionCount > 0 ? (
            <li className="font-mono text-[11px] text-muted-foreground/80">
              + {hiddenActionCount} more change{hiddenActionCount === 1 ? "" : "s"}
            </li>
          ) : null}
        </ul>
      ) : files.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {files.map((file) => (
            <span
              key={file}
              className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
            >
              {file}
            </span>
          ))}
        </div>
      ) : null}

      {suggestions.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {suggestions.map((suggestion, index) => (
            <li
              key={`${suggestion.kind}-${suggestion.title}-${index}`}
              className="flex items-start gap-2 rounded-md border border-warning-line bg-warning-soft/60 px-2.5 py-1.5 text-[12.5px] text-warning"
            >
              <Lightbulb className="mt-[3px] size-3.5 shrink-0" strokeWidth={1.75} />
              <div className="min-w-0">
                <span className="font-medium">{suggestion.title}</span>
                {suggestion.rationale ? (
                  <span className="ml-1 text-warning/80">— {suggestion.rationale}</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ActionLine({ action }: { action: LibrarianAction }) {
  const Icon = ACTION_ICONS[action.action];
  const reason = typeof action.details?.reason === "string" ? action.details.reason : null;
  const proposed = action.details?.proposed === true;

  return (
    <li className="flex min-w-0 items-baseline gap-2 font-mono text-[11.5px]">
      <Icon className="size-3 shrink-0 translate-y-[1.5px] text-muted-foreground" strokeWidth={1.75} />
      <span className="text-muted-foreground">
        {proposed ? "proposed " : ""}
        {actionVerb(action.action)}
      </span>
      <span className="truncate text-foreground">{action.path}</span>
      {reason ? <span className="hidden truncate text-muted-foreground/80 sm:inline">— {reason}</span> : null}
    </li>
  );
}

function findGroupKeyForRow(groups: { key: string; items: TimelineItem[] }[], rowKey: string) {
  for (const group of groups) {
    for (const item of group.items) {
      if (`${item.kind}-${item.id}` === rowKey) return group.key;
    }
  }
  return null;
}

function groupByDay(items: TimelineItem[]) {
  const buckets = new Map<string, { key: string; label: string; items: TimelineItem[] }>();
  const now = new Date();

  for (const item of items) {
    const date = new Date(item.timestamp);
    if (Number.isNaN(date.getTime())) continue;

    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const label = dayLabel(date, now);
    const bucket = buckets.get(key) ?? { key, label, items: [] };
    bucket.items.push(item);
    buckets.set(key, bucket);
  }

  return [...buckets.values()];
}

function dayLabel(date: Date, now: Date) {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.floor(
    (startOfDay(now).getTime() - startOfDay(date).getTime()) / 86400000,
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (date.getFullYear() === now.getFullYear()) {
    return `${months[date.getMonth()]} ${date.getDate()}`;
  }
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function subjectHrefFor(run: LibrarianRun, projectId: string): string | null {
  if (run.trigger_type === "conversation_ended" && run.trigger_ref) {
    return `/project/${projectId}/chat?c=${run.trigger_ref}`;
  }
  if (run.trigger_type === "source_ingested") {
    return `/project/${projectId}/sources`;
  }
  if (run.trigger_type === "wiki_lint") {
    return `/project/${projectId}/files`;
  }
  return null;
}

function eventHrefFor(event: ActivityEvent, projectId: string): string | null {
  if (event.event_type === "source_ingested") {
    return `/project/${projectId}/sources`;
  }
  if (
    event.event_type === "agent_file_edit" ||
    event.event_type === "agent_file_rename" ||
    event.event_type === "agent_file_delete" ||
    event.event_type === "file_edited"
  ) {
    return `/project/${projectId}/files`;
  }
  if (event.event_type === "advisor_suggestion") {
    return event.target_id
      ? `/project/${projectId}/chat?c=${event.target_id}`
      : `/project/${projectId}/chat`;
  }
  return null;
}

function groupLibrarianEvents(events: ActivityEvent[]) {
  const grouped = new Map<string, ActivityEvent[]>();

  for (const event of events) {
    const runId = runIdForEvent(event);
    if (!runId) continue;

    const current = grouped.get(runId) ?? [];
    current.push(event);
    grouped.set(runId, current);
  }

  return grouped;
}

function runIdForEvent(event: ActivityEvent) {
  if (event.target_type === "librarian_run" && event.target_id) return event.target_id;
  return typeof event.metadata.run_id === "string" ? event.metadata.run_id : null;
}

function isGroupedLibrarianEvent(event: ActivityEvent) {
  return event.event_type.startsWith("librarian_");
}

function durationLabel(run: LibrarianRun) {
  if (!run.finished_at) return "in progress";

  const started = new Date(run.started_at).getTime();
  const finished = new Date(run.finished_at).getTime();
  if (!Number.isFinite(started) || !Number.isFinite(finished) || finished < started) {
    return "";
  }

  const seconds = Math.max(1, Math.round((finished - started) / 1000));
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function runActionCount(run: LibrarianRun) {
  if (run.action_count > 0) return run.action_count;
  if (run.actions.length > 0) return run.actions.length;

  const parsed = parseRunSummary(run.summary);
  if (!parsed.counts) return 0;

  const matches = parsed.counts.matchAll(/(\d+)\s+(?:create|edit|rename|delete)s?/g);
  return [...matches].reduce((total, match) => total + Number(match[1]), 0);
}

function filesForRun(run: LibrarianRun) {
  const files = new Set(run.files_touched);

  for (const action of run.actions) {
    files.add(action.path);
    const from = action.details?.from;
    if (typeof from === "string") files.add(from);
  }

  if (files.size === 0 && run.summary) {
    for (const file of filesFromSummary(run.summary)) {
      files.add(file);
    }
  }

  return [...files].sort((left, right) => left.localeCompare(right));
}

function filesFromSummary(summary: string) {
  const files = new Set<string>();

  for (const match of summary.matchAll(/\[[^\]\n]+\]\(([^)\n]+)\)/g)) {
    addFilePath(files, match[1]);
  }

  for (const match of summary.matchAll(/`([^`\n]+)`/g)) {
    addFilePath(files, match[1]);
  }

  for (const match of summary.matchAll(/\b(?:[\w.-]+\/)*[\w.-]+\.(?:md|txt|pdf|docx?)\b/g)) {
    addFilePath(files, match[0]);
  }

  return files;
}

function addFilePath(files: Set<string>, value: string | undefined) {
  if (!value) return;

  const trimmed = value.trim();
  if (!/\.(?:md|txt|pdf|docx?)$/i.test(trimmed)) return;
  files.add(trimmed);
}

function suggestionsForRun(run: LibrarianRun, relatedEvents: ActivityEvent[]) {
  if (run.suggestions.length > 0) return run.suggestions;

  return relatedEvents
    .filter((event) => event.event_type === "librarian_suggestion")
    .map((event) => ({
      kind: suggestionKind(event.metadata.kind),
      title:
        typeof event.metadata.title === "string"
          ? event.metadata.title
          : event.summary.replace(/^\[[^\]]+\]\s*/, ""),
      rationale: typeof event.metadata.rationale === "string" ? event.metadata.rationale : null,
    }));
}

function suggestionKind(value: unknown): LibrarianSuggestion["kind"] {
  if (value === "question" || value === "source" || value === "fix") return value;
  return "fix";
}

function actionVerb(action: LibrarianAction["action"]) {
  switch (action) {
    case "create":
      return "created";
    case "edit":
      return "edited";
    case "rename":
      return "renamed";
    case "delete":
      return "deleted";
  }
}
