import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runLibrarian, type LibrarianRunResult } from "@/lib/server/librarian/agent";
import type { SourceMaterial } from "@/lib/types";

type IngestedSourceType = Exclude<SourceMaterial["type"], "migration">;

/**
 * Run the librarian in response to a newly ingested source. After §3 the only
 * librarian trigger; outputs reviewable pending wiki edits, never direct writes.
 */
export async function triggerOnSourceIngested({
  projectId,
  userId,
  sourceId,
}: {
  projectId: string;
  userId: string;
  sourceId: string;
}): Promise<LibrarianRunResult | null> {
  const admin = createSupabaseAdminClient();
  const { data: source } = await admin
    .from("source_materials")
    .select("id,title,summary,parsed_content,project_id,type")
    .eq("id", sourceId)
    .maybeSingle();

  if (!source || source.project_id !== projectId) {
    return null;
  }
  if (source.type === "migration") {
    return null;
  }

  const excerpt = (source.parsed_content ?? "").slice(0, 8000);

  return runLibrarian({
    projectId,
    userId,
    trigger: {
      type: "source_ingested",
      sourceId: source.id,
      sourceTitle: source.title,
      sourceSummary: source.summary,
      sourceExcerpt: excerpt,
      sourceType: source.type as IngestedSourceType,
    },
  });
}
