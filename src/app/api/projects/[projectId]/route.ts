import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { getProjectAccessForUser } from "@/lib/server/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  logo_url: z.string().url().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const user = await getOptionalSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getProjectAccessForUser(user.id, projectId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id,name,description,logo_url,owner_id,updated_at")
    .eq("id", projectId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const user = await getOptionalSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getProjectAccessForUser(user.id, projectId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (access.role !== "owner") {
    return NextResponse.json(
      { error: "Only the project owner can edit project identity." },
      { status: 403 },
    );
  }

  const body = patchSchema.parse(await request.json());
  if (Object.keys(body).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("projects")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .select("id,name,description,logo_url,owner_id,updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data });
}
