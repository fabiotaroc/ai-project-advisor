export type ProjectFile = {
  id: string;
  project_id: string;
  path: string;
  content: string;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
};

export type SourceMaterial = {
  id: string;
  project_id: string;
  type: "document" | "email" | "meeting" | "note";
  title: string;
  summary: string | null;
  metadata: Record<string, unknown>;
  status: "processing" | "ready" | "failed";
  created_at: string;
};

export type ActivityEvent = {
  id: string;
  project_id: string;
  event_type: string;
  summary: string;
  created_at: string;
};
