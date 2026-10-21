// ── Supabase typed schema for Project Nage ──────────────────────────────────
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          thumbnail_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name?: string;
          thumbnail_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          thumbnail_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_documents: {
        Row: {
          id: string;
          project_id: string;
          owner_id: string;
          document: Json;
          version: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          owner_id: string;
          document?: Json;
          version?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          owner_id?: string;
          document?: Json;
          version?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_generation_logs: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          prompt: string;
          result_urls: string[] | null;
          model: string;
          status: "pending" | "done" | "error";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          prompt: string;
          result_urls?: string[] | null;
          model?: string;
          status?: "pending" | "done" | "error";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          prompt?: string;
          result_urls?: string[] | null;
          model?: string;
          status?: "pending" | "done" | "error";
          created_at?: string;
        };
        Relationships: [];
      };
      rate_limit_counters: {
        Row: {
          user_id: string;
          action: string;
          window_type: string;
          count: number;
          reset_at: string;
        };
        Insert: {
          user_id: string;
          action: string;
          window_type: string;
          count?: number;
          reset_at: string;
        };
        Update: {
          user_id?: string;
          action?: string;
          window_type?: string;
          count?: number;
          reset_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      check_rate_limit: {
        Args: {
          p_user_id: string;
          p_action: string;
          p_window_type: string;
          p_limit: number;
          p_duration: string;
        };
        Returns: boolean;
      };
      get_rate_limit_remaining: {
        Args: {
          p_user_id: string;
          p_action: string;
          p_window_type: string;
          p_limit: number;
        };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
