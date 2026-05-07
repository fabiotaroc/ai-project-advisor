import { NextRequest, NextResponse } from "next/server";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { getProjectAccessForUser } from "@/lib/server/data";
import { buildSourceDisplayExcerpt } from "@/lib/server/source-snippets";
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

  const [docsResult, vectorResult] = await Promise.all([
    supabase
      .from("canonical_docs")
      .select("id,slug,title,body")
      .eq("project_id", body.projectId)
      .textSearch("body", body.query, { type: "plain" })
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
          .select("id,title,parsed_content")
          .in("id", sourceIds);

        const sourceMap = new Map(
          (sources ?? []).map((source) => [
            source.id,
            { title: source.title, parsedContent: source.parsed_content },
          ]),
        );

        return data.map((chunk: {
          chunk_id: string;
          source_material_id: string;
          content: string;
          similarity: number;
          char_start: number | null;
          char_end: number | null;
        }) => ({
          type: "source" as const,
          id: chunk.chunk_id,
          sourceMaterialId: chunk.source_material_id,
          title: sourceMap.get(chunk.source_material_id)?.title ?? "Source",
          excerpt: buildSourceDisplayExcerpt({
            content: chunk.content,
            fullText: sourceMap.get(chunk.source_material_id)?.parsedContent,
            maxLength: 280,
          }),
          similarity: chunk.similarity,
          charStart: chunk.char_start,
          charEnd: chunk.char_end,
        }));
      } catch {
        return [];
      }
    })(),
  ]);

  const docResults = (docsResult.data ?? []).map((doc) => ({
    type: "doc" as const,
    id: doc.id,
    title: `${doc.title} (${doc.slug}.md)`,
    excerpt: doc.body.slice(0, 280),
    similarity: null as number | null,
  }));

  const results = [...docResults, ...vectorResult].sort((a, b) => {
    if (a.type === "doc" && b.type === "source") return -1;
    if (a.type === "source" && b.type === "doc") return 1;
    if (a.similarity != null && b.similarity != null) return b.similarity - a.similarity;
    return 0;
  });

  return NextResponse.json({ results });
}
