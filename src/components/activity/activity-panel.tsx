import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bot,
  CheckCircle2,
  CircleDashed,
  Clock3,
  FilePlus2,
  FileText,
  Lightbulb,
  MessageSquare,
  MoveRight,
  Pencil,
  Sparkles,
  Trash2,
  TriangleAlert,
  Upload,
} from "lucide-react";
import type {
  ActivityEvent,
  LibrarianAction,
  LibrarianRun,
  LibrarianSuggestion,
  ProjectActivity,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, formatRelative } from "@/lib/date-format";
import { cn } from "@/lib/utils";

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

type ParsedRunSummary = {
  subject: string | null;
  counts: string | null;
  body: string | null;
};

const runStatusStyles: Record<
  LibrarianRun["status"],
  {
    label: string;
    dot: string;
    rail: string;
    badge: string;
    Icon: LucideIcon;
  }
> = {
  succeeded: {
    label: "Succeeded",
    dot: "bg-emerald-500",
    rail: "border-l-emerald-400",
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    Icon: CheckCircle2,
  },
  running: {
    label: "Running",
    dot: "bg-sky-500",
    rail: "border-l-sky-400",
    badge:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300",
    Icon: CircleDashed,
  },
  failed: {
    label: "Failed",
    dot: "bg-rose-500",
    rail: "border-l-rose-400",
    badge:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300",
    Icon: TriangleAlert,
  },
};

const triggerStyles: Record<
  LibrarianRun["trigger_type"],
  {
    title: string;
    Icon: LucideIcon;
    icon: string;
  }
> = {
  conversation_ended: {
    title: "Chat memory pass",
    Icon: MessageSquare,
    icon: "bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900/70",
  },
  source_ingested: {
    title: "Source integration",
    Icon: Upload,
    icon: "bg-sky-100 text-sky-700 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900/70",
  },
  wiki_lint: {
    title: "Wiki lint",
    Icon: Sparkles,
    icon: "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900/70",
  },
};

const actionIcons: Record<LibrarianAction["action"], LucideIcon> = {
  create: FilePlus2,
  edit: Pencil,
  rename: MoveRight,
  delete: Trash2,
};

export function ActivityPanel({ activity }: { activity: ProjectActivity }) {
  const relatedEventsByRun = groupLibrarianEvents(activity.events);
  const genericEvents = activity.events.filter((event) => !isGroupedLibrarianEvent(event));
  const timelineItems: TimelineItem[] = [
    ...activity.librarianRuns.map((run) => ({
      kind: "librarian" as const,
      id: run.id,
      timestamp: run.finished_at ?? run.started_at,
      run,
    })),
    ...genericEvents.map((event) => ({
      kind: "event" as const,
      id: event.id,
      timestamp: event.created_at,
      event,
    })),
  ].sort(
    (left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  );

  const latestRun = activity.librarianRuns[0] ?? null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Activity</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {timelineItems.length} event{timelineItems.length === 1 ? "" : "s"} recorded
          </p>
        </div>
        {latestRun ? (
          <Badge variant="outline" className="h-7 gap-1.5 rounded-md px-2.5">
            <Bot className="size-3.5" />
            Last Librarian run {formatRelative(latestRun.finished_at ?? latestRun.started_at)}
          </Badge>
        ) : null}
      </div>

      {timelineItems.length > 0 ? (
        <ol className="relative flex flex-col gap-3 before:absolute before:bottom-3 before:left-4 before:top-3 before:w-px before:bg-border sm:before:left-5">
          {timelineItems.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="relative pl-9 sm:pl-12">
              {item.kind === "librarian" ? (
                <LibrarianRunCard
                  run={item.run}
                  relatedEvents={relatedEventsByRun.get(item.run.id) ?? []}
                />
              ) : (
                <GenericEventCard event={item.event} />
              )}
            </li>
          ))}
        </ol>
      ) : (
        <Card className="rounded-lg border-dashed py-0">
          <CardContent className="flex min-h-40 items-center justify-center px-4 py-8 text-sm text-muted-foreground">
            No activity has been recorded for this project yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LibrarianRunCard({
  run,
  relatedEvents,
}: {
  run: LibrarianRun;
  relatedEvents: ActivityEvent[];
}) {
  const status = runStatusStyles[run.status];
  const trigger = triggerStyles[run.trigger_type];
  const parsed = parseRunSummary(run.summary);
  const subject = subjectLabel(parsed.subject);
  const summary = parsed.body ?? run.error ?? run.summary ?? "No summary was recorded.";
  const actions = run.actions.slice(0, 6);
  const hiddenActionCount = Math.max(run.actions.length - actions.length, 0);
  const suggestions = suggestionsForRun(run, relatedEvents).slice(0, 3);
  const files = filesForRun(run).slice(0, 8);
  const StatusIcon = status.Icon;
  const TriggerIcon = trigger.Icon;

  return (
    <>
      <span
        className={cn(
          "absolute left-[0.84rem] top-5 z-10 size-3 rounded-full ring-4 ring-background sm:left-[1.1rem]",
          status.dot,
        )}
      />
      <Card className={cn("rounded-lg border-l-4 py-0 shadow-sm", status.rail)}>
        <CardContent className="px-4 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1",
                  trigger.icon,
                )}
              >
                <TriggerIcon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold leading-tight">{trigger.title}</h2>
                  <Badge variant="outline" className={cn("rounded-md", status.badge)}>
                    <StatusIcon className="size-3" />
                    {status.label}
                  </Badge>
                  <Badge variant="outline" className="rounded-md capitalize">
                    {run.mode}
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="size-3" />
                    {formatDateTime(run.finished_at ?? run.started_at)}
                  </span>
                  <span>{durationLabel(run)}</span>
                  {subject ? <span className="min-w-0 truncate">{subject}</span> : null}
                </div>
              </div>
            </div>

            <p className="line-clamp-3 text-sm leading-6 text-foreground/90">{summary}</p>

            <div className="flex flex-wrap gap-2">
              <MetricPill label="Actions" value={runActionCount(run)} />
              <MetricPill label="Files" value={filesForRun(run).length} />
              <MetricPill label="Suggestions" value={Math.max(run.suggestion_count, suggestionsForRun(run, relatedEvents).length)} />
              {parsed.counts ? <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{parsed.counts}</span> : null}
            </div>

            {actions.length > 0 ? (
              <div className="grid gap-2 md:grid-cols-2">
                {actions.map((action, index) => (
                  <ActionRow key={`${action.action}-${action.path}-${index}`} action={action} />
                ))}
                {hiddenActionCount > 0 ? (
                  <div className="rounded-lg border border-dashed border-border/80 px-3 py-2 text-xs text-muted-foreground">
                    +{hiddenActionCount} more action{hiddenActionCount === 1 ? "" : "s"}
                  </div>
                ) : null}
              </div>
            ) : files.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {files.map((file) => (
                  <span
                    key={file}
                    className="rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground"
                  >
                    {file}
                  </span>
                ))}
              </div>
            ) : null}

            {suggestions.length > 0 ? (
              <div className="grid gap-2">
                {suggestions.map((suggestion, index) => (
                  <SuggestionRow
                    key={`${suggestion.kind}-${suggestion.title}-${index}`}
                    suggestion={suggestion}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function GenericEventCard({ event }: { event: ActivityEvent }) {
  const theme = eventTheme(event.event_type);
  const Icon = theme.Icon;

  return (
    <>
      <span
        className={cn(
          "absolute left-[0.84rem] top-5 z-10 size-3 rounded-full ring-4 ring-background sm:left-[1.1rem]",
          theme.dot,
        )}
      />
      <Card className={cn("rounded-lg border-l-4 py-0 shadow-sm", theme.rail)}>
        <CardContent className="flex items-start gap-3 px-4 py-3.5">
          <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", theme.icon)}>
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold">{eventLabel(event.event_type)}</h2>
              <Badge variant="outline" className="rounded-md text-[11px]">
                {formatEventType(event.event_type)}
              </Badge>
            </div>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-foreground/90">{event.summary}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(event.created_at)}</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function ActionRow({ action }: { action: LibrarianAction }) {
  const Icon = actionIcons[action.action];
  const reason = typeof action.details?.reason === "string" ? action.details.reason : null;
  const proposed = action.details?.proposed === true;

  return (
    <div className="flex min-w-0 items-start gap-2 rounded-lg border border-border/70 bg-muted/25 px-3 py-2">
      <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-mono text-xs font-medium">
          {proposed ? "Proposed " : ""}
          {actionLabel(action.action)} {action.path}
        </p>
        {reason ? <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{reason}</p> : null}
      </div>
    </div>
  );
}

function SuggestionRow({ suggestion }: { suggestion: LibrarianSuggestion }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
      <Lightbulb className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-75">{suggestion.kind}</p>
        <p className="text-sm">{suggestion.title}</p>
        {suggestion.rationale ? (
          <p className="mt-0.5 line-clamp-2 text-xs opacity-75">{suggestion.rationale}</p>
        ) : null}
      </div>
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background px-2 py-1 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{value}</span>
      {label}
    </span>
  );
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

function parseRunSummary(summary: string | null): ParsedRunSummary {
  if (!summary) return { subject: null, counts: null, body: null };

  const match = summary.match(/^Librarian\s+([\s\S]+):\s+([^.]+)\.\s*([\s\S]*)$/);
  if (!match) return { subject: null, counts: null, body: summary };

  return {
    subject: match[1] || null,
    counts: match[2] || null,
    body: match[3] || null,
  };
}

function subjectLabel(subject: string | null) {
  if (!subject) return null;

  const chat = subject.match(/^chat\(([\s\S]*)\)$/);
  if (chat?.[1]) return `Chat: ${chat[1]}`;

  const ingest = subject.match(/^ingest\(([\s\S]*)\)$/);
  if (ingest?.[1]) return `Source: ${ingest[1]}`;

  return subject === "lint" ? "User-requested lint" : subject;
}

function durationLabel(run: LibrarianRun) {
  if (!run.finished_at) return "In progress";

  const started = new Date(run.started_at).getTime();
  const finished = new Date(run.finished_at).getTime();
  if (!Number.isFinite(started) || !Number.isFinite(finished) || finished < started) {
    return "Duration unavailable";
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

function actionLabel(action: LibrarianAction["action"]) {
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

function eventTheme(eventType: string): {
  dot: string;
  rail: string;
  icon: string;
  Icon: LucideIcon;
} {
  if (eventType === "source_ingested") {
    return {
      dot: "bg-sky-500",
      rail: "border-l-sky-400",
      icon: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
      Icon: Upload,
    };
  }

  if (eventType === "agent_file_edit" || eventType === "file_edited") {
    return {
      dot: "bg-emerald-500",
      rail: "border-l-emerald-400",
      icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
      Icon: FileText,
    };
  }

  return {
    dot: "bg-muted-foreground",
    rail: "border-l-border",
    icon: "bg-muted text-muted-foreground",
    Icon: Activity,
  };
}

function eventLabel(eventType: string) {
  switch (eventType) {
    case "source_ingested":
      return "Source ingested";
    case "agent_file_edit":
      return "Advisor file edit";
    case "file_edited":
      return "Manual file edit";
    default:
      return "Project event";
  }
}

function formatEventType(eventType: string) {
  return eventType.replaceAll("_", " ");
}
