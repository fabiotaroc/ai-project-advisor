import { NextRequest, NextResponse } from "next/server";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { getProjectAccessForUser, getSourceDetail } from "@/lib/server/data";
import { extractText, ingestSourceMaterial } from "@/lib/server/ingestion";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SourceMaterial } from "@/lib/types";

export const maxDuration = 120;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  const { sourceId } = await params;
  const user = await getOptionalSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data: source, error: sourceError } = await admin
    .from("source_materials")
    .select("id,project_id,title,raw_storage_path,type")
    .eq("id", sourceId)
    .maybeSingle();

  if (sourceError || !source) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  const access = await getProjectAccessForUser(user.id, source.project_id);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (access.role === "viewer") {
    return NextResponse.json({ error: "Viewers have read-only access to this project." }, { status: 403 });
  }

  if (!source.raw_storage_path) {
    return NextResponse.json(
      { error: "Source has no stored file; upload the file again." },
      { status: 400 },
    );
  }

  const { data: blob, error: downloadError } = await admin.storage
    .from("sources")
    .download(source.raw_storage_path);

  if (downloadError || !blob) {
    console.error("Retry download failed", sourceId, downloadError);
    return NextResponse.json({ error: "Could not load file from storage" }, { status: 500 });
  }

  const buffer = Buffer.from(await blob.arrayBuffer());

  try {
    const text = await extractText(buffer, source.title);
    await ingestSourceMaterial({
      sourceId: source.id,
      projectId: source.project_id,
      userId: user.id,
      text,
      title: source.title,
      sourceType: source.type as SourceMaterial["type"],
    });

    const completed = await getSourceDetail(source.project_id, source.id);
    if (!completed) {
      return NextResponse.json({ error: "Source not found after retry" }, { status: 500 });
    }

    return NextResponse.json({ source: completed });
  } catch (error) {
    console.error("Source retry failed:", sourceId, error);
    await admin.from("source_materials").update({ status: "failed" }).eq("id", source.id);
    const failed = await getSourceDetail(source.project_id, source.id);
    if (!failed) {
      return NextResponse.json({ error: "Source not found after retry" }, { status: 500 });
    }

    return NextResponse.json({ source: failed }, { status: 200 });
  }
}
