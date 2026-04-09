import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({ projectId: z.string().uuid(), query: z.string().min(2) });

export async function POST(request: NextRequest) {
  const body = schema.parse(await request.json());
  const supabase = await createSupabaseServerClient();

  const { data: files } = await supabase
    .from("project_files")
    .select("id,path,content")
    .eq("project_id", body.projectId)
    .textSearch("content", body.query, { type: "plain" })
    .limit(10);

  const { data: chunks } = await supabase
    .from("source_chunks")
    .select("id,content,source_materials!inner(title,project_id)")
    .eq("source_materials.project_id", body.projectId)
    .textSearch("content", body.query, { type: "plain" })
    .limit(10);

  const sourceResults = (chunks ?? []).map((chunk) => {
    const source = Array.isArray(chunk.source_materials) ? chunk.source_materials[0] : chunk.source_materials;
    return {
      type: "source",
      id: chunk.id,
      title: source?.title ?? "Source",
      excerpt: chunk.content.slice(0, 220),
    };
  });

  const results = [
    ...(files ?? []).map((file) => ({
      type: "file",
      id: file.id,
      title: file.path,
      excerpt: file.content.slice(0, 220),
    })),
    ...sourceResults,
  ];

  return NextResponse.json({ results });
}
