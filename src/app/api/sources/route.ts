import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  projectId: z.string().uuid(),
  type: z.enum(["document", "email", "meeting", "note"]),
  title: z.string().min(1),
  parsedContent: z.string().optional(),
  summary: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  const body = schema.parse(await request.json());
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("source_materials")
    .insert({
      project_id: body.projectId,
      type: body.type,
      title: body.title,
      parsed_content: body.parsedContent ?? null,
      summary: body.summary ?? null,
      metadata: body.metadata ?? {},
      status: "ready",
      uploaded_by: user.id,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ source: data });
}
