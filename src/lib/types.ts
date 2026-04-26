export type ProjectConversationListItem = {
  id: string;
  title: string;
  created_at: string;
  /** Most recent user-visible activity: last message time, or chat creation if empty. */
  last_activity_at: string;
};

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
  client_name?: string;
  team_name?: string;
  project_phase?: string;
  additional_context?: string;
  created_at: string;
  updated_at: string;
};

export type SourceMaterial = {
  id: string;
  project_id: string;
  type: "document" | "email" | "meeting" | "note";
  title: string;
  summary: string | null;
  parsed_content: string | null;
  raw_storage_path: string | null;
  metadata: Record<string, unknown>;
  status: "processing" | "ready" | "failed";
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SourceUploader = {
  id: string;
  name: string | null;
  email: string;
};

export type SourceLinkedActivity = {
  id: string;
  event_type: string;
  summary: string;
  created_at: string;
};

export type SourceLinkedRun = {
  id: string;
  status: LibrarianRun["status"];
  summary: string | null;
  started_at: string;
  finished_at: string | null;
  action_count: number;
  suggestion_count: number;
};

export type SourceChunkReference = {
  id: string;
  content: string;
  chunk_index: number;
  char_start: number | null;
  char_end: number | null;
};

export type SourceMaterialDetail = SourceMaterial & {
  chunk_count: number;
  chunks: SourceChunkReference[];
  uploader: SourceUploader | null;
  linked_activity: SourceLinkedActivity[];
  linked_runs: SourceLinkedRun[];
};

export type ActivityEvent = {
  id: string;
  project_id: string;
  event_type: string;
  summary: string;
  actor_id: string | null;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type LibrarianAction = {
  action: "create" | "edit" | "rename" | "delete";
  path: string;
  details?: Record<string, unknown>;
};

export type LibrarianSuggestion = {
  kind: "question" | "source" | "fix";
  title: string;
  rationale?: string | null;
};

export type LibrarianRun = {
  id: string;
  project_id: string;
  trigger_type: "source_ingested" | "conversation_ended" | "wiki_lint";
  trigger_ref: string | null;
  mode: "write" | "proposal";
  status: "running" | "succeeded" | "failed";
  summary: string | null;
  error: string | null;
  actor_id: string | null;
  started_at: string;
  finished_at: string | null;
  action_count: number;
  suggestion_count: number;
  actions: LibrarianAction[];
  suggestions: LibrarianSuggestion[];
  files_touched: string[];
};

export type ProjectActivity = {
  events: ActivityEvent[];
  librarianRuns: LibrarianRun[];
};

export type ProjectRole = "owner" | "editor" | "viewer";

export type AccessibleProject = {
  id: string;
  name: string;
  description: string;
  logo_url: string | null;
  owner_id: string;
  role: ProjectRole;
  is_owned: boolean;
};

export type ProjectSummary = AccessibleProject & {
  sources_count: number;
  sources_processing: number;
  sources_failed: number;
  members_count: number;
  last_activity_at: string | null;
  last_activity_summary: string | null;
  client_name: string | null;
  project_phase: string | null;
};

export type ProjectInviteRole = Exclude<ProjectRole, "owner">;

export type GlossaryEntry = {
  term: string;
  definition: string;
};

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
