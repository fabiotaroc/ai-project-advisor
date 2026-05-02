import { after, NextRequest, NextResponse } from "next/server";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { getProjectAccessForUser, getSourceDetail } from "@/lib/server/data";
import { extractText, ingestSourceMaterial } from "@/lib/server/ingestion";
import { triggerOnSourceIngested } from "@/lib/server/librarian/triggers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 120;

type SourceRouteContext = {
  params: Promise<{ sourceId: string }>;
};

async function getWritableSource(sourceId: string, userId: string) {
  const admin = createSupabaseAdminClient();
  const { data: source, error } = await admin
    .from("source_materials")
    .select("id,project_id,title,raw_storage_path")
    .eq("id", sourceId)
    .maybeSingle();

  if (error || !source) {
    return { admin, source: null, response: NextResponse.json({ error: "Source not found" }, { status: 404 }) };
  }

  const access = await getProjectAccessForUser(userId, source.project_id);
  if (!access) {
    return { admin, source, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  if (access.role === "viewer") {
    return {
      admin,
      source,
      response: NextResponse.json(
        { error: "Viewers have read-only access to this project." },
        { status: 403 },
      ),
    };
  }

  return { admin, source, response: null };
}

function storagePathFor(projectId: string, sourceId: string, fileName: string) {
  const extension = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")) : "";
  return `${projectId}/${sourceId}/original${extension}`;
}

export async function PUT(request: NextRequest, { params }: SourceRouteContext) {
  const { sourceId } = await params;
  const user = await getOptionalSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { admin, source, response } = await getWritableSource(sourceId, user.id);
  if (response) return response;
  if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const category = formData.get("category") as string | null;

  if (!file || !category) {
    return NextResponse.json({ error: "Missing file or category" }, { status: 400 });
  }

  if (!["document", "email", "meeting", "note"].includes(category)) {
    return NextResponse.json({ error: "Invalid source category" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storagePath = storagePathFor(source.project_id, source.id, file.name);

  if (source.raw_storage_path && source.raw_storage_path !== storagePath) {
    await admin.storage.from("sources").remove([source.raw_storage_path]);
  }

  const { error: uploadError } = await admin.storage.from("sources").upload(storagePath, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  await admin
    .from("source_materials")
    .update({
      raw_storage_path: storagePath,
      title: file.name,
      type: category,
      status: "processing",
      summary: null,
      parsed_content: null,
      metadata: { originalSize: file.size, mimeType: file.type },
      uploaded_by: user.id,
    })
    .eq("id", source.id);

  try {
    const text = await extractText(buffer, file.name);
    await ingestSourceMaterial({
      sourceId: source.id,
      projectId: source.project_id,
      userId: user.id,
      text,
      title: file.name,
    });

    after(async () => {
      try {
        await triggerOnSourceIngested({
          projectId: source.project_id,
          userId: user.id,
          sourceId: source.id,
        });
      } catch (err) {
        console.error("Librarian trigger on source replacement failed", err);
      }
    });

    const completed = await getSourceDetail(source.project_id, source.id);
    if (!completed) {
      return NextResponse.json({ error: "Replaced source not found" }, { status: 500 });
    }

    return NextResponse.json({ source: completed });
  } catch (error) {
    console.error("Source replacement failed:", source.id, error);
    await admin.from("source_materials").update({ status: "failed" }).eq("id", source.id);
    const failed = await getSourceDetail(source.project_id, source.id);
    if (!failed) {
      return NextResponse.json({ error: "Replaced source not found" }, { status: 500 });
    }

    return NextResponse.json({ source: failed }, { status: 200 });
  }
}

export async function DELETE(_request: NextRequest, { params }: SourceRouteContext) {
  const { sourceId } = await params;
  const user = await getOptionalSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { admin, source, response } = await getWritableSource(sourceId, user.id);
  if (response) return response;
  if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 });

  if (source.raw_storage_path) {
    const { error: storageError } = await admin.storage
      .from("sources")
      .remove([source.raw_storage_path]);
    if (storageError) {
      console.error("Source storage delete failed", source.id, storageError);
    }
  }

  const { error } = await admin.from("source_materials").delete().eq("id", source.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("activity_events").insert({
    project_id: source.project_id,
    event_type: "source_deleted",
    summary: `Deleted source "${source.title}"`,
    actor_id: user.id,
    target_type: "source_material",
    target_id: source.id,
    metadata: { title: source.title },
  });

  return NextResponse.json({ deletedId: source.id });
}
