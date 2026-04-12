import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { getProjectAccessForUser } from "@/lib/server/data";
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
  const user = await getOptionalSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getProjectAccessForUser(user.id, body.projectId);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (access.role === "viewer") {
    return NextResponse.json({ error: "Viewers have read-only access to this project." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
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
