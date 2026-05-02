import "server-only";

import { generateText, stepCountIs } from "ai";
import { openai, type OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ProjectSettings } from "@/lib/types";
import { editProjectFile } from "@/lib/server/project-files";
import {
  buildLibrarianTools,
  type LibrarianMode,
  type LibrarianRunRecord,
  type LibrarianToolContextInput,
} from "@/lib/server/agent-tools";

const LIBRARIAN_MODEL = "gpt-5.4";
const LIBRARIAN_STEP_BUDGET = 40;
const LOG_FILE_PATH = "log.md";

export type LibrarianTrigger =
  | {
      type: "source_ingested";
      sourceId: string;
      sourceTitle: string;
      sourceSummary: string | null;
      sourceExcerpt: string;
    }
  | {
      type: "conversation_ended";
      conversationId: string;
      conversationTitle: string;
      transcript: string;
    }
  | {
      type: "wiki_lint";
      userFocus?: string;
    };

type TriggerTypeName = LibrarianTrigger["type"];

export type LibrarianRunResult = {
  runId: string;
  mode: LibrarianMode;
  status: "succeeded" | "failed" | "skipped";
  summary: string | null;
  actions: LibrarianRunRecord["actions"];
  suggestions: LibrarianRunRecord["suggestions"];
  error?: string;
};

export async function runLibrarian({
  projectId,
  userId,
  trigger,
}: {
  projectId: string;
  userId: string;
  trigger: LibrarianTrigger;
}): Promise<LibrarianRunResult> {
  const admin = createSupabaseAdminClient();

  const { data: settings } = await admin
    .from("project_settings")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  const projectSettings = settings as ProjectSettings | null;
  const mode = resolveMode(trigger.type, projectSettings);

  const { data: runRow, error: runError } = await admin
    .from("librarian_runs")
    .insert({
      project_id: projectId,
      trigger_type: trigger.type,
      trigger_ref: extractTriggerRef(trigger),
      mode,
      status: "running",
      actor_id: userId,
    })
    .select("id")
    .single();

  if (runError || !runRow) {
    console.error("Failed to create librarian_run", runError);
    return {
      runId: "",
      mode,
      status: "failed",
      summary: null,
      actions: [],
      suggestions: [],
      error: runError?.message ?? "Failed to create librarian run",
    };
  }

  const runId = runRow.id;
  const record: LibrarianRunRecord = { actions: [], suggestions: [] };

  const toolCtx: LibrarianToolContextInput = {
    projectId,
    userId,
    runId,
    mode,
    canCreateEntityPages: projectSettings?.auto_create_entity_pages ?? true,
  };

  const [{ data: indexFile }, { data: logFile }, { data: glossaryFile }] = await Promise.all([
    admin
      .from("project_files")
      .select("content")
      .eq("project_id", projectId)
      .eq("path", "index.md")
      .is("deleted_at", null)
      .maybeSingle(),
    admin
      .from("project_files")
      .select("content")
      .eq("project_id", projectId)
      .eq("path", LOG_FILE_PATH)
      .is("deleted_at", null)
      .maybeSingle(),
    admin
      .from("project_files")
      .select("content")
      .eq("project_id", projectId)
      .eq("path", "glossary.md")
      .is("deleted_at", null)
      .maybeSingle(),
  ]);

  const systemPrompt = buildLibrarianSystemPrompt({
    trigger,
    settings: projectSettings,
    indexContent: indexFile?.content ?? "",
    logTail: tailLog(logFile?.content ?? ""),
    glossaryContent: glossaryFile?.content ?? "",
    mode,
  });

  const userPrompt = buildLibrarianUserPrompt(trigger);

  try {
    const tools = buildLibrarianTools(toolCtx, record);

    const result = await generateText({
      model: openai(LIBRARIAN_MODEL),
      system: systemPrompt,
      prompt: userPrompt,
      tools,
      stopWhen: stepCountIs(LIBRARIAN_STEP_BUDGET),
      providerOptions: {
        openai: {
          reasoningEffort: "medium",
          reasoningSummary: "auto",
        } satisfies OpenAILanguageModelResponsesOptions,
      },
    });

    const finalText = result.text?.trim() ?? "";
    const summary = summariseRun(trigger, record, finalText);
    const activityPayload = buildRunActivityPayload(record);

    if (mode === "write") {
      await appendLogEntry({
        projectId,
        userId,
        trigger,
        record,
        summary,
      });
    }

    await admin
      .from("librarian_runs")
      .update({
        status: "succeeded",
        summary,
        action_count: activityPayload.actionCount,
        suggestion_count: activityPayload.suggestionCount,
        actions: activityPayload.actions,
        suggestions: activityPayload.suggestions,
        files_touched: activityPayload.filesTouched,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);

    await admin.from("activity_events").insert({
      project_id: projectId,
      event_type: "librarian_run_finished",
      summary,
      actor_id: userId,
      target_type: "librarian_run",
      target_id: runId,
      metadata: {
        run_id: runId,
        trigger_type: trigger.type,
        mode,
        status: "succeeded",
        action_count: activityPayload.actionCount,
        suggestion_count: activityPayload.suggestionCount,
        files_touched: activityPayload.filesTouched,
      },
    });

    return {
      runId,
      mode,
      status: "succeeded",
      summary,
      actions: record.actions,
      suggestions: record.suggestions,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const activityPayload = buildRunActivityPayload(record);
    const failureSummary = `Librarian ${runTriggerLabel(trigger)} failed: ${errorMessage}`;
    console.error("Librarian run failed", { runId, error: errorMessage });

    await admin
      .from("librarian_runs")
      .update({
        status: "failed",
        summary: failureSummary,
        error: errorMessage,
        action_count: activityPayload.actionCount,
        suggestion_count: activityPayload.suggestionCount,
        actions: activityPayload.actions,
        suggestions: activityPayload.suggestions,
        files_touched: activityPayload.filesTouched,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);

    await admin.from("activity_events").insert({
      project_id: projectId,
      event_type: "librarian_run_failed",
      summary: failureSummary,
      actor_id: userId,
      target_type: "librarian_run",
      target_id: runId,
      metadata: {
        run_id: runId,
        trigger_type: trigger.type,
        mode,
        status: "failed",
        action_count: activityPayload.actionCount,
        suggestion_count: activityPayload.suggestionCount,
        files_touched: activityPayload.filesTouched,
      },
    });

    return {
      runId,
      mode,
      status: "failed",
      summary: failureSummary,
      actions: record.actions,
      suggestions: record.suggestions,
      error: errorMessage,
    };
  }
}

function resolveMode(
  triggerType: TriggerTypeName,
  settings: ProjectSettings | null,
): LibrarianMode {
  if (triggerType === "wiki_lint") return "write";
  if (settings?.proactivity === "reactive") return "proposal";
  if (triggerType === "source_ingested" && settings && !settings.auto_synthesize_on_ingest) {
    return "proposal";
  }
  return "write";
}

function extractTriggerRef(trigger: LibrarianTrigger): string | null {
  if (trigger.type === "source_ingested") return trigger.sourceId;
  if (trigger.type === "conversation_ended") return trigger.conversationId;
  return null;
}

function tailLog(content: string, maxChars = 4000): string {
  if (content.length <= maxChars) return content;
  return "…\n" + content.slice(-maxChars);
}

function buildLibrarianSystemPrompt({
  trigger,
  settings,
  indexContent,
  logTail,
  glossaryContent,
  mode,
}: {
  trigger: LibrarianTrigger;
  settings: ProjectSettings | null;
  indexContent: string;
  logTail: string;
  glossaryContent: string;
  mode: LibrarianMode;
}): string {
  const parts: string[] = [];

  parts.push(
    [
      "You are the Librarian: a background agent that owns the wiki layer of an AI project advisor.",
      "You are NOT a chat agent. Each run is a single autonomous turn where you read enough of the wiki to understand context, then use file tools to make the wiki richer, more current, and more consistent.",
      "",
      "Operating principles:",
      "- The user never sees your tool calls, only the final state of the wiki and a short summary.",
      "- Always read index.md first, then any files relevant to the trigger, before making changes.",
      "- Prefer surgical updates to existing pages over creating many new ones, but DO create entity pages (e.g. stakeholders/<name>.md) when an entity accumulates real context.",
      "- Cross-reference pages using plain markdown links with the exact file path (e.g. [decisions.md](decisions.md), [stakeholders/samsung-design-team.md](stakeholders/samsung-design-team.md)).",
      "- Keep index.md current: when you create, rename, or delete a file, update its entry in index.md.",
      "- Never duplicate memory entries — one entry per run in memory/YYYY-MM-DD.md is enough.",
      "- Be terse and factual. This is a knowledge base, not marketing copy.",
    ].join("\n"),
  );

  parts.push(`# Mode\n${mode === "write" ? "write — your edits are applied directly." : "proposal — tools will record intent but skip writes. Still call the tools you would have called; the system will surface them as proposals to the user."}`);

  if (settings) {
    parts.push(serialiseSettingsForLibrarian(settings));
  }

  if (glossaryContent) {
    parts.push(`# Glossary (for term consistency)\n${glossaryContent}`);
  }

  parts.push(
    indexContent
      ? `# Current index.md\n${indexContent}`
      : "# Current index.md\n(missing — create it if needed)",
  );

  if (logTail) {
    parts.push(`# Recent log.md (tail)\n${logTail}`);
  }

  parts.push(
    [
      "# Tools",
      "- list_files — inventory of live project files with metadata",
      "- read_file — read a file by path",
      "- create_file — create a new file (fails if one exists at the path)",
      "- edit_file — overwrite a file's content (requires confirm_source_of_truth: true for is_source_of_truth files)",
      "- rename_file — move a file from one path to another",
      "- delete_file — soft-delete a file (never touches locked or source-of-truth files)",
      "- search_sources / read_source — consult raw ingested sources",
      "- record_suggestion — record a forward-looking question-to-investigate / source-to-find / fix for the user (use ONLY for lint runs; never for file changes)",
      "- trigger_wiki_lint — only works from chat; during Librarian runs this tool returns an error — ignore it and continue",
      "",
      "Every edit/create/delete/rename requires a short `reason` arg. After you finish, return a one-paragraph summary of what you did (no lists, no preamble). Do not call record_suggestion outside of wiki_lint runs.",
    ].join("\n"),
  );

  parts.push(`# Trigger\n${describeTrigger(trigger)}`);

  return parts.join("\n\n");
}

function serialiseSettingsForLibrarian(settings: ProjectSettings): string {
  const lines = [
    "# Project Settings",
    `- Tone: ${settings.tone}`,
    `- Verbosity: ${settings.verbosity}`,
    `- Proactivity: ${settings.proactivity}`,
    `- Auto-synthesize on ingest: ${settings.auto_synthesize_on_ingest ? "yes" : "no"}`,
    `- Auto-create entity pages: ${settings.auto_create_entity_pages ? "yes" : "no"}`,
  ];
  if (settings.client_name) lines.push(`- Client: ${settings.client_name}`);
  if (settings.team_name) lines.push(`- Team: ${settings.team_name}`);
  if (settings.project_phase) lines.push(`- Phase: ${settings.project_phase}`);
  if (settings.additional_context) lines.push(`- Additional context: ${settings.additional_context}`);
  return lines.join("\n");
}

function describeTrigger(trigger: LibrarianTrigger): string {
  switch (trigger.type) {
    case "source_ingested":
      return [
        "Type: source_ingested",
        `Source title: ${trigger.sourceTitle}`,
        trigger.sourceSummary ? `Source summary: ${trigger.sourceSummary}` : null,
        "",
        "Your job: integrate this source into the wiki. Touch every page that should reflect this new information — PROJECT.md, WORK.md, PRODUCT.md, decisions.md, stakeholders/*, and any topic pages. Create new entity pages when warranted. Update index.md. Append a concise entry to today's memory file at `memory/YYYY-MM-DD.md` (today is " +
          today() +
          ").",
        "",
        "Source excerpt (first part of parsed content):",
        "```",
        trigger.sourceExcerpt,
        "```",
      ]
        .filter(Boolean)
        .join("\n");
    case "conversation_ended":
      return [
        "Type: conversation_ended",
        `Conversation title: ${trigger.conversationTitle}`,
        "",
        "Your job: decide what, if anything, this conversation contributes to the wiki. At minimum, append a concise session-notes entry to today's memory file at `memory/YYYY-MM-DD.md` (today is " +
          today() +
          "). If the conversation produced a genuinely reusable synthesis (a comparison, an analysis, a profile, a decision with rationale), ALSO promote it into a first-class wiki page under a logical prefix (analyses/, stakeholders/, or an existing topic page). Do not promote trivial or exploratory chats.",
        "",
        "Conversation transcript:",
        "```",
        trigger.transcript,
        "```",
      ].join("\n");
    case "wiki_lint":
      return [
        "Type: wiki_lint",
        trigger.userFocus
          ? [
              "",
              "User focus:",
              trigger.userFocus,
              "",
              "The focus may be exploratory (e.g. a folder or topic to check) or it may state **project facts** (e.g. two stakeholder pages are the same person, a spelling, a preferred canonical name, or “merge these”). When it asserts facts about the project, treat that as **trusted owner input for this run** and reconcile the wiki: pick a canonical path, merge substantive content, turn the other path into a short alias stub linking to canonical, update index.md and inbound links. Do **not** refuse to merge or canonicalize solely because ingested sources or existing pages never spelled out that fact — the user just did.",
            ].join("\n")
          : null,
        "",
        "Your job: perform a wiki health check. Look for:",
        "- Stale content (outdated dates, deadlines, statuses)",
        "- Contradictions between files",
        "- Orphan pages (no inbound links from other pages)",
        "- Missing entity pages (entities mentioned often but lacking their own page)",
        "- Index gaps (files missing from index.md, or index entries for files that no longer exist)",
        "",
        "Apply direct fixes where safe (updating index.md, fixing obvious stale references, filing orphans under a topic page).",
        "For exploratory passes (no factual correction in focus), use record_suggestion for open questions that need new sources or owner judgment instead of guessing.",
        "If you fully reconciled the wiki per an explicit correction in the user focus, you do not need record_suggestion just to meet a quota.",
        "Otherwise record at least one suggestion per lint run unless the wiki is genuinely pristine after your fixes.",
      ]
        .filter((part): part is string => part != null)
        .join("\n");
    default: {
      const _exhaustive: never = trigger;
      return String(_exhaustive);
    }
  }
}

function buildLibrarianUserPrompt(trigger: LibrarianTrigger): string {
  switch (trigger.type) {
    case "source_ingested":
      return `Integrate the newly ingested source "${trigger.sourceTitle}" into the wiki now.`;
    case "conversation_ended":
      return `The conversation "${trigger.conversationTitle}" just finished. Decide what (if anything) to file back into the wiki, and always append today's session notes to memory/${today()}.md.`;
    case "wiki_lint":
      return trigger.userFocus
        ? `Run a focused wiki lint pass. If the focus states factual corrections (same person, duplicates to merge, canonical naming), apply those first, then continue with the health check. Focus: ${trigger.userFocus}.`
        : `Run a full wiki lint pass now.`;
  }
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function summariseRun(
  trigger: LibrarianTrigger,
  record: LibrarianRunRecord,
  finalText: string,
): string {
  const counts = record.actions.reduce(
    (acc, action) => {
      acc[action.action] = (acc[action.action] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const pieces: string[] = [];
  for (const key of ["create", "edit", "rename", "delete"] as const) {
    if (counts[key]) pieces.push(`${counts[key]} ${key}${counts[key] === 1 ? "" : "s"}`);
  }
  if (record.suggestions.length) {
    pieces.push(`${record.suggestions.length} suggestion${record.suggestions.length === 1 ? "" : "s"}`);
  }

  const statsSummary = pieces.length ? pieces.join(", ") : "no changes";
  return finalText
    ? `Librarian ${runTriggerLabel(trigger)}: ${statsSummary}. ${finalText}`
    : `Librarian ${runTriggerLabel(trigger)}: ${statsSummary}.`;
}

function runTriggerLabel(trigger: LibrarianTrigger): string {
  if (trigger.type === "source_ingested") return `ingest(${trigger.sourceTitle})`;
  if (trigger.type === "conversation_ended") return `chat(${trigger.conversationTitle})`;
  return "lint";
}

function buildRunActivityPayload(record: LibrarianRunRecord) {
  const filesTouched = new Set<string>();

  for (const action of record.actions) {
    filesTouched.add(action.path);

    if (
      action.action === "rename" &&
      action.details &&
      typeof action.details.from === "string"
    ) {
      filesTouched.add(action.details.from);
    }
  }

  return {
    actionCount: record.actions.length,
    suggestionCount: record.suggestions.length,
    actions: record.actions,
    suggestions: record.suggestions,
    filesTouched: [...filesTouched].sort((left, right) => left.localeCompare(right)),
  };
}

async function appendLogEntry({
  projectId,
  userId,
  trigger,
  record,
  summary,
}: {
  projectId: string;
  userId: string;
  trigger: LibrarianTrigger;
  record: LibrarianRunRecord;
  summary: string;
}) {
  if (record.actions.length === 0 && record.suggestions.length === 0) return;

  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("project_files")
    .select("content")
    .eq("project_id", projectId)
    .eq("path", LOG_FILE_PATH)
    .is("deleted_at", null)
    .maybeSingle();

  const now = new Date();
  const timestamp = now.toISOString().replace("T", " ").slice(0, 16);
  const triggerLabel =
    trigger.type === "source_ingested"
      ? `ingest | ${trigger.sourceTitle}`
      : trigger.type === "conversation_ended"
        ? `chat | ${trigger.conversationTitle}`
        : "lint | user-requested";

  const actionLines = record.actions.map((a) => {
    const extra =
      a.action === "rename" && a.details && "from" in a.details
        ? ` (from ${String((a.details as { from?: string }).from)})`
        : "";
    return `- ${a.action}: ${a.path}${extra}`;
  });
  const suggestionLines = record.suggestions.map(
    (s) => `- suggest[${s.kind}]: ${s.title}`,
  );

  const body = [`## [${timestamp}] ${triggerLabel}`, summary, "", ...actionLines, ...suggestionLines, ""].join(
    "\n",
  );

  const seedHeader = "# Librarian Activity Log\n\nAppend-only record of Librarian runs. Most recent entries are at the bottom.\n\n";
  const nextContent = existing
    ? `${existing.content.trimEnd()}\n\n${body}\n`
    : `${seedHeader}${body}\n`;

  try {
    await editProjectFile({
      projectId,
      path: LOG_FILE_PATH,
      content: nextContent,
      userId,
      createdByAgent: true,
    });
  } catch (err) {
    console.error("Failed to append librarian log entry", err);
  }
}
