import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { getProjectAccessForUser } from "@/lib/server/data";
import type {
  CanonicalDoc,
  PendingWikiEdit,
  PendingWikiEditGroup,
  PendingWikiEditStatus,
} from "@/lib/types";

type PendingEditRow = Record<string, unknown> & {
  target_doc?: Record<string, unknown> | Record<string, unknown>[] | null;
  source?: Record<string, unknown> | Record<string, unknown>[] | null;
};

type Anchor = {
  heading?: string;
  before?: string;
  after?: string;
};

type ResolveLocation = {
  body: string;
  repositioned: boolean;
  fallbackApplied: boolean;
  locationNote: string;
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function firstObject(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return asObject(value[0]);
  return asObject(value);
}

function mapCanonicalDoc(row: Record<string, unknown>): CanonicalDoc {
  return {
    id: String(row.id),
    project_id: String(row.project_id),
    slug: String(row.slug),
    title: String(row.title),
    body: typeof row.body === "string" ? row.body : "",
    is_default: Boolean(row.is_default),
    is_pinned: Boolean(row.is_pinned),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapPendingEdit(row: PendingEditRow): PendingWikiEdit {
  const targetDoc = firstObject(row.target_doc);
  return {
    id: String(row.id),
    project_id: String(row.project_id),
    target_doc_id: String(row.target_doc_id),
    source_material_id:
      typeof row.source_material_id === "string" ? row.source_material_id : null,
    origin: row.origin === "chat" ? "chat" : "ingestion",
    anchor: asObject(row.anchor) ?? {},
    inserted_text: typeof row.inserted_text === "string" ? row.inserted_text : "",
    deleted_text: typeof row.deleted_text === "string" ? row.deleted_text : null,
    reason: typeof row.reason === "string" ? row.reason : null,
    confidence: typeof row.confidence === "number" ? row.confidence : null,
    status: normalizeStatus(row.status),
    repositioned: Boolean(row.repositioned),
    fallback_applied: Boolean(row.fallback_applied),
    created_by: typeof row.created_by === "string" ? row.created_by : null,
    resolved_by: typeof row.resolved_by === "string" ? row.resolved_by : null,
    created_at: String(row.created_at),
    resolved_at: typeof row.resolved_at === "string" ? row.resolved_at : null,
    target_doc: targetDoc ? mapCanonicalDoc(targetDoc) : null,
  };
}

function normalizeStatus(value: unknown): PendingWikiEditStatus {
  if (value === "accepted" || value === "rejected") return value;
  return "pending";
}

function groupEdits(edits: PendingWikiEdit[]): PendingWikiEditGroup[] {
  const groups = new Map<string, PendingWikiEditGroup>();
  for (const edit of edits) {
    const key = edit.target_doc_id;
    const existing = groups.get(key);
    if (existing) {
      existing.edits.push(edit);
    } else {
      groups.set(key, {
        target_doc: edit.target_doc,
        target_doc_id: edit.target_doc_id,
        edits: [edit],
      });
    }
  }
  return [...groups.values()];
}

export async function listPendingEditsForSource(
  sourceId: string,
): Promise<PendingWikiEditGroup[]> {
  const source = await getSourceForCurrentUser(sourceId);
  if (!source) throw new Error("Source not found.");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("pending_wiki_edits")
    .select(
      [
        "id,project_id,target_doc_id,source_material_id,origin,anchor,inserted_text,deleted_text",
        "reason,confidence,status,repositioned,fallback_applied,created_by,resolved_by,created_at,resolved_at",
        "target_doc:canonical_docs(id,project_id,slug,title,body,is_default,is_pinned,created_at,updated_at)",
      ].join(","),
    )
    .eq("source_material_id", sourceId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return groupEdits(((data ?? []) as unknown as PendingEditRow[]).map(mapPendingEdit));
}

export async function getPendingEditForCurrentUser(editId: string): Promise<PendingWikiEdit> {
  const edit = await getPendingEditForResolve(editId);
  const user = await getOptionalSessionUser();
  if (!user) throw new Error("Unauthorized");

  const access = await getProjectAccessForUser(user.id, edit.project_id);
  if (!access) throw new Error("Forbidden");

  return edit;
}

export async function acceptPendingEdit(editId: string): Promise<PendingWikiEdit> {
  const { userId } = await requireWriteAccessForEdit(editId);
  const edit = await getPendingEditForResolve(editId);
  if (!edit.target_doc) throw new Error("Target canonical doc not found.");
  if (edit.status !== "pending") throw new Error(`Pending edit is already ${edit.status}.`);

  const sourceTitle = await getSourceTitle(edit.source_material_id);
  const insertion = withSourceCitation(edit.inserted_text, sourceTitle, edit.source_material_id);
  const resolved = resolveInsertionLocation(edit.target_doc.body, edit.anchor, insertion);

  await resolvePendingEditRpc({
    editId,
    action: "accept",
    resolvedBy: userId,
    newBody: resolved.body,
    repositioned: resolved.repositioned,
    fallbackApplied: resolved.fallbackApplied,
    locationNote: resolved.locationNote,
  });

  return getPendingEditForResolve(editId);
}

export async function rejectPendingEdit(editId: string): Promise<PendingWikiEdit> {
  const { userId } = await requireWriteAccessForEdit(editId);
  const edit = await getPendingEditForResolve(editId);
  if (edit.status !== "pending") throw new Error(`Pending edit is already ${edit.status}.`);

  await resolvePendingEditRpc({
    editId,
    action: "reject",
    resolvedBy: userId,
    newBody: null,
    repositioned: false,
    fallbackApplied: false,
    locationNote: null,
  });

  return getPendingEditForResolve(editId);
}

export async function bulkResolveEditsForSource(
  sourceId: string,
  action: "accept" | "reject",
): Promise<{ results: PendingWikiEdit[]; errors: { editId: string; error: string }[] }> {
  const groups = await listPendingEditsForSource(sourceId);
  const pending = groups.flatMap((group) => group.edits).filter((edit) => edit.status === "pending");
  const results: PendingWikiEdit[] = [];
  const errors: { editId: string; error: string }[] = [];

  for (const edit of pending) {
    try {
      results.push(
        action === "accept"
          ? await acceptPendingEdit(edit.id)
          : await rejectPendingEdit(edit.id),
      );
    } catch (err) {
      errors.push({
        editId: edit.id,
        error: err instanceof Error ? err.message : "Failed to resolve pending edit.",
      });
    }
  }

  return { results, errors };
}

export async function updateChatPendingEditDraft({
  editId,
  insertedText,
  targetDocId,
}: {
  editId: string;
  insertedText: string;
  targetDocId?: string;
}): Promise<PendingWikiEdit> {
  await requireWriteAccessForEdit(editId);
  const edit = await getPendingEditForResolve(editId);

  if (edit.origin !== "chat") {
    throw new Error("Only chat-origin wiki proposals can be edited from chat.");
  }
  if (edit.status !== "pending") {
    throw new Error(`Pending edit is already ${edit.status}.`);
  }

  const trimmed = insertedText.trim();
  if (!trimmed) throw new Error("Proposal content is required.");

  const admin = createSupabaseAdminClient();
  const update: { inserted_text: string; target_doc_id?: string } = { inserted_text: trimmed };

  if (targetDocId && targetDocId !== edit.target_doc_id) {
    const { data: doc, error: docError } = await admin
      .from("canonical_docs")
      .select("id,project_id")
      .eq("id", targetDocId)
      .eq("project_id", edit.project_id)
      .maybeSingle();

    if (docError) throw docError;
    if (!doc) throw new Error("Target canonical doc not found in this project.");
    update.target_doc_id = targetDocId;
  }

  const { error } = await admin
    .from("pending_wiki_edits")
    .update(update)
    .eq("id", editId)
    .eq("status", "pending")
    .eq("origin", "chat");

  if (error) throw error;
  return getPendingEditForResolve(editId);
}

async function getSourceForCurrentUser(sourceId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("source_materials")
    .select("id,project_id,title")
    .eq("id", sourceId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return data;
}

async function requireWriteAccessForEdit(editId: string) {
  const user = await getOptionalSessionUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("pending_wiki_edits")
    .select("project_id")
    .eq("id", editId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Pending edit not found.");

  const access = await getProjectAccessForUser(user.id, String(data.project_id));
  if (!access) throw new Error("Forbidden");
  if (access.role === "viewer") throw new Error("Viewers have read-only access.");

  return { userId: user.id, projectId: String(data.project_id) };
}

async function getPendingEditForResolve(editId: string): Promise<PendingWikiEdit> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("pending_wiki_edits")
    .select(
      [
        "id,project_id,target_doc_id,source_material_id,origin,anchor,inserted_text,deleted_text",
        "reason,confidence,status,repositioned,fallback_applied,created_by,resolved_by,created_at,resolved_at",
        "target_doc:canonical_docs(id,project_id,slug,title,body,is_default,is_pinned,created_at,updated_at)",
      ].join(","),
    )
    .eq("id", editId)
    .single();

  if (error) throw error;
  return mapPendingEdit(data as unknown as PendingEditRow);
}

async function getSourceTitle(sourceId: string | null): Promise<string | null> {
  if (!sourceId) return null;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("source_materials")
    .select("title")
    .eq("id", sourceId)
    .maybeSingle();

  if (error) throw error;
  return typeof data?.title === "string" ? data.title : null;
}

async function resolvePendingEditRpc({
  editId,
  action,
  resolvedBy,
  newBody,
  repositioned,
  fallbackApplied,
  locationNote,
}: {
  editId: string;
  action: "accept" | "reject";
  resolvedBy: string;
  newBody: string | null;
  repositioned: boolean;
  fallbackApplied: boolean;
  locationNote: string | null;
}) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc("resolve_pending_wiki_edit", {
    p_edit_id: editId,
    p_action: action,
    p_resolved_by: resolvedBy,
    p_new_body: newBody,
    p_repositioned: repositioned,
    p_fallback_applied: fallbackApplied,
    p_location_note: locationNote,
  });

  if (error) throw error;
}

function withSourceCitation(text: string, sourceTitle: string | null, sourceId: string | null) {
  const trimmed = text.trim();
  if (!sourceId) return trimmed;
  const label = sourceTitle ? `${sourceTitle} (${sourceId})` : sourceId;
  return `${trimmed}\n\n_Source: ${label}_`;
}

export function resolveInsertionLocation(
  currentBody: string,
  rawAnchor: Record<string, unknown>,
  insertion: string,
): ResolveLocation {
  const anchor = normalizeAnchor(rawAnchor);
  const body = currentBody.trimEnd();

  if (anchor.heading) {
    const exact = findHeadingSection(body, anchor.heading, "exact");
    if (exact) {
      return insertAt(body, exact.end, insertion, {
        repositioned: false,
        fallbackApplied: false,
        locationNote: `Inserted under "${exact.heading}".`,
      });
    }

    const bestEffort = findHeadingSection(body, anchor.heading, "best-effort");
    if (bestEffort) {
      return insertAt(body, bestEffort.end, insertion, {
        repositioned: true,
        fallbackApplied: false,
        locationNote: `Repositioned under "${bestEffort.heading}".`,
      });
    }
  }

  if (anchor.before) {
    const index = body.indexOf(anchor.before);
    if (index >= 0) {
      return insertAt(body, index + anchor.before.length, insertion, {
        repositioned: Boolean(anchor.heading),
        fallbackApplied: false,
        locationNote: "Inserted after matching anchor context.",
      });
    }
  }

  return insertAt(body, body.length, insertion, {
    repositioned: false,
    fallbackApplied: true,
    locationNote: "Appended at end of doc.",
  });
}

function normalizeAnchor(rawAnchor: Record<string, unknown>): Anchor {
  return {
    heading: normalizeOptionalString(rawAnchor.heading),
    before: normalizeOptionalString(rawAnchor.before),
    after: normalizeOptionalString(rawAnchor.after),
  };
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/[#*_`[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findHeadingSection(body: string, target: string, mode: "exact" | "best-effort") {
  const headings = [...body.matchAll(/^(#{1,6})\s+(.+)$/gm)].map((match) => ({
    start: match.index ?? 0,
    endOfLine: (match.index ?? 0) + match[0].length,
    level: match[1].length,
    heading: match[2].trim(),
  }));
  const normalizedTarget = normalizeMatch(target);

  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const normalizedHeading = normalizeMatch(heading.heading);
    const matches =
      mode === "exact"
        ? normalizedHeading === normalizedTarget
        : normalizedHeading.includes(normalizedTarget) ||
          normalizedTarget.includes(normalizedHeading);

    if (!matches) continue;

    const nextPeer = headings
      .slice(index + 1)
      .find((candidate) => candidate.level <= heading.level);
    return {
      heading: heading.heading,
      end: nextPeer ? nextPeer.start : body.length,
    };
  }

  return null;
}

function insertAt(
  body: string,
  index: number,
  insertion: string,
  meta: Omit<ResolveLocation, "body">,
): ResolveLocation {
  const before = body.slice(0, index).trimEnd();
  const after = body.slice(index).trimStart();
  const nextBody = [before, insertion.trim(), after].filter(Boolean).join("\n\n");
  return { body: nextBody, ...meta };
}
