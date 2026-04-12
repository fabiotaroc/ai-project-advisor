export type ProjectFile = {
  id: string;
  project_id: string;
  path: string;
  content: string;
  created_by_agent: boolean;
  pinned: boolean;
  visibility: "surfaced" | "internal";
  locked: boolean;
  is_source_of_truth: boolean;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
};

export type ProjectSettings = {
  project_id: string;
  tone: "formal" | "conversational" | "neutral";
  verbosity: "concise" | "standard" | "detailed";
  default_format: "prose" | "bullets" | "tables" | "structured";
  proactivity: "reactive" | "suggestive" | "proactive";
  language: string;
  auto_synthesize_on_ingest: boolean;
  auto_create_entity_pages: boolean;
  created_at: string;
  updated_at: string;
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

export type ProjectRole = "owner" | "editor" | "viewer";

export type AccessibleProject = {
  id: string;
  name: string;
  owner_id: string;
  role: ProjectRole;
  is_owned: boolean;
};

export type ProjectInviteRole = Exclude<ProjectRole, "owner">;

export type ProjectInvite = {
  id: string;
  project_id: string;
  email: string;
  role: ProjectInviteRole;
  status: "pending" | "accepted" | "revoked";
  created_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};
