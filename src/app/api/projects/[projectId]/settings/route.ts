import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { getProjectAccessForUser } from "@/lib/server/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const patchSchema = z.object({
  tone: z.enum(["formal", "conversational", "neutral"]).optional(),
  verbosity: z.enum(["concise", "standard", "detailed"]).optional(),
  default_format: z.enum(["prose", "bullets", "tables", "structured"]).optional(),
  proactivity: z.enum(["reactive", "suggestive", "proactive"]).optional(),
  language: z.string().min(1).optional(),
  auto_synthesize_on_ingest: z.boolean().optional(),
  auto_create_entity_pages: z.boolean().optional(),
  client_name: z.string().optional(),
  team_name: z.string().optional(),
  project_phase: z.string().optional(),
  additional_context: z.string().optional(),
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
    .from("project_settings")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const user = await getOptionalSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getProjectAccessForUser(user.id, projectId);
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (access.role === "viewer") {
    return NextResponse.json({ error: "Viewers have read-only access to this project." }, { status: 403 });
  }

  const body = patchSchema.parse(await request.json());

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("project_settings")
    .update(body)
    .eq("project_id", projectId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
