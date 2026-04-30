import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Routes that run the Librarian use `maxDuration = 120`; anything still `running` after this is orphaned. */
const STALE_AFTER_MS = 5 * 60 * 1000;

const FAILURE_SUMMARY =
  "Librarian did not finish (host timeout, deployment, or stopped dev server). The run was marked failed automatically.";
const FAILURE_ERROR = "interrupted_or_timeout";

/**
 * Marks long-running librarian_runs rows as failed so Activity does not show RUNNING forever
 * after the serverless worker is killed mid-run.
 */
export async function reconcileStaleLibrarianRuns(projectId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const staleBefore = new Date(Date.now() - STALE_AFTER_MS).toISOString();

  const { error } = await admin
    .from("librarian_runs")
    .update({
      status: "failed",
      summary: FAILURE_SUMMARY,
      error: FAILURE_ERROR,
      finished_at: new Date().toISOString(),
    })
    .eq("project_id", projectId)
    .eq("status", "running")
    .lt("started_at", staleBefore);

  if (error) {
    console.error("reconcileStaleLibrarianRuns", error);
  }
}
