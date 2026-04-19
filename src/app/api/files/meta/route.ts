import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { getProjectAccessForUser } from "@/lib/server/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  projectId: z.string().uuid(),
  fileId: z.string().uuid(),
  pinned: z.boolean().optional(),
  visibility: z.enum(["surfaced", "internal"]).optional(),
  locked: z.boolean().optional(),
  is_source_of_truth: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
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

  const updates = {
    pinned: body.pinned,
    visibility: body.visibility,
    locked: body.locked,
    is_source_of_truth: body.is_source_of_truth,
  };
  const fileId = body.fileId;
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("project_files")
    .update(updates)
    .eq("id", fileId)
    .eq("project_id", body.projectId)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ file: data });
}
