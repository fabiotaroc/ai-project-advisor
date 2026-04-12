import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { getProjectAccessForUser } from "@/lib/server/data";
import { editProjectFile } from "@/lib/server/project-files";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ projectId: z.string().uuid(), path: z.string().min(1), content: z.string() });

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

  const file = await editProjectFile({ ...body, userId: user.id });
  const supabase = createSupabaseAdminClient();
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
