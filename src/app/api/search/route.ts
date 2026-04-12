import { NextRequest, NextResponse } from "next/server";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { getProjectAccessForUser } from "@/lib/server/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({ projectId: z.string().uuid(), query: z.string().min(2) });

export async function POST(request: NextRequest) {
  const body = schema.parse(await request.json());
  const user = await getOptionalSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await getProjectAccessForUser(user.id, body.projectId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();

  const [ftsResult, vectorResult] = await Promise.all([
    supabase
      .from("project_files")
      .select("id,path,content")
      .eq("project_id", body.projectId)
      .textSearch("content", body.query, { type: "plain" })
      .limit(10),

    (async () => {
      try {
        const { embedding } = await embed({
          model: openai.embedding("text-embedding-3-small"),
          value: body.query,
        });

        const { data } = await supabase.rpc("match_source_chunks", {
          p_project_id: body.projectId,
          p_query_embedding: embedding,
          p_match_count: 10,
        });

        if (!data?.length) return [];

        const sourceIds = [...new Set(data.map((d: { source_material_id: string }) => d.source_material_id))];
        const { data: sources } = await supabase
          .from("source_materials")
          .select("id,title")
          .in("id", sourceIds);

        const titleMap = new Map((sources ?? []).map((s) => [s.id, s.title]));

        return data.map((chunk: { chunk_id: string; source_material_id: string; content: string; similarity: number }) => ({
          type: "source" as const,
          id: chunk.chunk_id,
          title: titleMap.get(chunk.source_material_id) ?? "Source",
          excerpt: chunk.content.slice(0, 280),
          similarity: chunk.similarity,
        }));
      } catch {
        return [];
      }
    })(),
  ]);

  const fileResults = (ftsResult.data ?? []).map((file) => ({
    type: "file" as const,
    id: file.id,
    title: file.path,
    excerpt: file.content.slice(0, 280),
    similarity: null as number | null,
  }));

  const results = [...fileResults, ...vectorResult].sort((a, b) => {
    if (a.type === "file" && b.type === "source") return -1;
    if (a.type === "source" && b.type === "file") return 1;
    if (a.similarity != null && b.similarity != null) return b.similarity - a.similarity;
    return 0;
  });

  return NextResponse.json({ results });
}
