import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { editProjectFile } from "@/lib/server/project-files";

const schema = z.object({ projectId: z.string().uuid(), path: z.string().min(1), content: z.string() });

export async function POST(request: NextRequest) {
  const body = schema.parse(await request.json());
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const file = await editProjectFile({ ...body, userId: user.id });
  await supabase.from("activity_events").insert({
    project_id: body.projectId,
    event_type: "file_edited",
    summary: `Updated ${body.path}`,
    actor_id: user.id,
    target_type: "project_file",
    target_id: file.id,
  });

  return NextResponse.json({ file });
}
