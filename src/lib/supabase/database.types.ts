export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          project_id: string
          summary: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          project_id: string
          summary: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          project_id?: string
          summary?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      chats: {
        Row: {
          created_at: string
          id: string
          project_id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          title?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          citations: Json | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          tool_calls: Json | null
        }
        Insert: {
          citations?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          tool_calls?: Json | null
        }
        Update: {
          citations?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          tool_calls?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_file_versions: {
        Row: {
          content: string
          created_at: string
          edited_by: string | null
          id: string
          project_file_id: string
          version: number
        }
        Insert: {
          content: string
          created_at?: string
          edited_by?: string | null
          id?: string
          project_file_id: string
          version: number
        }
        Update: {
          content?: string
          created_at?: string
          edited_by?: string | null
          id?: string
          project_file_id?: string
          version?: number
        }
        Relationships: []
      }
      project_files: {
        Row: {
          content: string
          created_at: string
          created_by_agent: boolean
          id: string
          is_source_of_truth: boolean
          locked: boolean
          path: string
          pinned: boolean
          project_id: string
          updated_at: string
          updated_by: string | null
          visibility: string
        }
        Insert: {
          content?: string
          created_at?: string
          created_by_agent?: boolean
          id?: string
          is_source_of_truth?: boolean
          locked?: boolean
          path: string
          pinned?: boolean
          project_id: string
          updated_at?: string
          updated_by?: string | null
          visibility?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by_agent?: boolean
          id?: string
          is_source_of_truth?: boolean
          locked?: boolean
          path?: string
          pinned?: boolean
          project_id?: string
          updated_at?: string
          updated_by?: string | null
          visibility?: string
        }
        Relationships: []
      }
      project_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string
          project_id: string
          revoked_at: string | null
          role: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by: string
          project_id: string
          revoked_at?: string | null
          role: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          project_id?: string
          revoked_at?: string | null
          role?: string
          status?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          project_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      project_settings: {
        Row: {
          additional_context: string | null
          auto_create_entity_pages: boolean
          auto_synthesize_on_ingest: boolean
          client_name: string | null
          created_at: string
          default_format: string
          language: string
          proactivity: string
          project_id: string
          project_phase: string | null
          team_name: string | null
          tone: string
          updated_at: string
          verbosity: string
        }
        Insert: {
          additional_context?: string | null
          auto_create_entity_pages?: boolean
          auto_synthesize_on_ingest?: boolean
          client_name?: string | null
          created_at?: string
          default_format?: string
          language?: string
          proactivity?: string
          project_id: string
          project_phase?: string | null
          team_name?: string | null
          tone?: string
          updated_at?: string
          verbosity?: string
        }
        Update: {
          additional_context?: string | null
          auto_create_entity_pages?: boolean
          auto_synthesize_on_ingest?: boolean
          client_name?: string | null
          created_at?: string
          default_format?: string
          language?: string
          proactivity?: string
          project_id?: string
          project_phase?: string | null
          team_name?: string | null
          tone?: string
          updated_at?: string
          verbosity?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      source_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json
          source_material_id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          source_material_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          source_material_id?: string
        }
        Relationships: []
      }
      source_materials: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          parsed_content: string | null
          project_id: string
          raw_storage_path: string | null
          status: string
          summary: string | null
          title: string
          type: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          parsed_content?: string | null
          project_id: string
          raw_storage_path?: string | null
          status: string
          summary?: string | null
          title: string
          type: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          parsed_content?: string | null
          project_id?: string
          raw_storage_path?: string | null
          status?: string
          summary?: string | null
          title?: string
          type?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_source_chunks: {
        Args: {
          p_match_count?: number
          p_project_id: string
          p_query_embedding: string
        }
        Returns: {
          chunk_id: string
          content: string
          similarity: number
          source_material_id: string
        }[]
      }
      user_has_project_access: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      user_has_project_write_access: {
        Args: { p_project_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
