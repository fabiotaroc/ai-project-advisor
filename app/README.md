# AI Project Advisor v1

Complete v1 build aligned to `PLAN.md`.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Supabase Auth + Postgres + pgvector schema + RLS
- Vercel AI SDK + OpenAI with server tools

## Features

- Workspace/project shell and polished UI
- Chat with streaming responses and generic toolset:
  - `list_files`
  - `read_file`
  - `edit_file`
  - `search_sources`
  - `read_source`
- Files explorer + editor + version snapshots
- Sources list view
- Unified search (files + source chunks)
- Activity timeline
- Migration SQL implementing the v1 data model

## Setup

1. `npm install`
2. `cp .env.example .env.local`
3. Fill Supabase + OpenAI env vars
4. Apply `supabase/migrations/20260408_v1_schema.sql`
5. `npm run dev`
