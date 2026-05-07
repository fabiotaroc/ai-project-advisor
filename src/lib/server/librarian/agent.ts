import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { extractPendingEditsFromSource } from "@/lib/server/librarian/extract-pending-edits";

export type LibrarianTrigger = {
  type: "source_ingested";
  sourceId: string;
  sourceTitle: string;
  sourceSummary: string | null;
  sourceExcerpt: string;
  sourceType: "document" | "email" | "meeting" | "note";
};

export type LibrarianRunResult = {
  runId: string;
  status: "succeeded" | "failed" | "skipped";
  summary: string | null;
  pendingEditsByDoc: Record<string, number>;
  totalPendingEdits: number;
  error?: string;
};

/**
 * Runs the librarian for a single trigger. After §3 the librarian's only job is
 * to extract reviewable pending wiki edits from a newly ingested source.
 */
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

  const { data: runRow, error: runError } = await admin
    .from("librarian_runs")
    .insert({
      project_id: projectId,
      trigger_type: trigger.type,
      trigger_ref: trigger.sourceId,
      mode: "write",
      status: "running",
      actor_id: userId,
    })
    .select("id")
    .single();

  if (runError || !runRow) {
    console.error("Failed to create librarian_run", runError);
    return {
      runId: "",
      status: "failed",
      summary: null,
      pendingEditsByDoc: {},
      totalPendingEdits: 0,
      error: runError?.message ?? "Failed to create librarian run",
    };
  }

  const runId = runRow.id;

  try {
    const { pendingEdits, countsByDocSlug } = await extractPendingEditsFromSource({
      projectId,
      userId,
      sourceId: trigger.sourceId,
      sourceTitle: trigger.sourceTitle,
      sourceSummary: trigger.sourceSummary,
      sourceExcerpt: trigger.sourceExcerpt,
      sourceType: trigger.sourceType,
    });

    const total = pendingEdits.length;
    const summary = total
      ? `Extracted ${total} pending edit${total === 1 ? "" : "s"} from "${trigger.sourceTitle}".`
      : `No pending edits extracted from "${trigger.sourceTitle}".`;

    await admin
      .from("librarian_runs")
      .update({
        status: "succeeded",
        summary,
        action_count: total,
        suggestion_count: 0,
        actions: [],
        suggestions: [],
        files_touched: [],
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);

    if (total > 0) {
      await admin.from("activity_events").insert({
        project_id: projectId,
        event_type: "librarian_pending_edits_extracted",
        summary,
        actor_id: userId,
        target_type: "source_material",
        target_id: trigger.sourceId,
        metadata: {
          run_id: runId,
          source_id: trigger.sourceId,
          counts_by_doc_slug: countsByDocSlug,
          total,
        },
      });
    }

    return {
      runId,
      status: "succeeded",
      summary,
      pendingEditsByDoc: countsByDocSlug,
      totalPendingEdits: total,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const failureSummary = `Librarian extraction for "${trigger.sourceTitle}" failed: ${errorMessage}`;
    console.error("Librarian run failed", { runId, error: errorMessage });

    await admin
      .from("librarian_runs")
      .update({
        status: "failed",
        summary: failureSummary,
        error: errorMessage,
        action_count: 0,
        suggestion_count: 0,
        actions: [],
        suggestions: [],
        files_touched: [],
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
        status: "failed",
      },
    });

    return {
      runId,
      status: "failed",
      summary: failureSummary,
      pendingEditsByDoc: {},
      totalPendingEdits: 0,
      error: errorMessage,
    };
  }
}
