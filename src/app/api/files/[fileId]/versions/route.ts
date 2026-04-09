import { NextRequest, NextResponse } from "next/server";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { getProjectAccessForUser } from "@/lib/server/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const user = await getOptionalSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  const { data: file, error: fileError } = await supabase
    .from("project_files")
    .select("project_id")
    .eq("id", fileId)
    .maybeSingle();

  if (fileError) return NextResponse.json({ error: fileError.message }, { status: 400 });
  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

  if (!(await getProjectAccessForUser(user.id, file.project_id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("project_file_versions")
    .select("id,version,content,edited_by,created_at")
    .eq("project_file_id", fileId)
    .order("version", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ versions: data ?? [] });
}
