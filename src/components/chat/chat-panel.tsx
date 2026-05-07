"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FilePenLine,
  SendHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  WikiProposalCard,
  type WikiProposalToolOutput,
} from "@/components/chat/wiki-proposal-card";
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
  type CitationItem,
} from "@/lib/chat-citations";

const THINKING_PHRASES = [
  "Thinking...",
  "Pondering...",
  "Analyzing...",
  "Reviewing...",
  "Reasoning...",
];

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

function getStringProperty(value: unknown, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const property = (value as Record<string, unknown>)[key];
  return typeof property === "string" ? property.trim() : "";
}

function getWikiProposalOutput(output: unknown): WikiProposalToolOutput | null {
  if (!output || typeof output !== "object" || Array.isArray(output)) return null;
  const record = output as Record<string, unknown>;
  if (record.proposed !== true && typeof record.edit_id !== "string") return null;
  return {
    proposed: record.proposed === true,
    error: typeof record.error === "string" ? record.error : undefined,
    edit_id: typeof record.edit_id === "string" ? record.edit_id : undefined,
    status:
      record.status === "accepted" || record.status === "rejected" || record.status === "pending"
        ? record.status
        : undefined,
    target_doc_id: typeof record.target_doc_id === "string" ? record.target_doc_id : undefined,
    target_doc_slug: typeof record.target_doc_slug === "string" ? record.target_doc_slug : undefined,
    target_doc_title: typeof record.target_doc_title === "string" ? record.target_doc_title : undefined,
    inserted_text: typeof record.inserted_text === "string" ? record.inserted_text : undefined,
    reason: typeof record.reason === "string" ? record.reason : null,
  };
}

/**
 * Single source of truth for how each timeline row reads. Returns a
 * tense-aware verb phrase that shifts as the part transitions through
 * input-streaming → input-available → output-available / output-error.
 */
function describeToolRow(
  toolName: string,
  state: string | undefined,
  input: Record<string, unknown>,
  output: unknown
): { label: string; isError: boolean; isRunning: boolean } {
  const running = isRunningToolState(state);
  const failed = state === "output-error";
  const query = getStringProperty(input, "query");
  const sourceTitle = getStringProperty(output, "title");
  const hits = Array.isArray(output) ? output.length : null;

  const make = (label: string) => ({ label, isError: failed, isRunning: running });

  switch (toolName) {
    case "list_canonical_docs":
      if (failed) return make("Couldn't list project docs");
      return make(running ? "Listing canonical docs..." : "Listed canonical docs");
    case "read_canonical_doc": {
      const slug = getStringProperty(input, "slug");
      const target = truncate(slug || "doc", 48);
      if (failed) return make(`Couldn't read ${target}`);
      return make(running ? `Reading ${target}...` : `Read ${target}`);
    }
    case "search_sources": {
      const q = query ? `'${truncate(query, 40)}'` : "sources";
      if (failed) return make(`Couldn't search ${q}`);
      if (running) return make(`Searching ${q}...`);
      const suffix = hits != null ? ` (${hits} ${hits === 1 ? "hit" : "hits"})` : "";
      return make(`Searched ${q}${suffix}`);
    }
    case "read_source": {
      const label = sourceTitle ? `'${truncate(sourceTitle, 48)}'` : "source";
      if (failed) return make("Couldn't open source");
      return make(running ? "Opening source..." : `Read ${label}`);
    }
    case "propose_wiki_update": {
      const slug = getStringProperty(input, "target_doc_slug");
      const target = slug ? `${truncate(slug, 40)}.md` : "memory";
      if (failed) return make(`Couldn't draft ${target}`);
      return make(running ? `Drafting ${target} update...` : `Drafted ${target} update`);
    }
    default: {
      const friendly = humanizeToolName(toolName) || "tool";
      if (failed) return make(`${friendly} failed`);
      return make(running ? `Running ${friendly}...` : `Ran ${friendly}`);
    }
  }
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

type TimelineState = "running" | "done" | "error";

/**
 * One row in the trace timeline. A small bullet on the left, a thin
 * connector line down to the next row when there is one, and the row's
 * content rendered to the right. Bullet color/animation reflects state.
 */
function TimelineRow({
  state,
  showConnector,
  children,
}: {
  state: TimelineState;
  showConnector: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex items-start text-[11px] font-mono text-muted-foreground">
      {showConnector ? (
        <span
          aria-hidden
          className="absolute left-[2.5px] top-[14px] h-[calc(100%+10px)] w-px bg-ai-line"
        />
      ) : null}
      <span
        aria-hidden
        className={cn(
          "mt-[5px] size-1.5 shrink-0 rounded-full",
          // Active step: solid blue dot with a soft pulsing halo so the eye
          // immediately lands on what the model is doing right now.
          state === "running" &&
            "animate-pulse bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.18),0_0_8px_2px_rgba(59,130,246,0.55)]",
          state === "done" && "bg-accent-line",
          state === "error" && "bg-destructive/70"
        )}
      />
      <div className="ml-2 min-w-0 flex-1">{children}</div>
    </div>
  );
}

function ToolRow({
  part,
  showConnector,
}: {
  part: ToolPartInfo;
  showConnector: boolean;
}) {
  const toolName = getToolName(part);
  const { label, isError, isRunning } = describeToolRow(
    toolName,
    part.state,
    part.input ?? {},
    part.output
  );
  const state: TimelineState = isError ? "error" : isRunning ? "running" : "done";
  return (
    <TimelineRow state={state} showConnector={showConnector}>
      <span className={cn(isError ? "text-destructive/85" : "text-foreground/80")}>
        {label}
      </span>
      {isError && part.errorText ? (
        <span className="ml-2 truncate text-muted-foreground/70">· {part.errorText}</span>
      ) : null}
    </TimelineRow>
  );
}

/**
 * Reasoning row: cycles thinking phrases while live, collapses to a
 * "Thought process" disclosure once the part finishes streaming. The body
 * is rendered as muted prose (not raw `<pre>`) so it doesn't shout.
 */
function ReasoningRow({
  text,
  isStreaming,
  showConnector,
}: {
  text: string;
  isStreaming: boolean;
  showConnector: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    if (!isStreaming) return;
    const id = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % THINKING_PHRASES.length);
    }, 2000);
    return () => clearInterval(id);
  }, [isStreaming]);

  const showContent = (open || isStreaming) && text.length > 0;
  const state: TimelineState = isStreaming ? "running" : "done";

  return (
    <TimelineRow state={state} showConnector={showConnector}>
      <button
        type="button"
        onClick={() => !isStreaming && setOpen((v) => !v)}
        disabled={isStreaming}
        className={cn(
          "inline-flex items-center gap-1 text-left text-foreground/80 transition-colors",
          !isStreaming && "hover:text-foreground"
        )}
      >
        <span>{isStreaming ? THINKING_PHRASES[phraseIdx] : "Thought process"}</span>
        {!isStreaming ? (
          <ChevronDown
            className={cn(
              "size-3 opacity-50 transition-transform",
              open ? "rotate-0" : "-rotate-90"
            )}
          />
        ) : null}
      </button>
      {showContent ? (
        <div className="mt-1.5 max-h-56 overflow-auto whitespace-pre-wrap text-[11px] leading-5 text-muted-foreground/80">
          {text}
        </div>
      ) : null}
    </TimelineRow>
  );
}

/**
 * Collapsible "Working… / Completed in N steps" wrapper around a trace
 * timeline. Auto-collapses once `shouldMinimize` flips true (i.e. text has
 * streamed in below it). Uses a latch so the end-of-stream re-render
 * doesn't pop it back open. Manual user toggle overrides the auto behavior.
 *
 * Adapted from `mike/frontend/src/app/components/shared/PreResponseWrapper.tsx`.
 */
function PreResponseWrapper({
  children,
  stepCount,
  shouldMinimize,
  isStreaming,
}: {
  children: React.ReactNode;
  stepCount: number;
  shouldMinimize: boolean;
  isStreaming: boolean;
}) {
  // Once the wrapper has *ever* been asked to minimize (i.e. text streamed
  // in below), latch that so a later render where shouldMinimize flips back
  // to false (e.g. end-of-stream reconcile) doesn't pop the wrapper open.
  // The official React pattern for "store information from previous renders"
  // is a guarded setState during render, which doesn't trigger an extra
  // commit and is preferred over ref-mutation under the new react-hooks rules.
  const [hasMinimized, setHasMinimized] = useState(false);
  if (shouldMinimize && !hasMinimized) setHasMinimized(true);

  // `userOpen` is the explicit user override; null means "follow auto".
  // Deriving `isOpen` during render avoids a setState-in-effect cascade.
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const autoOpen = !shouldMinimize && !hasMinimized;
  const isOpen = userOpen ?? autoOpen;

  const stepWord = stepCount === 1 ? "step" : "steps";
  const label = isStreaming ? "Working" : `Completed in ${stepCount} ${stepWord}`;

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setUserOpen(!isOpen)}
        className="inline-flex w-fit items-center gap-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="truncate">{label}</span>
        {isStreaming ? <StreamingDots /> : null}
        <ChevronDown
          className={cn(
            "size-3 shrink-0 opacity-60 transition-transform",
            isOpen ? "rotate-0" : "-rotate-90"
          )}
        />
      </button>
      {isOpen ? <div className="mt-2.5 flex flex-col gap-2.5 pl-px">{children}</div> : null}
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

  const readDocCount = runningTools.filter(
    (part) => getToolName(part) === "read_canonical_doc",
  ).length;
  if (readDocCount > 0) {
    return `Reading ${readDocCount} canonical ${readDocCount === 1 ? "doc" : "docs"}...`;
  }

  if (runningTools.some((part) => getToolName(part) === "search_sources")) {
    return "Searching source material...";
  }

  if (status === "streaming") return "Writing answer...";
  return "Reading project context...";
}

function buildRailData(messages: UIMessage[]) {
  const toolParts = extractToolParts(messages);
  const citationMap = new Map<string, CitationRailItem>();
  const memoryMap = new Map<string, MemoryDraftItem>();

  for (const message of messages) {
    if (message.role !== "assistant") continue;
    for (const part of message.parts) {
      if (!isToolPart(part)) continue;
      const toolPart = part as ToolPartInfo;
      if (getToolName(toolPart) !== "propose_wiki_update") continue;
      const proposal = getWikiProposalOutput(toolPart.output);
      if (!proposal?.edit_id) continue;
      memoryMap.set(proposal.edit_id, {
        key: proposal.edit_id,
        path: `${proposal.target_doc_slug ?? "wiki"}.md`,
        action: proposal.status === "accepted" ? "Updated" : "Created",
      });
    }
    for (const citation of getMessageCitations(message)) {
      if (!citationMap.has(citation.key)) {
        citationMap.set(citation.key, citation);
      }
    }
  }

  const assistantMessages = messages.filter((message) => message.role === "assistant").length;
  const userMessages = messages.filter((message) => message.role === "user").length;
  const facts: ConversationFact[] = [
    { label: "Turns", value: `${userMessages} user · ${assistantMessages} Morgan` },
    { label: "Tool traces", value: `${toolParts.length}` },
    { label: "Sources referenced", value: `${citationMap.size}` },
    { label: "Memory updates", value: `${memoryMap.size}` },
  ];

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
                href={`/project/${projectId}/wiki`}
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

/** Markdown body for a single text part. Extracted so it can sit between
 *  trace groups during interleaved rendering. */
function AssistantTextPart({
  text,
  citationMetadata,
  projectId,
  onCitationHighlight,
}: {
  text: string;
  citationMetadata: ReturnType<typeof getCitationMetadataFromMessageLike>;
  projectId: string;
  onCitationHighlight?: (citationKey: string | null) => void;
}) {
  return (
    <div
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
        {renderCitationMarkersAsMarkdownLinks(text, citationMetadata)}
      </ReactMarkdown>
    </div>
  );
}

type AssistantGroup =
  | { kind: "trace"; key: string; items: TracePart[] }
  | { kind: "text"; key: string; text: string }
  | { kind: "wiki-proposal"; key: string; output: WikiProposalToolOutput };

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

  // Walk parts once and bucket consecutive trace items together. Each text
  // part flushes the current bucket and emits its own group, so prose ends
  // up between trace blocks rather than below a single fat trace card.
  const groups: AssistantGroup[] = [];
  let currentTrace: Extract<AssistantGroup, { kind: "trace" }> | null = null;
  const lastIndex = message.parts.length - 1;

  for (const [index, part] of message.parts.entries()) {
    if (part.type === "text" && part.text) {
      if (currentTrace) {
        groups.push(currentTrace);
        currentTrace = null;
      }
      groups.push({
        kind: "text",
        key: `${message.id}-text-${index}`,
        text: part.text,
      });
      continue;
    }

    if (isReasoningPart(part)) {
      const text = (part.text ?? "").trim();
      if (!text) continue;
      if (!currentTrace) {
        currentTrace = {
          kind: "trace",
          key: `${message.id}-trace-${index}`,
          items: [],
        };
      }
      currentTrace.items.push({
        kind: "reasoning",
        key: `${message.id}-reasoning-${index}`,
        text,
        isStreaming: isStreaming && index === lastIndex,
      });
      continue;
    }

    if (isToolPart(part)) {
      const toolPart = part as ToolPartInfo;
      const proposal =
        getToolName(toolPart) === "propose_wiki_update"
          ? getWikiProposalOutput(toolPart.output)
          : null;

      if (proposal && toolPart.state === "output-available") {
        if (currentTrace) {
          groups.push(currentTrace);
          currentTrace = null;
        }
        groups.push({
          kind: "wiki-proposal",
          key: toolPart.toolCallId ?? `${message.id}-wiki-proposal-${index}`,
          output: proposal,
        });
        continue;
      }

      if (!currentTrace) {
        currentTrace = {
          kind: "trace",
          key: `${message.id}-trace-${index}`,
          items: [],
        };
      }
      currentTrace.items.push({
        kind: "tool",
        key: toolPart.toolCallId ?? `${message.id}-tool-${index}`,
        part: toolPart,
      });
    }
  }
  if (currentTrace) groups.push(currentTrace);

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group, groupIdx) => {
        if (group.kind === "text") {
          return (
            <AssistantTextPart
              key={group.key}
              text={group.text}
              citationMetadata={citationMetadata}
              projectId={projectId}
              onCitationHighlight={onCitationHighlight}
            />
          );
        }

        if (group.kind === "wiki-proposal") {
          return <WikiProposalCard key={group.key} output={group.output} />;
        }

        if (group.items.length === 0) return null;

        // Auto-collapse this trace once any later group emits prose. The
        // PreResponseWrapper latches the minimized state internally.
        const hasTextAfter = groups
          .slice(groupIdx + 1)
          .some((g) => g.kind === "text" || g.kind === "wiki-proposal");
        const groupIsStreaming = group.items.some((item) =>
          item.kind === "reasoning"
            ? item.isStreaming
            : isRunningToolState(item.part.state)
        );

        return (
          <PreResponseWrapper
            key={group.key}
            stepCount={group.items.length}
            shouldMinimize={hasTextAfter}
            isStreaming={groupIsStreaming}
          >
            {group.items.map((item, i) => {
              const showConnector = i < group.items.length - 1;
              if (item.kind === "reasoning") {
                return (
                  <ReasoningRow
                    key={item.key}
                    text={item.text}
                    isStreaming={item.isStreaming}
                    showConnector={showConnector}
                  />
                );
              }
              return (
                <ToolRow
                  key={item.key}
                  part={item.part}
                  showConnector={showConnector}
                />
              );
            })}
          </PreResponseWrapper>
        );
      })}
    </div>
  );
}

/**
 * Synthetic assistant card that fills the gap between "user pressed send"
 * and the first reasoning/tool/text part arriving from the stream. Reuses
 * the same outer shell as a real assistant message so React doesn't have
 * to swap layouts mid-stream — the wrapper visually carries forward into
 * the real `AssistantMessage`'s first `PreResponseWrapper`.
 */
function PendingAssistantCard({ status }: { status: string }) {
  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[52rem]">
        <PreResponseWrapper stepCount={0} shouldMinimize={false} isStreaming>
          <TimelineRow state="running" showConnector={false}>
            <span className="text-foreground/80">{status}</span>
          </TimelineRow>
        </PreResponseWrapper>
      </div>
    </div>
  );
}

function timeOfDayGreetingLabel(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function EmptyState({ userDisplayName }: { userDisplayName: string }) {
  const salutation = timeOfDayGreetingLabel();

  return (
    <div className="flex h-full min-h-[28rem] flex-col items-center justify-center px-4 text-center">
      <style>
        {`
          @keyframes advisor-chat-greeting-rise {
            from {
              opacity: 0;
              transform: translateY(0.5rem);
              filter: blur(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
              filter: blur(0);
            }
          }
          @keyframes advisor-chat-greeting-name {
            from {
              opacity: 0;
              filter: blur(8px);
            }
            to {
              opacity: 1;
              filter: blur(0);
            }
          }
          .advisor-chat-greeting-open {
            animation: advisor-chat-greeting-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          .advisor-chat-greeting-name-line {
            animation: advisor-chat-greeting-name 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.18s both;
          }
          @media (prefers-reduced-motion: reduce) {
            .advisor-chat-greeting-open,
            .advisor-chat-greeting-name-line {
              animation: none !important;
              opacity: 1 !important;
              transform: none !important;
              filter: none !important;
            }
          }
        `}
      </style>
      <div className="max-w-4xl px-2">
        <h2 className="font-heading text-[clamp(1.875rem,4.5vmin,3rem)] font-medium leading-snug tracking-tight text-balance">
          <span className="advisor-chat-greeting-open inline-block text-foreground/90">
            {salutation},
          </span>{" "}
          <span className="advisor-chat-greeting-name-line inline-block text-foreground">
            {userDisplayName}
          </span>
        </h2>
      </div>
    </div>
  );
}

export type ConversationSummary = ProjectConversationListItem;

export function ChatPanel({
  projectId,
  chatId,
  initialMessages = [],
  userGreetingName,
}: {
  projectId: string;
  chatId?: string;
  initialMessages?: UIMessage[];
  conversations?: ConversationSummary[];
  userGreetingName: string;
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [hoveredRailCitationKey, setHoveredRailCitationKey] = useState<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolledRef = useRef(false);
  const isScrollingToBottomRef = useRef(false);
  const scrollSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldStickToBottomRef = useRef(true);

  const stableChatId = chatId ?? `${projectId}-new`;
  const [railState, setRailState] = useState<{
    chatKey: string;
    collapsed: boolean;
    citationCount: number | null;
  }>({
    chatKey: stableChatId,
    collapsed: true,
    citationCount: null,
  });
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

  const railData = useMemo(
    () => buildRailData(messages),
    [messages]
  );
  const citationCount = railData.citations.length;
  const citationRailVisible = citationCount > 0;

  if (railState.chatKey !== stableChatId || railState.citationCount !== citationCount) {
    const sameChat = railState.chatKey === stableChatId;
    const nextCollapsed =
      sameChat && railState.citationCount !== null && citationCount > railState.citationCount
        ? false
        : sameChat
          ? railState.collapsed
          : true;
    setRailState({
      chatKey: stableChatId,
      collapsed: nextCollapsed,
      citationCount,
    });
  }

  const railCollapsed = railState.chatKey === stableChatId ? railState.collapsed : true;
  const setRailCollapsed = useCallback((next: boolean | ((current: boolean) => boolean)) => {
    setRailState((current) => ({
      ...current,
      collapsed: typeof next === "function" ? next(current.collapsed) : next,
    }));
  }, []);

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
        "-m-4 grid h-svh grid-cols-1 gap-0 bg-background",
        !citationRailVisible
          ? "xl:grid-cols-[minmax(0,1fr)]"
          : railCollapsed
            ? "xl:grid-cols-[minmax(0,1fr)_auto]"
            : "xl:grid-cols-[minmax(0,1fr)_19rem]"
      )}
    >
      <div className="flex min-h-0 flex-col overflow-hidden bg-background">
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
            {messages.length === 0 ? (
              <EmptyState userDisplayName={userGreetingName} />
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
                            ? "max-w-[min(38rem,88%)] rounded-xl bg-blue-600 px-3.5 py-2.5 text-white shadow-[var(--shadow-1)]"
                            : "w-full max-w-[52rem]"
                        )}
                      >
                        {message.role === "user" ? (
                          <p className="whitespace-pre-wrap text-sm leading-7 text-white">{userText}</p>
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
                  <PendingAssistantCard status={streamingStatus} />
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
                <InputGroupButton
                  type="submit"
                  variant="default"
                  size="icon-sm"
                  disabled={isBusy || !input.trim()}
                  className="ml-auto rounded-lg"
                  aria-label={isBusy ? "Morgan is working" : "Send message"}
                >
                  <SendHorizontal className="size-4" />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </form>
        </div>
      </div>

      {citationRailVisible ? (
        <ChatRail
          projectId={projectId}
          citations={railData.citations}
          memoryDrafts={railData.memoryDrafts}
          facts={railData.facts}
          collapsed={railCollapsed}
          onToggle={() => setRailCollapsed((value) => !value)}
          highlightedCitationKey={hoveredRailCitationKey}
        />
      ) : null}
    </section>
  );
}
