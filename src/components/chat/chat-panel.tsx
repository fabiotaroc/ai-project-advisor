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
  FilePenLine,
  FileText,
  FolderTree,
  Loader2,
  MessageSquareQuote,
  Search,
  SendHorizontal,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
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

  const [open, setOpen] = useState(isRunning);
  useEffect(() => {
    setOpen(isRunning);
  }, [isRunning]);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="group flex w-full items-center gap-2 py-1 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        {isRunning ? (
          <Loader2 className="size-3 shrink-0 animate-spin text-primary" />
        ) : hasError ? (
          <Icon className="size-3 shrink-0 text-destructive" />
        ) : (
          <Icon className="size-3 shrink-0" />
        )}
        <span className="font-mono text-[11px] text-foreground/70">{toolName}</span>
        {summary ? (
          <span className="min-w-0 truncate text-[11px] text-muted-foreground/80">· {summary}</span>
        ) : null}
        <ChevronDown
          className={cn(
            "ml-auto size-3 shrink-0 opacity-0 transition-all group-hover:opacity-60",
            open && "rotate-180 opacity-60"
          )}
        />
      </button>
      {open ? (
        <div className="mt-1 flex flex-col gap-2 border-l border-border/60 pl-3">
          {Object.keys(input).length > 0 ? (
            <pre className="overflow-x-auto rounded-md bg-muted/40 px-2 py-1.5 text-[11px] whitespace-pre-wrap text-foreground/75">
              {stringifyValue(input)}
            </pre>
          ) : null}
          {hasOutput && output !== undefined ? (
            <pre className="max-h-48 overflow-auto rounded-md bg-muted/40 px-2 py-1.5 text-[11px] whitespace-pre-wrap text-foreground/75">
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
  const [open, setOpen] = useState(isStreaming);
  useEffect(() => {
    setOpen(isStreaming);
  }, [isStreaming]);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="group flex w-full items-center gap-2 py-1 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        {isStreaming ? (
          <Loader2 className="size-3 shrink-0 animate-spin text-primary" />
        ) : (
          <Brain className="size-3 shrink-0" />
        )}
        <span className="font-mono text-[11px] text-foreground/70">
          {isStreaming ? "thinking..." : "thought"}
        </span>
        <ChevronDown
          className={cn(
            "ml-auto size-3 shrink-0 opacity-0 transition-all group-hover:opacity-60",
            open && "rotate-180 opacity-60"
          )}
        />
      </button>
      {open ? (
        <pre className="mt-1 max-h-56 overflow-auto border-l border-border/60 pl-3 text-[11px] leading-5 whitespace-pre-wrap text-foreground/75">
          {text}
        </pre>
      ) : null}
    </div>
  );
}

function AssistantMessage({
  message,
  isStreaming,
  projectId,
}: {
  message: UIMessage;
  isStreaming: boolean;
  projectId: string;
}) {
  const editFileParts = message.parts
    .filter(isToolPart)
    .map((part) => part as ToolPartInfo)
    .filter(
      (p) =>
        (p.toolName === "edit_file" || p.type === "tool-edit_file") &&
        p.state === "output-available" &&
        p.output,
    );

  const sequentialNodes = message.parts.map((part, index) => {
    if (isReasoningPart(part)) {
      const text = (part.text ?? "").trim();
      if (!text) return null;
      const isLastPart = index === message.parts.length - 1;
      return (
        <ReasoningBlock
          key={`${message.id}-reasoning-${index}`}
          text={text}
          isStreaming={isStreaming && isLastPart}
        />
      );
    }

    if (isToolPart(part)) {
      const toolPart = part as ToolPartInfo;
      return (
        <ToolCallBlock
          key={toolPart.toolCallId ?? `${message.id}-tool-${index}`}
          part={toolPart}
        />
      );
    }

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
            components={{
              a: ({ node, ...props }) => {
                void node;
                return <a {...props} rel="noreferrer" target="_blank" />;
              },
            }}
          >
            {part.text}
          </ReactMarkdown>
        </div>
      );
    }

    return null;
  });

  return (
    <div className="flex flex-col gap-2">
      {editFileParts.map((part, index) => (
        <FileEditNotification
          key={part.toolCallId ?? `edit-${index}`}
          part={part}
          projectId={projectId}
        />
      ))}
      {sequentialNodes}
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
      <div className="max-w-2xl space-y-3">
        <h2 className="font-heading text-3xl tracking-tight text-foreground">Ask anything about the project</h2>
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
  const scrollRef = useRef<HTMLDivElement>(null);

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

  return (
    <section className="flex h-[calc(100vh-9.5rem)] min-h-[38rem] flex-col">
      <Card className="relative flex h-full min-h-0 border-border/70 bg-card/95 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)] supports-[backdrop-filter]:backdrop-blur">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-linear-to-b from-muted/45 via-muted/10 to-transparent" />
        <CardContent className="relative flex-1 overflow-hidden px-0 pt-0">
          <div ref={scrollRef} className="flex h-full flex-col gap-6 overflow-y-auto px-5 py-6 sm:px-6">
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
                    <article key={message.id} className={cn("flex flex-col gap-1.5", message.role === "user" ? "items-end" : "items-start")}>
                      <div
                        className={cn(
                          "rounded-[1.75rem] px-4 py-3 shadow-sm",
                          message.role === "user"
                            ? "max-w-[min(42rem,100%)] rounded-br-md bg-primary text-primary-foreground"
                            : "max-w-[min(42rem,100%)] rounded-bl-md border border-border/70 bg-background/95"
                        )}
                      >
                        {message.role === "user" ? (
                          <p className="whitespace-pre-wrap text-sm leading-7 text-primary-foreground">{userText}</p>
                        ) : (
                          <AssistantMessage
                            message={message}
                            isStreaming={isStreamingAssistantMessage}
                            projectId={projectId}
                          />
                        )}
                      </div>
                    </article>
                  );
                })}
                {isBusy && messages[messages.length - 1]?.role === "user" ? (
                  <div className="flex flex-col items-start gap-1.5">
                    <p className="px-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Advisor</p>
                    <div className="max-w-[min(42rem,100%)] rounded-[1.75rem] rounded-bl-md border border-border/70 bg-background/95 px-4 py-3 shadow-sm">
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
            onSubmit={(event) => {
              event.preventDefault();
              void submitText(input);
            }}
          >
            <InputGroup className="rounded-3xl border-border/80 bg-card px-2 py-1.5 shadow-sm transition-shadow focus-within:shadow-md">
              <InputGroupTextarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submitText(input);
                  }
                }}
                rows={3}
                placeholder="Ask anything about the project..."
                className="min-h-[72px] px-3 py-2 text-sm leading-6 placeholder:text-muted-foreground/70"
              />
              <InputGroupAddon align="block-end" className="px-2 pb-1.5">
                <span className="text-[11px] text-muted-foreground/70">
                  <kbd className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    Enter
                  </kbd>{" "}
                  to send ·{" "}
                  <kbd className="rounded border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    Shift + Enter
                  </kbd>{" "}
                  for newline
                </span>
                <InputGroupButton
                  type="submit"
                  variant="default"
                  size="icon-sm"
                  disabled={isBusy || !input.trim()}
                  className="ml-auto rounded-full"
                  aria-label={isBusy ? "Thinking" : "Send message"}
                >
                  {isBusy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <SendHorizontal className="size-4" />
                  )}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </form>
        </CardFooter>
      </Card>
    </section>
  );
}
