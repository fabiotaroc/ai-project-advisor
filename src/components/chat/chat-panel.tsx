"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  ChevronDown,
  Eye,
  EyeOff,
  FilePenLine,
  FileText,
  FolderTree,
  Loader2,
  MessageSquareQuote,
  Search,
  SendHorizontal,
  Sparkles,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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

function getMessageText(message: UIMessage) {
  return message.parts
    .flatMap((part) => (part.type === "text" && part.text ? [part.text] : []))
    .join("\n\n");
}

function isToolPart(part: UIMessage["parts"][number]) {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
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

function FileEditNotification({
  part,
  projectId,
}: {
  part: ToolPartInfo;
  projectId: string;
}) {
  const output = part.output as { path?: string; created?: boolean } | undefined;
  if (!output?.path) return null;

  const isNew = output.created;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
      <FilePenLine className="size-3.5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">
        {isNew ? "Created" : "Updated"}{" "}
        <Link
          href={`/project/${projectId}/files`}
          className="font-medium text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
        >
          {output.path}
        </Link>
      </span>
      {isNew && (
        <Badge variant="secondary" className="text-[10px]">New</Badge>
      )}
    </div>
  );
}

function ToolCallBlock({ part }: { part: ToolPartInfo }) {
  const [open, setOpen] = useState(false);

  const toolName = (part.toolName ?? part.type.replace(/^tool-/, "")) || "tool";
  const meta = TOOL_META[toolName] ?? { label: humanizeToolName(toolName), icon: Wrench };
  const Icon = meta.icon;
  const state = part.state ?? "running";
  const input = part.input ?? {};
  const output = part.output;
  const summary = summarizeToolInput(input);
  const isRunning = state === "input-streaming" || state === "input-available" || state === "running";
  const hasError = state === "output-error";
  const hasOutput = state === "output-available";

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted/35">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border/80 bg-background/90">
          {isRunning ? <Loader2 className="size-3.5 animate-spin text-primary" /> : <Icon className="size-3.5 text-muted-foreground" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-xs text-foreground/75">{toolName}</span>
            <span className="text-sm font-medium text-foreground">{meta.label}</span>
          </div>
          {summary ? <p className="truncate pt-0.5 text-xs text-muted-foreground">{summary}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-[0.18em]",
              isRunning && "border-primary/20 bg-primary/10 text-primary",
              hasOutput && "border-border bg-background text-muted-foreground",
              hasError && "border-destructive/20 bg-destructive/10 text-destructive"
            )}
          >
            {isRunning ? "Running" : hasError ? "Error" : "Done"}
          </span>
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </div>
      </button>
      {open ? (
        <div className="flex flex-col gap-3 border-t border-border/70 px-3 py-3">
          {Object.keys(input).length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Parameters</p>
              <pre className="overflow-x-auto rounded-xl border border-border/70 bg-background px-3 py-2 text-xs whitespace-pre-wrap text-foreground/80">
                {stringifyValue(input)}
              </pre>
            </div>
          ) : null}
          {hasOutput && output !== undefined ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Result</p>
              <pre className="max-h-56 overflow-auto rounded-xl border border-border/70 bg-background px-3 py-2 text-xs whitespace-pre-wrap text-foreground/80">
                {stringifyValue(output)}
              </pre>
            </div>
          ) : null}
          {hasError ? (
            <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {part.errorText ?? "The tool call failed."}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AssistantMessage({
  message,
  showToolCalls,
  projectId,
}: {
  message: UIMessage;
  showToolCalls: boolean;
  projectId: string;
}) {
  const toolParts = message.parts.filter(isToolPart).map((part) => part as ToolPartInfo);

  const editFileParts = toolParts.filter(
    (p) =>
      (p.toolName === "edit_file" || p.type === "tool-edit_file") &&
      p.state === "output-available" &&
      p.output,
  );

  return (
    <div className="flex flex-col gap-3">
      {editFileParts.map((part, index) => (
        <FileEditNotification
          key={part.toolCallId ?? `edit-${index}`}
          part={part}
          projectId={projectId}
        />
      ))}
      {showToolCalls ? toolParts.map((part, index) => <ToolCallBlock key={part.toolCallId ?? `${message.id}-tool-${index}`} part={part} />) : null}
      {!showToolCalls && toolParts.length > 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/25 px-3 py-2 text-xs text-muted-foreground">
          {toolParts.length} tool {toolParts.length === 1 ? "step" : "steps"} hidden
        </div>
      ) : null}
      {message.parts.map((part, index) => {
        if (part.type !== "text" || !part.text) return null;

        return (
          <p key={`${message.id}-text-${index}`} className="whitespace-pre-wrap text-sm leading-7 text-foreground/95">
            {part.text}
          </p>
        );
      })}
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
    <div className="flex h-full min-h-[28rem] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full border border-border/80 bg-background shadow-sm">
        <Sparkles className="size-7 text-primary" />
      </div>
      <div className="max-w-2xl space-y-3">
        <h2 className="font-heading text-3xl tracking-tight text-foreground">Ask the advisor to inspect the project before it answers.</h2>
        <p className="text-sm leading-7 text-muted-foreground">
          It can look through project files, search uploaded source material, and update project documents when you ask for concrete changes.
        </p>
      </div>
      <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <Button
            key={prompt}
            type="button"
            variant="outline"
            className="h-auto justify-start rounded-2xl px-4 py-4 text-left whitespace-normal"
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

export type ConversationSummary = {
  id: string;
  title: string;
  created_at: string;
};

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
  const [showToolCalls, setShowToolCalls] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const stableChatId = chatId ?? `${projectId}-new`;

  const { messages, sendMessage, status, error } = useChat({
    id: stableChatId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { projectId, conversationId: chatId },
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onFinish: () => {
      router.refresh();
    },
  });

  const isBusy = status === "submitted" || status === "streaming";

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const viewport = scrollRef.current;
    if (!viewport) return;

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior,
    });
  }, []);

  useEffect(() => {
    scrollToBottom(messages.length > 0 ? "smooth" : "auto");
  }, [messages, status, scrollToBottom]);

  const submitText = useCallback(
    async (value: string) => {
      const text = value.trim();
      if (!text || isBusy) return;

      setInput("");

      try {
        await sendMessage({ text });
      } catch {
        setInput(text);
      }
    },
    [isBusy, sendMessage]
  );

  function startNewConversation() {
    router.push(`/project/${projectId}/chat?new`);
  }

  return (
    <section className="flex h-[calc(100vh-9.5rem)] min-h-[38rem] flex-col">
      <Card className="relative flex h-full min-h-0 border-border/70 bg-card/95 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)] supports-[backdrop-filter]:backdrop-blur">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-linear-to-b from-muted/45 via-muted/10 to-transparent" />
        <CardHeader className="relative !flex flex-row flex-wrap items-center justify-end gap-2 border-b border-border/70 bg-linear-to-br from-background via-background to-muted/40">
          <CardAction className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startNewConversation}
            >
              New chat
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowToolCalls((current) => !current)}
              aria-pressed={showToolCalls}
            >
              {showToolCalls ? <EyeOff data-icon="inline-start" /> : <Eye data-icon="inline-start" />}
              {showToolCalls ? "Hide tools" : "Show tools"}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="relative flex-1 overflow-hidden px-0">
          <div ref={scrollRef} className="flex h-full flex-col gap-6 overflow-y-auto px-5 py-6 sm:px-6">
            {messages.length === 0 ? (
              <EmptyState isBusy={isBusy} onSuggestion={(prompt) => void submitText(prompt)} />
            ) : (
              <>
                {messages.map((message) => {
                  const userText = getMessageText(message);

                  return (
                    <article key={message.id} className={cn("flex flex-col gap-1.5", message.role === "user" ? "items-end" : "items-start")}>
                      <p className="px-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                        {message.role === "user" ? "You" : "Advisor"}
                      </p>
                      <div
                        className={cn(
                          "max-w-[min(42rem,100%)] rounded-[1.75rem] px-4 py-3 shadow-sm",
                          message.role === "user"
                            ? "rounded-br-md bg-primary text-primary-foreground"
                            : "rounded-bl-md border border-border/70 bg-background/95"
                        )}
                      >
                        {message.role === "user" ? (
                          <p className="whitespace-pre-wrap text-sm leading-7 text-primary-foreground">{userText}</p>
                        ) : (
                          <AssistantMessage message={message} showToolCalls={showToolCalls} projectId={projectId} />
                        )}
                      </div>
                    </article>
                  );
                })}
                {isBusy && messages[messages.length - 1]?.role === "user" ? (
                  <div className="flex flex-col items-start gap-1.5">
                    <p className="px-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Advisor</p>
                    <div className="max-w-[min(24rem,100%)] rounded-[1.75rem] rounded-bl-md border border-border/70 bg-background/95 px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin text-primary" />
                        Reviewing the project context...
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3 border-t border-border/70 bg-background/90 supports-[backdrop-filter]:bg-background/75 supports-[backdrop-filter]:backdrop-blur">
          {error ? (
            <div className="rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Chat failed: {error.message}
            </div>
          ) : null}
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submitText(input);
            }}
          >
            <div className="rounded-[1.5rem] border border-border/80 bg-card px-4 py-3 shadow-sm">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submitText(input);
                  }
                }}
                rows={3}
                placeholder="Ask about project direction, source findings, or specific file changes..."
                className="min-h-[88px] resize-none border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0"
              />
              <div className="mt-3 flex flex-col gap-3 border-t border-border/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">Press Enter to send. Use Shift+Enter for a new line.</p>
                <Button type="submit" disabled={isBusy || !input.trim()}>
                  {isBusy ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <SendHorizontal data-icon="inline-start" />}
                  {isBusy ? "Thinking" : "Send"}
                </Button>
              </div>
            </div>
          </form>
        </CardFooter>
      </Card>
    </section>
  );
}
