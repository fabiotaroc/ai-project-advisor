import { after, NextRequest, NextResponse } from "next/server";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { getProjectAccessForUser, getSourceDetail } from "@/lib/server/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { extractText, ingestSourceMaterial } from "@/lib/server/ingestion";
import { triggerOnSourceIngested } from "@/lib/server/librarian/triggers";
import type { SourceMaterial } from "@/lib/types";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const user = await getOptionalSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const projectId = formData.get("projectId") as string | null;
  const category = formData.get("category") as string | null;

  if (!file || !projectId || !category) {
    return NextResponse.json({ error: "Missing file, projectId, or category" }, { status: 400 });
  }

  const access = await getProjectAccessForUser(user.id, projectId);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (access.role === "viewer") {
    return NextResponse.json({ error: "Viewers have read-only access to this project." }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();

  const { data: source, error: sourceError } = await admin
    .from("source_materials")
    .insert({
      project_id: projectId,
      type: category,
      title: file.name,
      status: "processing",
      uploaded_by: user.id,
      metadata: { originalSize: file.size, mimeType: file.type },
    })
    .select("id")
    .single();

  if (sourceError) {
    return NextResponse.json({ error: sourceError.message }, { status: 500 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const storagePath = `${projectId}/${source.id}/original${file.name.slice(file.name.lastIndexOf("."))}`;
  await admin.storage.from("sources").upload(storagePath, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  await admin
    .from("source_materials")
    .update({ raw_storage_path: storagePath })
    .eq("id", source.id);

  try {
    const text = await extractText(buffer, file.name);

    await ingestSourceMaterial({
      sourceId: source.id,
      projectId,
      userId: user.id,
      text,
      title: file.name,
      sourceType: category as SourceMaterial["type"],
    });

    after(async () => {
      try {
        await triggerOnSourceIngested({
          projectId,
          userId: user.id,
          sourceId: source.id,
        });
      } catch (err) {
        console.error("Librarian trigger on source ingest failed", err);
      }
    });

    const completed = await getSourceDetail(projectId, source.id);
    if (!completed) {
      return NextResponse.json({ error: "Uploaded source not found" }, { status: 500 });
    }

    return NextResponse.json({ source: completed });
  } catch (error) {
    console.error("Upload processing failed:", error);
    await admin.from("source_materials").update({ status: "failed" }).eq("id", source.id);
    const failed = await getSourceDetail(projectId, source.id);
    if (!failed) {
      return NextResponse.json({ error: "Uploaded source not found" }, { status: 500 });
    }

    return NextResponse.json({ source: failed }, { status: 200 });
  }
}
