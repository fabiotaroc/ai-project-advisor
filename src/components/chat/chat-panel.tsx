"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import type { LucideIcon } from "lucide-react";
import {
  Brain,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FilePenLine,
  FileText,
  FolderTree,
  MessageSquareQuote,
  Search,
  SendHorizontal,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProjectConversationListItem } from "@/lib/types";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import {
  CITATION_LINK_PREFIX,
  getCitationFromHref,
  getCitationMetadataFromMessageLike,
  renderCitationMarkersAsMarkdownLinks,
  type ChatMessageMetadata,
  type CitationItem,
} from "@/lib/chat-citations";

const CONTEXT_WINDOW_TOKENS = 1_000_000;

function formatTokens(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return `${value}`;
}

const SUGGESTED_PROMPTS = [
  "Summarize the current project direction and any open risks.",
  "Review the uploaded sources and tell me what we still do not know.",
  "Draft an update to WORK.md based on the latest findings.",
  "Compare what PROJECT.md says against the source material.",
];

const TOOL_META: Record<string, { label: string; icon: LucideIcon }> = {
  list_files: { label: "Listing project files", icon: FolderTree },
  read_file: { label: "Reading a file", icon: FileText },
  edit_file: { label: "Updating a project file", icon: FilePenLine },
  search_sources: { label: "Searching source material", icon: Search },
  read_source: { label: "Opening a source", icon: BookOpen },
};

const TOOL_SUMMARY_SKIP = new Set(["projectId", "sourceMaterialId"]);

function truncate(value: string, length = 64) {
  return value.length > length ? `${value.slice(0, length - 1)}...` : value;
}

function humanizeToolName(toolName: string) {
  return toolName
    .replace(/^tool-/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim();
}

function stringifyValue(value: unknown) {
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getStringProperty(value: unknown, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const property = (value as Record<string, unknown>)[key];
  return typeof property === "string" ? property.trim() : "";
}

function summarizeToolInput(input: Record<string, unknown> | undefined) {
  if (!input) return "";
  if (typeof input.path === "string") return truncate(input.path, 54);
  if (typeof input.query === "string") return `Query: ${truncate(input.query, 44)}`;
  if (typeof input.sourceMaterialId === "string") return "Specific source";
  if ("content" in input) return "Includes drafted content";

  const summary = Object.entries(input)
    .filter(([key, value]) => {
      if (TOOL_SUMMARY_SKIP.has(key)) return false;
      if (value === undefined || value === null || value === "" || value === false) return false;
      return true;
    })
    .map(([key, value]) => {
      if (typeof value === "boolean") return key;
      if (typeof value === "string") return truncate(value, 30);
      return key;
    })
    .join(" · ");

  return truncate(summary, 68);
}

function summarizeToolPart(toolName: string, input: Record<string, unknown> | undefined, output: unknown) {
  if (toolName === "read_source") {
    const title = getStringProperty(output, "title");
    if (title) return truncate(title, 54);
  }

  return summarizeToolInput(input);
}

function getMessageText(message: UIMessage) {
  return message.parts
    .flatMap((part) => (part.type === "text" && part.text ? [part.text] : []))
    .join("\n\n");
}

function isToolPart(part: UIMessage["parts"][number]) {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
}

function isReasoningPart(
  part: UIMessage["parts"][number]
): part is Extract<UIMessage["parts"][number], { type: "reasoning" }> {
  return part.type === "reasoning";
}

type ToolPartInfo = {
  type: string;
  toolCallId?: string;
  toolName?: string;
  state?: string;
  input?: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
};

type CitationRailItem = CitationItem & { title: string };

type MemoryDraftItem = {
  key: string;
  path: string;
  action: "Created" | "Updated";
};

type ConversationFact = {
  label: string;
  value: string;
};

type TracePart =
  | { kind: "reasoning"; key: string; text: string; isStreaming: boolean }
  | { kind: "tool"; key: string; part: ToolPartInfo };

function isRunningToolState(state: string | undefined) {
  return state === "input-streaming" || state === "input-available" || state === "running";
}

function StreamingDots() {
  return (
    <span className="inline-flex items-end gap-1" aria-hidden="true">
      <style>
        {`
          @keyframes advisor-stream-bubble {
            0%, 60%, 100% { opacity: 0.28; transform: translateY(0); }
            30% { opacity: 1; transform: translateY(-3px); }
          }
        `}
      </style>
      <span className="size-1.5 rounded-full bg-current" style={{ animation: "advisor-stream-bubble 1.2s ease-in-out infinite" }} />
      <span className="size-1.5 rounded-full bg-current" style={{ animation: "advisor-stream-bubble 1.2s ease-in-out 160ms infinite" }} />
      <span className="size-1.5 rounded-full bg-current" style={{ animation: "advisor-stream-bubble 1.2s ease-in-out 320ms infinite" }} />
    </span>
  );
}

function formatListSummary(parts: string[]) {
  if (parts.length === 0) return "Tool activity";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
}

function toCitationRailItem(citation: CitationItem): CitationRailItem {
  return {
    ...citation,
    title: citation.sourceTitle,
    excerpt: citation.excerpt ? truncate(citation.excerpt.replace(/\s+/g, " "), 132) : undefined,
  };
}

function getMessageCitations(message: UIMessage): CitationRailItem[] {
  const metadata = getCitationMetadataFromMessageLike(message);
  return (metadata?.items ?? []).map(toCitationRailItem);
}

function CitationPill({
  citation,
  index,
  projectId,
  onRailHighlight,
}: {
  citation: CitationRailItem;
  index: number;
  projectId: string;
  onRailHighlight?: (citationKey: string | null) => void;
}) {
  return (
    <Link
      href={`/project/${projectId}/sources?source=${citation.sourceMaterialId}&chunk=${citation.chunkId}`}
      title={citation.title}
      className={cn(
        "relative top-px mx-0.5 inline-flex h-[18px] min-w-[18px] cursor-pointer items-center justify-center rounded-[5px] bg-cite-bg px-[5px] font-mono text-[11px] font-medium leading-none text-cite-fg no-underline",
        "transition-[background,transform] duration-[120ms] [transition-timing-function:cubic-bezier(0.2,0.6,0.2,1)]",
        "hover:bg-accent-soft-2 hover:-translate-y-px",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
      )}
      onMouseEnter={() => onRailHighlight?.(citation.key)}
      onMouseLeave={() => onRailHighlight?.(null)}
      onFocus={() => onRailHighlight?.(citation.key)}
      onBlur={() => onRailHighlight?.(null)}
    >
      {index + 1}
    </Link>
  );
}

function ToolTrace({ part }: { part: ToolPartInfo }) {
  const toolName = (part.toolName ?? part.type.replace(/^tool-/, "")) || "tool";
  const meta = TOOL_META[toolName] ?? { label: humanizeToolName(toolName), icon: Wrench };
  const Icon = meta.icon;
  const state = part.state ?? "running";
  const input = part.input ?? {};
  const output = part.output;
  const summary = summarizeToolPart(toolName, input, output);
  const isRunning = isRunningToolState(state);
  const hasError = state === "output-error";
  const hasOutput = state === "output-available";

  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col font-mono">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="group flex min-h-8 w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[11px] text-muted-foreground transition-colors hover:bg-card/75 hover:text-foreground"
      >
        <Icon className="size-3 shrink-0 opacity-70" />
        <span className="text-foreground/75">{toolName}</span>
        {summary ? (
          <span className="min-w-0 truncate text-muted-foreground/80">· {summary}</span>
        ) : (
          <span className="min-w-0 truncate text-muted-foreground/75">· {meta.label}</span>
        )}
        {isRunning ? <StreamingDots /> : null}
        <ChevronDown
          className={cn(
            "ml-auto size-3 shrink-0 opacity-35 transition-all group-hover:opacity-70",
            open && "rotate-180 opacity-70"
          )}
        />
      </button>
      {open ? (
        <div className="ml-3 mt-1 flex flex-col gap-2 border-l border-ai-line/80 pl-3">
          {Object.keys(input).length > 0 ? (
            <pre className="max-h-44 overflow-auto rounded-md border border-border/60 bg-card/75 px-2 py-1.5 text-[11px] whitespace-pre-wrap text-foreground/75">
              {stringifyValue(input)}
            </pre>
          ) : null}
          {hasOutput && output !== undefined ? (
            <pre className="max-h-44 overflow-auto rounded-md border border-border/60 bg-card/75 px-2 py-1.5 text-[11px] whitespace-pre-wrap text-foreground/75">
              {stringifyValue(output)}
            </pre>
          ) : null}
          {hasError ? (
            <p className="text-[11px] text-destructive">{part.errorText ?? "The tool call failed."}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ReasoningBlock({
  text,
  isStreaming,
}: {
  text: string;
  isStreaming: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col font-mono">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="group flex min-h-8 w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[11px] text-muted-foreground transition-colors hover:bg-card/75 hover:text-foreground"
      >
        <Brain className="size-3 shrink-0 opacity-70" />
        <span className="text-foreground/75">{isStreaming ? "thinking" : "thought"}</span>
        {isStreaming ? (
          <StreamingDots />
        ) : null}
        <ChevronDown
          className={cn(
            "ml-auto size-3 shrink-0 opacity-35 transition-all group-hover:opacity-70",
            open && "rotate-180 opacity-70"
          )}
        />
      </button>
      {open ? (
        <pre className="ml-3 mt-1 max-h-56 overflow-auto border-l border-ai-line/80 pl-3 text-[11px] leading-5 whitespace-pre-wrap text-foreground/75">
          {text}
        </pre>
      ) : null}
    </div>
  );
}

function getTraceSummary(traceParts: TracePart[], citations: CitationRailItem[]) {
  const toolParts = traceParts.flatMap((item) => (item.kind === "tool" ? [item.part] : []));
  const sourceReads = toolParts.filter((part) => getToolName(part) === "read_source").length;
  const sourceCount = sourceReads || citations.length;
  const memoryReads = toolParts.filter((part) => getToolName(part) === "read_file").length;
  const fileLists = toolParts.filter((part) => getToolName(part) === "list_files").length;
  const searches = toolParts.filter((part) => getToolName(part) === "search_sources").length;
  const memoryUpdates = toolParts.filter((part) => getToolName(part) === "edit_file").length;
  const lintRuns = toolParts.filter((part) => getToolName(part) === "trigger_wiki_lint").length;

  const summaryParts = [
    sourceCount > 0 ? `${sourceCount} ${sourceCount === 1 ? "source" : "sources"} ${sourceReads ? "read" : "found"}` : "",
    memoryReads > 0 ? `${memoryReads} ${memoryReads === 1 ? "memory" : "memories"} read` : "",
    searches > 0 && sourceReads === 0 ? `${searches} ${searches === 1 ? "search" : "searches"}` : "",
    fileLists > 0 ? `${fileLists} file ${fileLists === 1 ? "list" : "lists"}` : "",
    memoryUpdates > 0 ? `${memoryUpdates} memory ${memoryUpdates === 1 ? "update" : "updates"}` : "",
    lintRuns > 0 ? `${lintRuns} advisor ${lintRuns === 1 ? "pass" : "passes"}` : "",
  ].filter(Boolean);

  return formatListSummary(summaryParts);
}

function ToolTraceGroup({
  traceParts,
  citations,
}: {
  traceParts: TracePart[];
  citations: CitationRailItem[];
}) {
  const [open, setOpen] = useState(false);
  const isRunning = traceParts.some((item) =>
    item.kind === "reasoning" ? item.isStreaming : isRunningToolState(item.part.state)
  );

  if (traceParts.length === 0) return null;

  return (
    <div className="flex flex-col rounded-lg border border-border/70 bg-card/65 font-mono shadow-[var(--shadow-1)]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="group flex min-h-9 w-full items-center gap-2 px-3 py-2 text-left text-[11px] text-muted-foreground transition-colors hover:bg-muted/45 hover:text-foreground"
      >
        {isRunning ? <StreamingDots /> : null}
        <span className="min-w-0 flex-1 truncate text-foreground/75">
          {getTraceSummary(traceParts, citations)}
        </span>
        <span className="text-muted-foreground/70">
          {traceParts.length} {traceParts.length === 1 ? "item" : "items"}
        </span>
        <ChevronDown
          className={cn(
            "size-3 shrink-0 opacity-45 transition-transform group-hover:opacity-75",
            open && "rotate-180"
          )}
        />
      </button>
      {open ? (
        <div className="border-t border-border/70 px-2 py-2">
          {traceParts.map((item) =>
            item.kind === "reasoning" ? (
              <ReasoningBlock
                key={item.key}
                text={item.text}
                isStreaming={item.isStreaming}
              />
            ) : (
              <ToolTrace key={item.key} part={item.part} />
            )
          )}
        </div>
      ) : null}
    </div>
  );
}

function getToolName(part: ToolPartInfo) {
  return (part.toolName ?? part.type.replace(/^tool-/, "")) || "tool";
}

function extractToolParts(messages: UIMessage[]) {
  return messages.flatMap((message) =>
    message.parts
      .filter(isToolPart)
      .map((part) => part as ToolPartInfo)
  );
}

function getStreamingStatus(messages: UIMessage[], status: string) {
  if (status === "submitted") return "Reading project context...";

  const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const runningTools = latestAssistant
    ? latestAssistant.parts
        .filter(isToolPart)
        .map((part) => part as ToolPartInfo)
        .filter((part) => isRunningToolState(part.state))
    : [];

  const readSourceCount = runningTools.filter((part) => getToolName(part) === "read_source").length;
  if (readSourceCount > 0) {
    return `Reading ${readSourceCount} ${readSourceCount === 1 ? "source" : "sources"}...`;
  }

  const readFileCount = runningTools.filter((part) => getToolName(part) === "read_file").length;
  if (readFileCount > 0) {
    return `Reading ${readFileCount} project ${readFileCount === 1 ? "file" : "files"}...`;
  }

  if (runningTools.some((part) => getToolName(part) === "search_sources")) {
    return "Searching source material...";
  }

  if (runningTools.some((part) => getToolName(part) === "edit_file")) {
    return "Updating project memory...";
  }

  if (runningTools.some((part) => getToolName(part) === "trigger_wiki_lint")) {
    return "Starting advisor memory pass...";
  }

  if (status === "streaming") return "Writing answer...";
  return "Reading project context...";
}

function buildRailData(messages: UIMessage[], lastUsage: ChatMessageMetadata["usage"] | undefined, contextPercent: number) {
  const toolParts = extractToolParts(messages);
  const citationMap = new Map<string, CitationRailItem>();
  const memoryMap = new Map<string, MemoryDraftItem>();

  for (const message of messages) {
    if (message.role !== "assistant") continue;
    for (const citation of getMessageCitations(message)) {
      if (!citationMap.has(citation.key)) {
        citationMap.set(citation.key, citation);
      }
    }
  }

  for (const part of toolParts) {
    const toolName = getToolName(part);

    if (toolName === "edit_file" && part.output && typeof part.output === "object") {
      const output = part.output as { path?: string; created?: boolean };
      if (!output.path) continue;
      memoryMap.set(output.path, {
        key: output.path,
        path: output.path,
        action: output.created ? "Created" : "Updated",
      });
    }
  }

  const assistantMessages = messages.filter((message) => message.role === "assistant").length;
  const userMessages = messages.filter((message) => message.role === "user").length;
  const facts: ConversationFact[] = [
    { label: "Turns", value: `${userMessages} user · ${assistantMessages} advisor` },
    { label: "Tool traces", value: `${toolParts.length}` },
    { label: "Sources referenced", value: `${citationMap.size}` },
    { label: "Memory updates", value: `${memoryMap.size}` },
  ];

  if (lastUsage?.inputTokens) {
    facts.push({
      label: "Context",
      value: `${formatTokens(lastUsage.inputTokens)} tokens · ${contextPercent.toFixed(0)}%`,
    });
  }

  return {
    citations: Array.from(citationMap.values()),
    memoryDrafts: Array.from(memoryMap.values()).slice(0, 8),
    facts,
  };
}

function chatCitationKeysMatch(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

function ChatRail({
  projectId,
  citations,
  memoryDrafts,
  facts,
  collapsed,
  onToggle,
  highlightedCitationKey,
}: {
  projectId: string;
  citations: CitationRailItem[];
  memoryDrafts: MemoryDraftItem[];
  facts: ConversationFact[];
  collapsed: boolean;
  onToggle: () => void;
  highlightedCitationKey: string | null;
}) {
  if (collapsed) {
    return (
      <aside className="hidden w-fit min-w-0 shrink-0 justify-self-start flex-col items-center gap-3 bg-background px-2 py-3 xl:flex xl:min-h-0">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-lg"
          onClick={onToggle}
          aria-label="Expand citations rail"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex flex-col items-center gap-2 text-center font-mono text-[11px] text-muted-foreground">
          <span className="flex min-h-[18px] min-w-[18px] items-center justify-center rounded-[5px] bg-cite-bg px-1.5 font-medium text-cite-fg">
            {citations.length}
          </span>
          <span className="flex size-7 items-center justify-center rounded-full border border-ai-line bg-ai-surface text-accent-ink">
            {memoryDrafts.length}
          </span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden min-h-0 w-full min-w-0 flex-col gap-3 overflow-y-auto bg-background px-3 py-5 xl:flex">
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="px-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Citations</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="rounded-md"
            onClick={onToggle}
            aria-label="Collapse citations rail"
          >
            <ChevronRight className="size-3" />
          </Button>
        </div>
        {citations.length > 0 ? (
          <ol className="space-y-2">
            {citations.map((citation, index) => {
              const isHighlighted =
                highlightedCitationKey != null &&
                chatCitationKeysMatch(citation.key, highlightedCitationKey);
              return (
                <li
                  key={citation.key}
                  className={cn(
                    "rounded-lg border p-2.5 transition-[background,box-shadow,border-color] duration-150 [transition-timing-function:cubic-bezier(0.2,0.6,0.2,1)]",
                    isHighlighted
                      ? "border-accent-line bg-accent-soft/35 shadow-[0_0_0_1px_var(--accent-line),0_0_0_3px_var(--accent-soft-2)]"
                      : "border-border/60 bg-background/70"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        "flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-[5px] px-[5px] font-mono text-[11px] font-medium",
                        isHighlighted ? "bg-accent-soft-2 text-accent-ink" : "bg-cite-bg text-cite-fg"
                      )}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/project/${projectId}/sources?source=${citation.sourceMaterialId}&chunk=${citation.chunkId}`}
                        className="line-clamp-2 text-xs font-medium leading-5 text-foreground hover:text-primary"
                      >
                        {citation.title}
                      </Link>
                      {citation.excerpt ? (
                        <p className="mt-1 line-clamp-3 text-[11px] leading-5 text-muted-foreground">
                          {citation.excerpt}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="px-1 text-xs leading-5 text-muted-foreground">No source references in this chat yet.</p>
        )}
      </section>

      <section className="space-y-2 border-t border-border/70 pt-3">
        <h2 className="px-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Memory Drafts</h2>
        {memoryDrafts.length > 0 ? (
          <div className="space-y-2">
            {memoryDrafts.map((draft) => (
              <Link
                key={draft.key}
                href={`/project/${projectId}/files`}
                className="block rounded-lg border border-ai-line bg-ai-surface p-2.5 transition-colors hover:border-accent-line"
              >
                <div className="flex items-center gap-2">
                  <FilePenLine className="size-3.5 shrink-0 text-accent-ink" />
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground/80">
                    {draft.path}
                  </span>
                  <Badge variant="accent" className="h-4 px-1.5 text-[10px]">
                    {draft.action}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                  Captured from this conversation.
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="px-1 text-xs leading-5 text-muted-foreground">No memory updates proposed in this chat.</p>
        )}
      </section>

      <section className="space-y-2 border-t border-border/70 pt-3">
        <h2 className="px-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Conversation Facts</h2>
        <dl className="space-y-1.5">
          {facts.map((fact) => (
            <div key={fact.label} className="flex items-center justify-between gap-3 px-1">
              <dt className="text-xs text-muted-foreground">{fact.label}</dt>
              <dd className="text-right font-mono text-[11px] text-foreground/75">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </aside>
  );
}

function AssistantMessage({
  message,
  isStreaming,
  projectId,
  onCitationHighlight,
}: {
  message: UIMessage;
  isStreaming: boolean;
  projectId: string;
  onCitationHighlight?: (citationKey: string | null) => void;
}) {
  const citationMetadata = getCitationMetadataFromMessageLike(message);
  const citations = getMessageCitations(message);
  const traceParts: TracePart[] = [];

  for (const [index, part] of message.parts.entries()) {
    if (isReasoningPart(part)) {
      const text = (part.text ?? "").trim();
      if (text) {
        traceParts.push({
          kind: "reasoning",
          key: `${message.id}-reasoning-${index}`,
          text,
          isStreaming: isStreaming && index === message.parts.length - 1,
        });
      }
    }

    if (isToolPart(part)) {
      const toolPart = part as ToolPartInfo;
      traceParts.push({
        kind: "tool",
        key: toolPart.toolCallId ?? `${message.id}-tool-${index}`,
        part: toolPart,
      });
    }
  }

  const textNodes = message.parts.map((part, index) => {
    if (part.type === "text" && part.text) {
      return (
        <div
          key={`${message.id}-text-${index}`}
          className={cn(
            "text-sm text-foreground/95",
            "[&_p]:whitespace-pre-wrap [&_p]:leading-7",
            "[&_p:not(:first-child)]:mt-3",
            "[&_strong]:font-semibold",
            "[&_em]:italic",
            "[&_h1]:mt-5 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:tracking-tight",
            "[&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:tracking-tight",
            "[&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold",
            "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6",
            "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6",
            "[&_li]:mt-1 [&_li>p]:whitespace-normal",
            "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4",
            "[&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-border/70 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
            "[&_hr]:my-4 [&_hr]:border-border/70",
            "[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-lg",
            "[&_th]:border-b [&_th]:border-border/70 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium",
            "[&_td]:border-b [&_td]:border-border/40 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top",
            "[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-border/70 [&_pre]:bg-muted/45 [&_pre]:px-4 [&_pre]:py-3",
            "[&_code]:rounded-md [&_code]:bg-muted/60 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]",
            "[&_pre_code]:bg-transparent [&_pre_code]:p-0"
          )}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            urlTransform={(url) =>
              url.startsWith(CITATION_LINK_PREFIX) ? url : defaultUrlTransform(url)
            }
            components={{
              a: ({ node, ...props }) => {
                void node;
                const href = typeof props.href === "string" ? props.href : undefined;
                const citationRef = getCitationFromHref(href, citationMetadata);
                if (citationRef?.citation) {
                  return (
                    <CitationPill
                      citation={toCitationRailItem(citationRef.citation)}
                      index={citationRef.index}
                      projectId={projectId}
                      onRailHighlight={onCitationHighlight}
                    />
                  );
                }
                return <a {...props} rel="noreferrer" target="_blank" />;
              },
              p: ({ node, children, ...props }) => {
                void node;
                return <p {...props}>{children}</p>;
              },
            }}
          >
            {renderCitationMarkersAsMarkdownLinks(part.text, citationMetadata)}
          </ReactMarkdown>
        </div>
      );
    }

    return null;
  });

  return (
    <div className="flex flex-col gap-2.5">
      <ToolTraceGroup traceParts={traceParts} citations={citations} />
      {textNodes}
    </div>
  );
}

function EmptyState({
  onSuggestion,
  isBusy,
}: {
  onSuggestion: (prompt: string) => void;
  isBusy: boolean;
}) {
  return (
    <div className="flex h-full min-h-[28rem] flex-col items-center justify-center gap-5 px-4 text-center">
      <div className="max-w-2xl space-y-2">
        <h2 className="font-heading text-2xl tracking-tight text-foreground">Ask anything about the project</h2>
        <p className="text-sm leading-7 text-muted-foreground">
          Look through project files, search uploaded source material, and update project documents when you ask for concrete changes.
        </p>
      </div>
      <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <Button
            key={prompt}
            type="button"
            variant="outline"
            className="h-auto justify-start rounded-xl px-4 py-3 text-left whitespace-normal"
            disabled={isBusy}
            onClick={() => onSuggestion(prompt)}
          >
            <MessageSquareQuote data-icon="inline-start" />
            <span className="leading-6">{prompt}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

export type ConversationSummary = ProjectConversationListItem;

export function ChatPanel({
  projectId,
  chatId,
  initialMessages = [],
}: {
  projectId: string;
  chatId?: string;
  initialMessages?: UIMessage[];
  conversations?: ConversationSummary[];
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [hoveredRailCitationKey, setHoveredRailCitationKey] = useState<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolledRef = useRef(false);
  const isScrollingToBottomRef = useRef(false);
  const scrollSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldStickToBottomRef = useRef(true);

  const stableChatId = chatId ?? `${projectId}-new`;
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { projectId, conversationId: chatId },
      }),
    [chatId, projectId]
  );

  const { messages, sendMessage, status, error } = useChat({
    id: stableChatId,
    messages: initialMessages,
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onFinish: () => {
      router.refresh();
    },
  });

  const isBusy = status === "submitted" || status === "streaming";

  const lastUsage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role !== "assistant") continue;
      const usage = (message.metadata as ChatMessageMetadata | undefined)?.usage;
      if (usage?.totalTokens || usage?.inputTokens) return usage;
    }
    return undefined;
  }, [messages]);

  const contextTokens = lastUsage?.inputTokens ?? 0;
  const contextPercent = contextTokens
    ? Math.min(100, (contextTokens / CONTEXT_WINDOW_TOKENS) * 100)
    : 0;
  const railData = useMemo(
    () => buildRailData(messages, lastUsage, contextPercent),
    [contextPercent, lastUsage, messages]
  );
  const streamingStatus = useMemo(
    () => getStreamingStatus(messages, status),
    [messages, status]
  );

  const updateScrollToBottomButton = useCallback(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;

    const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    const isAwayFromBottom = distanceFromBottom > 96;

    if (isScrollingToBottomRef.current) {
      if (!isAwayFromBottom) {
        isScrollingToBottomRef.current = false;
        if (scrollSettleTimerRef.current) {
          clearTimeout(scrollSettleTimerRef.current);
          scrollSettleTimerRef.current = null;
        }
        shouldStickToBottomRef.current = true;
        setShowScrollToBottom(false);
      }
      return;
    }

    shouldStickToBottomRef.current = !isAwayFromBottom;
    setShowScrollToBottom(isAwayFromBottom);
  }, []);

  const scrollViewportToBottom = useCallback((behavior: ScrollBehavior) => {
    const viewport = scrollRef.current;
    if (!viewport) return;

    if (behavior === "smooth") {
      isScrollingToBottomRef.current = true;
      if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current);
      scrollSettleTimerRef.current = setTimeout(() => {
        isScrollingToBottomRef.current = false;
        scrollSettleTimerRef.current = null;
        updateScrollToBottomButton();
      }, 450);
    }

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior,
    });
  }, [updateScrollToBottomButton]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    shouldStickToBottomRef.current = true;
    setShowScrollToBottom(false);
    scrollViewportToBottom(behavior);
  }, [scrollViewportToBottom]);

  useEffect(() => {
    if (shouldStickToBottomRef.current) {
      scrollViewportToBottom(hasAutoScrolledRef.current && messages.length > 0 ? "smooth" : "auto");
      hasAutoScrolledRef.current = true;
      return;
    }

    const frame = requestAnimationFrame(updateScrollToBottomButton);
    return () => cancelAnimationFrame(frame);
  }, [messages, status, scrollViewportToBottom, updateScrollToBottomButton]);

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;

    const frame = requestAnimationFrame(updateScrollToBottomButton);

    viewport.addEventListener("scroll", updateScrollToBottomButton, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollToBottomButton);
    resizeObserver.observe(viewport);

    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("scroll", updateScrollToBottomButton);
      resizeObserver.disconnect();
      if (scrollSettleTimerRef.current) {
        clearTimeout(scrollSettleTimerRef.current);
        scrollSettleTimerRef.current = null;
      }
    };
  }, [updateScrollToBottomButton]);

  const submitText = useCallback(
    async (value: string) => {
      const text = value.trim();
      if (!text || isBusy) return;

      setInput("");
      shouldStickToBottomRef.current = true;
      setShowScrollToBottom(false);

      try {
        await sendMessage({ text });
      } catch {
        setInput(text);
      }
    },
    [isBusy, sendMessage]
  );

  return (
    <section
      className={cn(
        "-m-4 grid h-[calc(100vh-3rem)] grid-cols-1 gap-0 bg-background",
        railCollapsed
          ? "xl:grid-cols-[minmax(0,1fr)_auto]"
          : "xl:grid-cols-[minmax(0,1fr)_19rem]"
      )}
    >
      <div className="flex min-h-0 flex-col overflow-hidden bg-background">
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
            {messages.length === 0 ? (
              <EmptyState isBusy={isBusy} onSuggestion={(prompt) => void submitText(prompt)} />
            ) : (
              <>
                {messages.map((message, index) => {
                  const userText = getMessageText(message);
                  const isStreamingAssistantMessage =
                    message.role === "assistant" &&
                    index === messages.length - 1 &&
                    isBusy;

                  return (
                    <article
                      key={message.id}
                      className={cn(
                        "flex w-full",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          message.role === "user"
                            ? "max-w-[min(38rem,88%)] rounded-xl border border-border/70 bg-background px-3.5 py-2.5 shadow-[var(--shadow-1)]"
                            : "w-full max-w-[52rem] rounded-xl border border-ai-line bg-ai-surface px-4 py-4 shadow-[var(--shadow-1)] sm:px-5"
                        )}
                      >
                        {message.role === "user" ? (
                          <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">{userText}</p>
                        ) : (
                          <AssistantMessage
                            message={message}
                            isStreaming={isStreamingAssistantMessage}
                            projectId={projectId}
                            onCitationHighlight={setHoveredRailCitationKey}
                          />
                        )}
                      </div>
                    </article>
                  );
                })}
                {isBusy && messages[messages.length - 1]?.role === "user" ? (
                  <div className="flex justify-start">
                    <div className="w-full max-w-[52rem] rounded-xl border border-ai-line bg-ai-surface px-4 py-3 shadow-[var(--shadow-1)] sm:px-5">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <StreamingDots />
                        <span>{streamingStatus}</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
          {showScrollToBottom ? (
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border-border/80 bg-card/95 shadow-[var(--shadow-3)] supports-[backdrop-filter]:bg-card/85 supports-[backdrop-filter]:backdrop-blur"
              aria-label="Scroll to latest message"
              onClick={() => scrollToBottom("smooth")}
            >
              <ChevronDown />
            </Button>
          ) : null}
        </div>

        <div className="bg-background/85 px-4 pb-4 pt-2 supports-[backdrop-filter]:bg-background/70 supports-[backdrop-filter]:backdrop-blur sm:px-6 lg:px-8">
          {error ? (
            <div className="mb-3 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Chat failed: {error.message}
            </div>
          ) : null}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitText(input);
            }}
          >
            <InputGroup className="rounded-xl border-border/80 bg-card px-2 py-1 shadow-[var(--shadow-1)] transition-colors focus-within:border-accent-line">
              <InputGroupTextarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submitText(input);
                  }
                }}
                rows={2}
                placeholder="Ask anything about the project..."
                className="min-h-12 px-2 py-2 text-sm leading-6 placeholder:text-muted-foreground/70"
              />
              <InputGroupAddon align="block-end" className="flex-wrap px-2 pb-1">
                <span className="text-[11px] text-muted-foreground/70">
                  <kbd className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    Enter
                  </kbd>{" "}
                  to send
                </span>
                {isBusy ? (
                  <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground/80">
                    <StreamingDots />
                    {streamingStatus}
                  </span>
                ) : lastUsage ? (
                  <span
                    className="font-mono text-[11px] text-muted-foreground/70"
                    title={`Input ${lastUsage.inputTokens ?? 0} · Output ${lastUsage.outputTokens ?? 0} · Total ${lastUsage.totalTokens ?? 0} tokens`}
                  >
                    {formatTokens(contextTokens)} / {formatTokens(CONTEXT_WINDOW_TOKENS)} ctx ({contextPercent.toFixed(0)}%)
                    {lastUsage.outputTokens
                      ? ` · ${formatTokens(lastUsage.outputTokens)} out`
                      : ""}
                  </span>
                ) : null}
                <InputGroupButton
                  type="submit"
                  variant="default"
                  size="icon-sm"
                  disabled={isBusy || !input.trim()}
                  className="ml-auto rounded-lg"
                  aria-label={isBusy ? "Advisor is working" : "Send message"}
                >
                  <SendHorizontal className="size-4" />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </form>
        </div>
      </div>

      <ChatRail
        projectId={projectId}
        citations={railData.citations}
        memoryDrafts={railData.memoryDrafts}
        facts={railData.facts}
        collapsed={railCollapsed}
        onToggle={() => setRailCollapsed((value) => !value)}
        highlightedCitationKey={hoveredRailCitationKey}
      />
    </section>
  );
}
