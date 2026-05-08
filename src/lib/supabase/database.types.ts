export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
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
          metadata: Json
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
          metadata?: Json
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
          metadata?: Json
          project_id?: string
          summary?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      canonical_docs: {
        Row: {
          body: string
          created_at: string
          id: string
          is_default: boolean
          is_pinned: boolean
          project_id: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          is_default?: boolean
          is_pinned?: boolean
          project_id: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_default?: boolean
          is_pinned?: boolean
          project_id?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "canonical_docs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      librarian_runs: {
        Row: {
          action_count: number
          actions: Json
          actor_id: string | null
          error: string | null
          files_touched: string[]
          finished_at: string | null
          id: string
          mode: string
          project_id: string
          started_at: string
          status: string
          suggestion_count: number
          suggestions: Json
          summary: string | null
          trigger_ref: string | null
          trigger_type: string
        }
        Insert: {
          action_count?: number
          actions?: Json
          actor_id?: string | null
          error?: string | null
          files_touched?: string[]
          finished_at?: string | null
          id?: string
          mode?: string
          project_id: string
          started_at?: string
          status?: string
          suggestion_count?: number
          suggestions?: Json
          summary?: string | null
          trigger_ref?: string | null
          trigger_type: string
        }
        Update: {
          action_count?: number
          actions?: Json
          actor_id?: string | null
          error?: string | null
          files_touched?: string[]
          finished_at?: string | null
          id?: string
          mode?: string
          project_id?: string
          started_at?: string
          status?: string
          suggestion_count?: number
          suggestions?: Json
          summary?: string | null
          trigger_ref?: string | null
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "librarian_runs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "librarian_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_wiki_edits: {
        Row: {
          anchor: Json
          confidence: number | null
          created_at: string
          created_by: string | null
          deleted_text: string | null
          fallback_applied: boolean
          id: string
          inserted_text: string
          origin: Database["public"]["Enums"]["pending_wiki_edit_origin"]
          project_id: string
          reason: string | null
          repositioned: boolean
          resolved_at: string | null
          resolved_by: string | null
          source_material_id: string | null
          status: Database["public"]["Enums"]["pending_wiki_edit_status"]
          target_doc_id: string
        }
        Insert: {
          anchor?: Json
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          deleted_text?: string | null
          fallback_applied?: boolean
          id?: string
          inserted_text?: string
          origin: Database["public"]["Enums"]["pending_wiki_edit_origin"]
          project_id: string
          reason?: string | null
          repositioned?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          source_material_id?: string | null
          status?: Database["public"]["Enums"]["pending_wiki_edit_status"]
          target_doc_id: string
        }
        Update: {
          anchor?: Json
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          deleted_text?: string | null
          fallback_applied?: boolean
          id?: string
          inserted_text?: string
          origin?: Database["public"]["Enums"]["pending_wiki_edit_origin"]
          project_id?: string
          reason?: string | null
          repositioned?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          source_material_id?: string | null
          status?: Database["public"]["Enums"]["pending_wiki_edit_status"]
          target_doc_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_wiki_edits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_wiki_edits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_wiki_edits_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_wiki_edits_source_material_id_fkey"
            columns: ["source_material_id"]
            isOneToOne: false
            referencedRelation: "source_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_wiki_edits_target_doc_id_fkey"
            columns: ["target_doc_id"]
            isOneToOne: false
            referencedRelation: "canonical_docs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          name?: string | null
          updated_at?: string
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
        Relationships: [
          {
            foreignKeyName: "project_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_settings: {
        Row: {
          additional_context: string | null
          client_name: string | null
          created_at: string
          default_format: string
          language: string
          project_id: string
          project_phase: string | null
          team_name: string | null
          tone: string
          updated_at: string
          verbosity: string
        }
        Insert: {
          additional_context?: string | null
          client_name?: string | null
          created_at?: string
          default_format?: string
          language?: string
          project_id: string
          project_phase?: string | null
          team_name?: string | null
          tone?: string
          updated_at?: string
          verbosity?: string
        }
        Update: {
          additional_context?: string | null
          client_name?: string | null
          created_at?: string
          default_format?: string
          language?: string
          project_id?: string
          project_phase?: string | null
          team_name?: string | null
          tone?: string
          updated_at?: string
          verbosity?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      source_chunks: {
        Row: {
          char_end: number | null
          char_start: number | null
          chunk_index: number
          content: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json
          source_material_id: string
        }
        Insert: {
          char_end?: number | null
          char_start?: number | null
          chunk_index: number
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          source_material_id: string
        }
        Update: {
          char_end?: number | null
          char_start?: number | null
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          source_material_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_chunks_source_material_id_fkey"
            columns: ["source_material_id"]
            isOneToOne: false
            referencedRelation: "source_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      source_email_details: {
        Row: {
          attachments: Json
          canonical_subject: string | null
          cc_addresses: Json
          created_at: string
          from_address: string | null
          in_reply_to: string | null
          key_decisions: Json
          latest_state: string | null
          message_id: string | null
          references: string | null
          requested_actions: Json
          sent_at: string | null
          source_material_id: string
          to_addresses: Json
          updated_at: string
        }
        Insert: {
          attachments?: Json
          canonical_subject?: string | null
          cc_addresses?: Json
          created_at?: string
          from_address?: string | null
          in_reply_to?: string | null
          key_decisions?: Json
          latest_state?: string | null
          message_id?: string | null
          references?: string | null
          requested_actions?: Json
          sent_at?: string | null
          source_material_id: string
          to_addresses?: Json
          updated_at?: string
        }
        Update: {
          attachments?: Json
          canonical_subject?: string | null
          cc_addresses?: Json
          created_at?: string
          from_address?: string | null
          in_reply_to?: string | null
          key_decisions?: Json
          latest_state?: string | null
          message_id?: string | null
          references?: string | null
          requested_actions?: Json
          sent_at?: string | null
          source_material_id?: string
          to_addresses?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_email_details_source_material_id_fkey"
            columns: ["source_material_id"]
            isOneToOne: true
            referencedRelation: "source_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      source_file_details: {
        Row: {
          created_at: string
          extracted_title: string | null
          extraction_status: string | null
          file_extension: string | null
          file_size_bytes: number | null
          language: string | null
          metadata: Json
          mime_type: string | null
          original_filename: string | null
          page_count: number | null
          preview_status: string | null
          sheet_count: number | null
          slide_count: number | null
          source_material_id: string
          updated_at: string
          word_count: number | null
        }
        Insert: {
          created_at?: string
          extracted_title?: string | null
          extraction_status?: string | null
          file_extension?: string | null
          file_size_bytes?: number | null
          language?: string | null
          metadata?: Json
          mime_type?: string | null
          original_filename?: string | null
          page_count?: number | null
          preview_status?: string | null
          sheet_count?: number | null
          slide_count?: number | null
          source_material_id: string
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          created_at?: string
          extracted_title?: string | null
          extraction_status?: string | null
          file_extension?: string | null
          file_size_bytes?: number | null
          language?: string | null
          metadata?: Json
          mime_type?: string | null
          original_filename?: string | null
          page_count?: number | null
          preview_status?: string | null
          sheet_count?: number | null
          slide_count?: number | null
          source_material_id?: string
          updated_at?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "source_file_details_source_material_id_fkey"
            columns: ["source_material_id"]
            isOneToOne: true
            referencedRelation: "source_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      source_materials: {
        Row: {
          created_at: string
          file_kind: string | null
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
          file_kind?: string | null
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
          file_kind?: string | null
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
        Relationships: [
          {
            foreignKeyName: "source_materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_materials_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      source_meeting_details: {
        Row: {
          action_items: Json
          created_at: string
          decisions: Json
          meeting_at: string | null
          open_questions: Json
          participants: Json
          risks: Json
          short_summary: string | null
          source_material_id: string
          updated_at: string
        }
        Insert: {
          action_items?: Json
          created_at?: string
          decisions?: Json
          meeting_at?: string | null
          open_questions?: Json
          participants?: Json
          risks?: Json
          short_summary?: string | null
          source_material_id: string
          updated_at?: string
        }
        Update: {
          action_items?: Json
          created_at?: string
          decisions?: Json
          meeting_at?: string | null
          open_questions?: Json
          participants?: Json
          risks?: Json
          short_summary?: string | null
          source_material_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_meeting_details_source_material_id_fkey"
            columns: ["source_material_id"]
            isOneToOne: true
            referencedRelation: "source_materials"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      chat_last_message_times: {
        Args: { p_conversation_ids: string[] }
        Returns: {
          conversation_id: string
          last_message_at: string
        }[]
      }
      match_source_chunks: {
        Args: {
          p_match_count?: number
          p_project_id: string
          p_query_embedding: string
        }
        Returns: {
          char_end: number
          char_start: number
          chunk_id: string
          content: string
          similarity: number
          source_material_id: string
        }[]
      }
      match_source_chunks_hybrid: {
        Args: {
          p_lexical_pool?: number
          p_match_count?: number
          p_project_id: string
          p_query_embedding: string
          p_query_text: string
          p_semantic_pool?: number
        }
        Returns: {
          char_end: number
          char_start: number
          chunk_id: string
          content: string
          lexical_rank: number
          match_kind: string
          semantic_similarity: number
          similarity: number
          source_material_id: string
        }[]
      }
      seed_default_canonical_docs: {
        Args: { p_project_id: string }
        Returns: undefined
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
      pending_wiki_edit_origin: "ingestion" | "chat"
      pending_wiki_edit_status: "pending" | "accepted" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      pending_wiki_edit_origin: ["ingestion", "chat"],
      pending_wiki_edit_status: ["pending", "accepted", "rejected"],
    },
  },
} as const
