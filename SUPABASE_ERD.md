# Supabase Data Model ER Diagram

This diagram is derived from `supabase/migrations/20260408_v1_schema.sql` and verified against the live Supabase project `ai-project-advisor` (`faqtckftiusdgyghwcar`) via the Supabase MCP.

```mermaid
erDiagram
    AUTH_USERS {
        uuid id PK
    }

    PROFILES {
        uuid id PK, FK
        text email UK
        text name
        text avatar_url
        timestamptz created_at
        timestamptz updated_at
    }

    WORKSPACES {
        uuid id PK
        text name
        uuid owner_id FK
        timestamptz created_at
        timestamptz updated_at
    }

    WORKSPACE_MEMBERS {
        uuid workspace_id PK, FK
        uuid user_id PK, FK
        text role
        timestamptz created_at
    }

    PROJECTS {
        uuid id PK
        uuid workspace_id FK
        text name
        text agent_instructions
        timestamptz created_at
        timestamptz updated_at
    }

    PROJECT_MEMBERS {
        uuid project_id PK, FK
        uuid user_id PK, FK
        text role
        timestamptz created_at
    }

    PROJECT_FILES {
        uuid id PK
        uuid project_id FK
        text path
        text content
        uuid updated_by FK
        timestamptz created_at
        timestamptz updated_at
    }

    PROJECT_FILE_VERSIONS {
        uuid id PK
        uuid project_file_id FK
        text content
        integer version
        uuid edited_by FK
        timestamptz created_at
    }

    CONVERSATIONS {
        uuid id PK
        uuid project_id FK
        uuid user_id FK
        text title
        timestamptz created_at
    }

    MESSAGES {
        uuid id PK
        uuid conversation_id FK
        text role
        text content
        jsonb tool_calls
        jsonb citations
        timestamptz created_at
    }

    SOURCE_MATERIALS {
        uuid id PK
        uuid project_id FK
        text type
        text title
        text raw_storage_path
        text parsed_content
        text summary
        jsonb metadata
        text status
        uuid uploaded_by FK
        timestamptz created_at
        timestamptz updated_at
    }

    SOURCE_CHUNKS {
        uuid id PK
        uuid source_material_id FK
        text content
        vector embedding
        integer chunk_index
        jsonb metadata
        timestamptz created_at
    }

    ACTIVITY_EVENTS {
        uuid id PK
        uuid project_id FK
        text event_type
        text summary
        uuid actor_id FK
        text target_type
        uuid target_id
        timestamptz created_at
    }

    AUTH_USERS ||--|| PROFILES : "creates profile"
    PROFILES ||--|| WORKSPACES : "owns"
    WORKSPACES ||--o{ WORKSPACE_MEMBERS : "has"
    PROFILES ||--o{ WORKSPACE_MEMBERS : "belongs to"

    WORKSPACES ||--o{ PROJECTS : "contains"
    PROJECTS ||--o{ PROJECT_MEMBERS : "has"
    PROFILES ||--o{ PROJECT_MEMBERS : "belongs to"

    PROJECTS ||--o{ PROJECT_FILES : "has"
    PROFILES o|--o{ PROJECT_FILES : "updates"
    PROJECT_FILES ||--o{ PROJECT_FILE_VERSIONS : "versioned as"
    PROFILES o|--o{ PROJECT_FILE_VERSIONS : "edits"

    PROJECTS ||--o{ CONVERSATIONS : "has"
    PROFILES ||--o{ CONVERSATIONS : "starts"
    CONVERSATIONS ||--o{ MESSAGES : "contains"

    PROJECTS ||--o{ SOURCE_MATERIALS : "has"
    PROFILES o|--o{ SOURCE_MATERIALS : "uploads"
    SOURCE_MATERIALS ||--o{ SOURCE_CHUNKS : "split into"

    PROJECTS ||--o{ ACTIVITY_EVENTS : "logs"
    PROFILES o|--o{ ACTIVITY_EVENTS : "acts in"
```



## Notes

- `profiles.id` references `auth.users.id`, and the signup trigger creates or updates the profile and provisions one personal workspace per user.
- `workspaces.owner_id` is unique, so each profile owns exactly one workspace.
- `workspace_members` and `project_members` are join tables with composite primary keys.
- `workspace_members.user_id` is unique so each user has a single owner membership row for app compatibility while the frontend still reads through `workspace_members`.
- `project_files` is unique on `(project_id, path)`.
- `project_file_versions` is unique on `(project_file_id, version)`.
- `source_chunks.embedding` is a `vector(1536)` column indexed for similarity search.
- `activity_events.target_id` is intentionally polymorphic and does not have a foreign key constraint.

