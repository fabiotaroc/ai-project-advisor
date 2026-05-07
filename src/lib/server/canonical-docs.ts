import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProjectForUser } from "@/lib/server/data";
import {
  DEFAULT_CANONICAL_DOC_SLUGS,
  type CanonicalDoc,
  type CanonicalDocSlug,
} from "@/lib/types";

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

function assertCustomSlug(slug: string) {
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(
      "Slug must be lowercase letters, numbers, and dashes (no leading/trailing dashes).",
    );
  }
  if ((DEFAULT_CANONICAL_DOC_SLUGS as readonly string[]).includes(slug)) {
    throw new Error(`"${slug}" is a default canonical doc slug and cannot be re-used.`);
  }
}

function mapRow(row: Record<string, unknown>): CanonicalDoc {
  return {
    id: String(row.id),
    project_id: String(row.project_id),
    slug: String(row.slug) as CanonicalDocSlug,
    title: String(row.title),
    body: typeof row.body === "string" ? row.body : "",
    is_default: Boolean(row.is_default),
    is_pinned: Boolean(row.is_pinned),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

const DEFAULT_ORDER: Record<string, number> = Object.fromEntries(
  DEFAULT_CANONICAL_DOC_SLUGS.map((slug, idx) => [slug, idx]),
);

function sortDocs(docs: CanonicalDoc[]): CanonicalDoc[] {
  return docs.slice().sort((a, b) => {
    if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
    if (a.is_default && b.is_default) {
      return (DEFAULT_ORDER[a.slug] ?? 99) - (DEFAULT_ORDER[b.slug] ?? 99);
    }
    return a.title.localeCompare(b.title);
  });
}

export async function listCanonicalDocs(projectId: string): Promise<CanonicalDoc[]> {
  await getProjectForUser(projectId);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("canonical_docs")
    .select("id,project_id,slug,title,body,is_default,is_pinned,created_at,updated_at")
    .eq("project_id", projectId);

  if (error) throw error;
  return sortDocs((data ?? []).map(mapRow));
}

export async function getCanonicalDoc(
  projectId: string,
  slug: CanonicalDocSlug,
): Promise<CanonicalDoc | null> {
  await getProjectForUser(projectId);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("canonical_docs")
    .select("id,project_id,slug,title,body,is_default,is_pinned,created_at,updated_at")
    .eq("project_id", projectId)
    .eq("slug", normalizeSlug(slug))
    .maybeSingle();

  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function getCanonicalDocById(docId: string): Promise<CanonicalDoc | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("canonical_docs")
    .select("id,project_id,slug,title,body,is_default,is_pinned,created_at,updated_at")
    .eq("id", docId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  await getProjectForUser(String(data.project_id));
  return mapRow(data);
}

export async function updateCanonicalDocBody(
  docId: string,
  body: string,
): Promise<CanonicalDoc> {
  const existing = await getCanonicalDocById(docId);
  if (!existing) throw new Error(`Canonical doc ${docId} not found.`);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("canonical_docs")
    .update({ body })
    .eq("id", docId)
    .select("id,project_id,slug,title,body,is_default,is_pinned,created_at,updated_at")
    .single();

  if (error) throw error;
  return mapRow(data);
}

export async function pinCustomDoc(
  projectId: string,
  slug: string,
  title: string,
): Promise<CanonicalDoc> {
  await getProjectForUser(projectId);

  const normalized = normalizeSlug(slug);
  assertCustomSlug(normalized);
  const trimmedTitle = title.trim();
  if (!trimmedTitle) throw new Error("Custom doc title is required.");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("canonical_docs")
    .insert({
      project_id: projectId,
      slug: normalized,
      title: trimmedTitle,
      is_default: false,
      is_pinned: true,
    })
    .select("id,project_id,slug,title,body,is_default,is_pinned,created_at,updated_at")
    .single();

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new Error(`A canonical doc with slug "${normalized}" already exists.`);
    }
    throw error;
  }
  return mapRow(data);
}

export async function unpinCustomDoc(docId: string): Promise<void> {
  const doc = await getCanonicalDocById(docId);
  if (!doc) throw new Error(`Canonical doc ${docId} not found.`);
  if (doc.is_default) {
    throw new Error("Default canonical docs cannot be unpinned or deleted.");
  }

  // Use admin client so we don't depend on RLS for the user-facing delete path.
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("canonical_docs").delete().eq("id", docId);
  if (error) throw error;
}
