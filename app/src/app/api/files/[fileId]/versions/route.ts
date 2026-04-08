import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_file_versions")
    .select("id,version,content,edited_by,created_at")
    .eq("project_file_id", fileId)
    .order("version", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ versions: data ?? [] });
}
