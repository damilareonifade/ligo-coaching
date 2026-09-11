/**
 * Generated from supabase/migrations — do not edit by hand.
 *
 * Regenerate with `./scripts/gen-types.sh`, or the canonical
 *   npx supabase gen types typescript --project-id <ref> > src/api/database.types.ts
 * once the Docker daemon is available.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      cache: {
        Row: {
          user_id: string;
          key: string;
          value: Json;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          key: string;
          value: Json;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          key?: string;
          value?: Json;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      coach_clients: {
        Row: {
          coach_id: string;
          client_id: string;
          status: Database['public']['Enums']['coach_client_status'];
          permissions: Json;
          log_for: boolean;
          invited_at: string;
          accepted_at: string | null;
          ended_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          coach_id: string;
          client_id: string;
          status?: Database['public']['Enums']['coach_client_status'];
          permissions?: Json;
          log_for?: boolean;
          invited_at?: string;
          accepted_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          coach_id?: string;
          client_id?: string;
          status?: Database['public']['Enums']['coach_client_status'];
          permissions?: Json;
          log_for?: boolean;
          invited_at?: string;
          accepted_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      password_reset_requests: {
        Row: {
          id: number;
          email: string;
          requested_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: number;
          email: string;
          requested_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: number;
          email?: string;
          requested_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          device_id: string;
          device_name: string;
          platform: string;
          app_version: string;
          push_token: string | null;
          created_at: string;
          last_seen_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          device_id: string;
          device_name?: string;
          platform: string;
          app_version?: string;
          push_token?: string | null;
          created_at?: string;
          last_seen_at?: string;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          device_id?: string;
          device_name?: string;
          platform?: string;
          app_version?: string;
          push_token?: string | null;
          created_at?: string;
          last_seen_at?: string;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          role: Database['public']['Enums']['user_role'];
          role_confirmed: boolean;
          onboarded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string;
          avatar_url?: string | null;
          role?: Database['public']['Enums']['user_role'];
          role_confirmed?: boolean;
          onboarded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string | null;
          role?: Database['public']['Enums']['user_role'];
          role_confirmed?: boolean;
          onboarded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      complete_password_reset_request: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      is_linked_to: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      purge_expired_cache: {
        Args: Record<string, never>;
        Returns: number;
      };
      purge_old_password_reset_requests: {
        Args: Record<string, never>;
        Returns: number;
      };
      record_password_reset_request: {
        Args: { p_email: string };
        Returns: undefined;
      };
    };
    Enums: {
      coach_client_status: 'pending' | 'active' | 'paused' | 'ended';
      user_role: 'client' | 'coach';
    };
    CompositeTypes: Record<string, never>;
  };
};
