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
      access_requests: {
        Row: {
          id: string;
          coach_id: string;
          client_id: string;
          domain: string;
          requested_at: string;
          answered_at: string | null;
          granted: boolean | null;
        };
        Insert: {
          id?: string;
          coach_id: string;
          client_id: string;
          domain: string;
          requested_at?: string;
          answered_at?: string | null;
          granted?: boolean | null;
        };
        Update: {
          id?: string;
          coach_id?: string;
          client_id?: string;
          domain?: string;
          requested_at?: string;
          answered_at?: string | null;
          granted?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: 'access_requests_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'access_requests_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      body_measurements: {
        Row: {
          id: string;
          client_id: string;
          measured_at: string;
          weight_kg: number | null;
          waist_cm: number | null;
          chest_cm: number | null;
          hips_cm: number | null;
          body_fat_pct: number | null;
          note: string | null;
          logged_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          measured_at?: string;
          weight_kg?: number | null;
          waist_cm?: number | null;
          chest_cm?: number | null;
          hips_cm?: number | null;
          body_fat_pct?: number | null;
          note?: string | null;
          logged_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          measured_at?: string;
          weight_kg?: number | null;
          waist_cm?: number | null;
          chest_cm?: number | null;
          hips_cm?: number | null;
          body_fat_pct?: number | null;
          note?: string | null;
          logged_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'body_measurements_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'body_measurements_logged_by_fkey';
            columns: ['logged_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
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
        Relationships: [
          {
            foreignKeyName: 'cache_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      catalogue_syncs: {
        Row: {
          id: string;
          source: string;
          started_at: string;
          finished_at: string | null;
          written: number;
          requests: number;
          dataset_etag: string | null;
          error: string | null;
          next_offset: number;
        };
        Insert: {
          id?: string;
          source: string;
          started_at?: string;
          finished_at?: string | null;
          written?: number;
          requests?: number;
          dataset_etag?: string | null;
          error?: string | null;
          next_offset?: number;
        };
        Update: {
          id?: string;
          source?: string;
          started_at?: string;
          finished_at?: string | null;
          written?: number;
          requests?: number;
          dataset_etag?: string | null;
          error?: string | null;
          next_offset?: number;
        };
        Relationships: [];
      };
      client_profiles: {
        Row: {
          client_id: string;
          goals: string[];
          experience: string;
          sessions_per_week: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          goals?: string[];
          experience?: string;
          sessions_per_week?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          goals?: string[];
          experience?: string;
          sessions_per_week?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'client_profiles_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
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
          label_id: string | null;
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
          label_id?: string | null;
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
          label_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'coach_clients_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'coach_clients_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'coach_clients_label_id_fkey';
            columns: ['label_id'];
            isOneToOne: false;
            referencedRelation: 'roster_labels';
            referencedColumns: ['id'];
          },
        ];
      };
      coach_code_lookups: {
        Row: {
          id: string;
          actor: string;
          code: string;
          found: boolean;
          looked_up_at: string;
        };
        Insert: {
          id?: string;
          actor: string;
          code: string;
          found: boolean;
          looked_up_at?: string;
        };
        Update: {
          id?: string;
          actor?: string;
          code?: string;
          found?: boolean;
          looked_up_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'coach_code_lookups_actor_fkey';
            columns: ['actor'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      coach_live_sessions: {
        Row: {
          coach_id: string | null;
          client_id: string | null;
          full_name: string | null;
          session_id: string | null;
          title: string | null;
          started_at: string | null;
          exercise_count: number | null;
          set_count: number | null;
          completed_set_count: number | null;
          log_for: boolean | null;
        };
        Insert: {
          coach_id?: string | null;
          client_id?: string | null;
          full_name?: string | null;
          session_id?: string | null;
          title?: string | null;
          started_at?: string | null;
          exercise_count?: number | null;
          set_count?: number | null;
          completed_set_count?: number | null;
          log_for?: boolean | null;
        };
        Update: {
          coach_id?: string | null;
          client_id?: string | null;
          full_name?: string | null;
          session_id?: string | null;
          title?: string | null;
          started_at?: string | null;
          exercise_count?: number | null;
          set_count?: number | null;
          completed_set_count?: number | null;
          log_for?: boolean | null;
        };
        Relationships: [];
      };
      coach_profiles: {
        Row: {
          coach_id: string;
          gym: string;
          bio: string;
          specialties: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          coach_id: string;
          gym?: string;
          bio?: string;
          specialties?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          coach_id?: string;
          gym?: string;
          bio?: string;
          specialties?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'coach_profiles_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      data_exports: {
        Row: {
          id: string;
          client_id: string;
          requested_at: string;
          finished_at: string | null;
          path: string | null;
          bytes: number | null;
          format: string;
          error: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          requested_at?: string;
          finished_at?: string | null;
          path?: string | null;
          bytes?: number | null;
          format?: string;
          error?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          requested_at?: string;
          finished_at?: string | null;
          path?: string | null;
          bytes?: number | null;
          format?: string;
          error?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'data_exports_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      data_imports: {
        Row: {
          id: string;
          client_id: string;
          source: string;
          started_at: string;
          finished_at: string | null;
          path: string | null;
          sessions_written: number;
          sets_written: number;
          sessions_skipped: number;
          error: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          source: string;
          started_at?: string;
          finished_at?: string | null;
          path?: string | null;
          sessions_written?: number;
          sets_written?: number;
          sessions_skipped?: number;
          error?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          source?: string;
          started_at?: string;
          finished_at?: string | null;
          path?: string | null;
          sessions_written?: number;
          sets_written?: number;
          sessions_skipped?: number;
          error?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'data_imports_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      exercises: {
        Row: {
          id: string;
          owner_id: string | null;
          name: string;
          meta: string;
          tag: string;
          muscle_group: string;
          created_at: string;
          updated_at: string;
          source: string | null;
          external_id: string | null;
          gif_url: string | null;
          body_part: string | null;
          target: string | null;
          equipment: string | null;
          secondary_muscles: string[];
          instructions: string[];
          difficulty: string | null;
          mechanic: string | null;
          force: string | null;
          synced_at: string | null;
          gif_path: string | null;
          measure: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          name: string;
          meta?: string;
          tag?: string;
          muscle_group?: string;
          created_at?: string;
          updated_at?: string;
          source?: string | null;
          external_id?: string | null;
          gif_url?: string | null;
          body_part?: string | null;
          target?: string | null;
          equipment?: string | null;
          secondary_muscles?: string[];
          instructions?: string[];
          difficulty?: string | null;
          mechanic?: string | null;
          force?: string | null;
          synced_at?: string | null;
          gif_path?: string | null;
          measure?: string;
        };
        Update: {
          id?: string;
          owner_id?: string | null;
          name?: string;
          meta?: string;
          tag?: string;
          muscle_group?: string;
          created_at?: string;
          updated_at?: string;
          source?: string | null;
          external_id?: string | null;
          gif_url?: string | null;
          body_part?: string | null;
          target?: string | null;
          equipment?: string | null;
          secondary_muscles?: string[];
          instructions?: string[];
          difficulty?: string | null;
          mechanic?: string | null;
          force?: string | null;
          synced_at?: string | null;
          gif_path?: string | null;
          measure?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'exercises_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      group_invites: {
        Row: {
          id: string;
          group_id: string;
          invitee_id: string;
          invited_by: string | null;
          created_at: string;
          responded_at: string | null;
          accepted: boolean | null;
        };
        Insert: {
          id?: string;
          group_id: string;
          invitee_id: string;
          invited_by?: string | null;
          created_at?: string;
          responded_at?: string | null;
          accepted?: boolean | null;
        };
        Update: {
          id?: string;
          group_id?: string;
          invitee_id?: string;
          invited_by?: string | null;
          created_at?: string;
          responded_at?: string | null;
          accepted?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: 'group_invites_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_invites_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_invites_invitee_id_fkey';
            columns: ['invitee_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      groups: {
        Row: {
          id: string;
          name: string;
          created_by: string | null;
          join_code: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_by?: string | null;
          join_code: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_by?: string | null;
          join_code?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'groups_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      health_entries: {
        Row: {
          id: string;
          client_id: string;
          section: string;
          label: string;
          value: string;
          status: string | null;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          section: string;
          label: string;
          value?: string;
          status?: string | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          section?: string;
          label?: string;
          value?: string;
          status?: string | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'health_entries_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          thread_id: string;
          sender_id: string | null;
          body: string;
          attachment_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          sender_id?: string | null;
          body: string;
          attachment_path?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          sender_id?: string | null;
          body?: string;
          attachment_path?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'threads';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          actor_id: string | null;
          kind: string;
          payload: Json;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          actor_id?: string | null;
          kind: string;
          payload?: Json;
          created_at?: string;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          actor_id?: string | null;
          kind?: string;
          payload?: Json;
          created_at?: string;
          read_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
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
      program_blocks: {
        Row: {
          id: string;
          program_routine_id: string;
          name: string;
          scheme: string;
          rpe: string;
          target_kg: number | null;
          note: string | null;
          order_index: number;
          created_at: string;
          updated_at: string;
          exercise_id: string | null;
          target_distance_km: number | null;
          target_duration_seconds: number | null;
        };
        Insert: {
          id?: string;
          program_routine_id: string;
          name: string;
          scheme?: string;
          rpe?: string;
          target_kg?: number | null;
          note?: string | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
          exercise_id?: string | null;
          target_distance_km?: number | null;
          target_duration_seconds?: number | null;
        };
        Update: {
          id?: string;
          program_routine_id?: string;
          name?: string;
          scheme?: string;
          rpe?: string;
          target_kg?: number | null;
          note?: string | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
          exercise_id?: string | null;
          target_distance_km?: number | null;
          target_duration_seconds?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'program_blocks_exercise_id_fkey';
            columns: ['exercise_id'];
            isOneToOne: false;
            referencedRelation: 'exercises';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'program_blocks_program_routine_id_fkey';
            columns: ['program_routine_id'];
            isOneToOne: false;
            referencedRelation: 'program_routines';
            referencedColumns: ['id'];
          },
        ];
      };
      program_routines: {
        Row: {
          id: string;
          program_id: string;
          name: string;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          program_id: string;
          name: string;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          program_id?: string;
          name?: string;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'program_routines_program_id_fkey';
            columns: ['program_id'];
            isOneToOne: false;
            referencedRelation: 'programs';
            referencedColumns: ['id'];
          },
        ];
      };
      programs: {
        Row: {
          id: string;
          coach_id: string;
          name: string;
          note: string | null;
          weeks: number;
          sessions_per_week: number;
          status: Database['public']['Enums']['program_status'];
          version: number;
          has_draft_changes: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          coach_id: string;
          name: string;
          note?: string | null;
          weeks?: number;
          sessions_per_week?: number;
          status?: Database['public']['Enums']['program_status'];
          version?: number;
          has_draft_changes?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          coach_id?: string;
          name?: string;
          note?: string | null;
          weeks?: number;
          sessions_per_week?: number;
          status?: Database['public']['Enums']['program_status'];
          version?: number;
          has_draft_changes?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'programs_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      roster_clients: {
        Row: {
          coach_id: string | null;
          client_id: string | null;
          label_id: string | null;
          permissions: Json | null;
          log_for: boolean | null;
          accepted_at: string | null;
          full_name: string | null;
          avatar_url: string | null;
          last_workout_at: string | null;
          is_training: boolean | null;
          program_name: string | null;
        };
        Insert: {
          coach_id?: string | null;
          client_id?: string | null;
          label_id?: string | null;
          permissions?: Json | null;
          log_for?: boolean | null;
          accepted_at?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          last_workout_at?: string | null;
          is_training?: boolean | null;
          program_name?: string | null;
        };
        Update: {
          coach_id?: string | null;
          client_id?: string | null;
          label_id?: string | null;
          permissions?: Json | null;
          log_for?: boolean | null;
          accepted_at?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          last_workout_at?: string | null;
          is_training?: boolean | null;
          program_name?: string | null;
        };
        Relationships: [];
      };
      roster_labels: {
        Row: {
          id: string;
          coach_id: string;
          name: string;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          coach_id: string;
          name: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          coach_id?: string;
          name?: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'roster_labels_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      routine_blocks: {
        Row: {
          id: string;
          routine_instance_id: string;
          name: string;
          scheme: string;
          rpe: string;
          target_kg: number | null;
          note: string | null;
          order_index: number;
          created_at: string;
          updated_at: string;
          exercise_id: string | null;
          target_distance_km: number | null;
          target_duration_seconds: number | null;
        };
        Insert: {
          id?: string;
          routine_instance_id: string;
          name: string;
          scheme?: string;
          rpe?: string;
          target_kg?: number | null;
          note?: string | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
          exercise_id?: string | null;
          target_distance_km?: number | null;
          target_duration_seconds?: number | null;
        };
        Update: {
          id?: string;
          routine_instance_id?: string;
          name?: string;
          scheme?: string;
          rpe?: string;
          target_kg?: number | null;
          note?: string | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
          exercise_id?: string | null;
          target_distance_km?: number | null;
          target_duration_seconds?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'routine_blocks_exercise_id_fkey';
            columns: ['exercise_id'];
            isOneToOne: false;
            referencedRelation: 'exercises';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'routine_blocks_routine_instance_id_fkey';
            columns: ['routine_instance_id'];
            isOneToOne: false;
            referencedRelation: 'routine_instances';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'routine_blocks_routine_instance_id_fkey';
            columns: ['routine_instance_id'];
            isOneToOne: false;
            referencedRelation: 'routine_instance_progress';
            referencedColumns: ['id'];
          },
        ];
      };
      routine_instance_progress: {
        Row: {
          id: string | null;
          client_id: string | null;
          program_routine_id: string | null;
          coach_id: string | null;
          name: string | null;
          note: string | null;
          order_index: number | null;
          base_version: number | null;
          diverged: boolean | null;
          created_at: string | null;
          updated_at: string | null;
          last_completed_at: string | null;
        };
        Insert: {
          id?: string | null;
          client_id?: string | null;
          program_routine_id?: string | null;
          coach_id?: string | null;
          name?: string | null;
          note?: string | null;
          order_index?: number | null;
          base_version?: number | null;
          diverged?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          last_completed_at?: string | null;
        };
        Update: {
          id?: string | null;
          client_id?: string | null;
          program_routine_id?: string | null;
          coach_id?: string | null;
          name?: string | null;
          note?: string | null;
          order_index?: number | null;
          base_version?: number | null;
          diverged?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          last_completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'routine_instances_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'routine_instances_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'routine_instances_program_routine_id_fkey';
            columns: ['program_routine_id'];
            isOneToOne: false;
            referencedRelation: 'program_routines';
            referencedColumns: ['id'];
          },
        ];
      };
      routine_instances: {
        Row: {
          id: string;
          client_id: string;
          program_routine_id: string | null;
          coach_id: string | null;
          name: string;
          note: string | null;
          order_index: number;
          base_version: number | null;
          diverged: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          program_routine_id?: string | null;
          coach_id?: string | null;
          name: string;
          note?: string | null;
          order_index?: number;
          base_version?: number | null;
          diverged?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          program_routine_id?: string | null;
          coach_id?: string | null;
          name?: string;
          note?: string | null;
          order_index?: number;
          base_version?: number | null;
          diverged?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'routine_instances_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'routine_instances_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'routine_instances_program_routine_id_fkey';
            columns: ['program_routine_id'];
            isOneToOne: false;
            referencedRelation: 'program_routines';
            referencedColumns: ['id'];
          },
        ];
      };
      routine_update_blocks: {
        Row: {
          id: string;
          routine_update_id: string;
          name: string;
          scheme: string;
          rpe: string;
          target_kg: number | null;
          note: string | null;
          order_index: number;
          exercise_id: string | null;
          target_distance_km: number | null;
          target_duration_seconds: number | null;
        };
        Insert: {
          id?: string;
          routine_update_id: string;
          name: string;
          scheme?: string;
          rpe?: string;
          target_kg?: number | null;
          note?: string | null;
          order_index?: number;
          exercise_id?: string | null;
          target_distance_km?: number | null;
          target_duration_seconds?: number | null;
        };
        Update: {
          id?: string;
          routine_update_id?: string;
          name?: string;
          scheme?: string;
          rpe?: string;
          target_kg?: number | null;
          note?: string | null;
          order_index?: number;
          exercise_id?: string | null;
          target_distance_km?: number | null;
          target_duration_seconds?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'routine_update_blocks_exercise_id_fkey';
            columns: ['exercise_id'];
            isOneToOne: false;
            referencedRelation: 'exercises';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'routine_update_blocks_routine_update_id_fkey';
            columns: ['routine_update_id'];
            isOneToOne: false;
            referencedRelation: 'routine_updates';
            referencedColumns: ['id'];
          },
        ];
      };
      routine_updates: {
        Row: {
          id: string;
          routine_instance_id: string;
          template_version: number;
          summary: string;
          proposed_at: string;
        };
        Insert: {
          id?: string;
          routine_instance_id: string;
          template_version: number;
          summary?: string;
          proposed_at?: string;
        };
        Update: {
          id?: string;
          routine_instance_id?: string;
          template_version?: number;
          summary?: string;
          proposed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'routine_updates_routine_instance_id_fkey';
            columns: ['routine_instance_id'];
            isOneToOne: true;
            referencedRelation: 'routine_instances';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'routine_updates_routine_instance_id_fkey';
            columns: ['routine_instance_id'];
            isOneToOne: true;
            referencedRelation: 'routine_instance_progress';
            referencedColumns: ['id'];
          },
        ];
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
        Relationships: [
          {
            foreignKeyName: 'sessions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      thread_members: {
        Row: {
          thread_id: string;
          user_id: string;
          role: string;
          last_read_at: string | null;
          joined_at: string;
          left_at: string | null;
          identity: string | null;
          handle: string | null;
        };
        Insert: {
          thread_id: string;
          user_id: string;
          role?: string;
          last_read_at?: string | null;
          joined_at?: string;
          left_at?: string | null;
          identity?: string | null;
          handle?: string | null;
        };
        Update: {
          thread_id?: string;
          user_id?: string;
          role?: string;
          last_read_at?: string | null;
          joined_at?: string;
          left_at?: string | null;
          identity?: string | null;
          handle?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'thread_members_thread_id_fkey';
            columns: ['thread_id'];
            isOneToOne: false;
            referencedRelation: 'threads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'thread_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      threads: {
        Row: {
          id: string;
          kind: string;
          coach_id: string | null;
          client_id: string | null;
          closed_at: string | null;
          created_at: string;
          group_id: string | null;
        };
        Insert: {
          id?: string;
          kind?: string;
          coach_id?: string | null;
          client_id?: string | null;
          closed_at?: string | null;
          created_at?: string;
          group_id?: string | null;
        };
        Update: {
          id?: string;
          kind?: string;
          coach_id?: string | null;
          client_id?: string | null;
          closed_at?: string | null;
          created_at?: string;
          group_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'threads_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'threads_coach_id_fkey';
            columns: ['coach_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'threads_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
        ];
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
          invite_code: string | null;
          deactivated_at: string | null;
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
          invite_code?: string | null;
          deactivated_at?: string | null;
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
          invite_code?: string | null;
          deactivated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'users_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      workout_exercises: {
        Row: {
          id: string;
          workout_session_id: string;
          name: string;
          coach_note: string | null;
          own_note: string | null;
          order_index: number;
          created_at: string;
          updated_at: string;
          exercise_id: string | null;
        };
        Insert: {
          id?: string;
          workout_session_id: string;
          name: string;
          coach_note?: string | null;
          own_note?: string | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
          exercise_id?: string | null;
        };
        Update: {
          id?: string;
          workout_session_id?: string;
          name?: string;
          coach_note?: string | null;
          own_note?: string | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
          exercise_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'workout_exercises_exercise_id_fkey';
            columns: ['exercise_id'];
            isOneToOne: false;
            referencedRelation: 'exercises';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workout_exercises_workout_session_id_fkey';
            columns: ['workout_session_id'];
            isOneToOne: false;
            referencedRelation: 'workout_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      workout_sessions: {
        Row: {
          id: string;
          client_id: string;
          routine_instance_id: string | null;
          title: string;
          started_at: string;
          finished_at: string | null;
          created_at: string;
          updated_at: string;
          imported_from: string | null;
          imported_key: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          routine_instance_id?: string | null;
          title: string;
          started_at?: string;
          finished_at?: string | null;
          created_at?: string;
          updated_at?: string;
          imported_from?: string | null;
          imported_key?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          routine_instance_id?: string | null;
          title?: string;
          started_at?: string;
          finished_at?: string | null;
          created_at?: string;
          updated_at?: string;
          imported_from?: string | null;
          imported_key?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'workout_sessions_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workout_sessions_routine_instance_id_fkey';
            columns: ['routine_instance_id'];
            isOneToOne: false;
            referencedRelation: 'routine_instances';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workout_sessions_routine_instance_id_fkey';
            columns: ['routine_instance_id'];
            isOneToOne: false;
            referencedRelation: 'routine_instance_progress';
            referencedColumns: ['id'];
          },
        ];
      };
      workout_sets: {
        Row: {
          id: string;
          workout_exercise_id: string;
          n: number;
          weight_kg: number;
          reps: number;
          completed: boolean;
          created_at: string;
          updated_at: string;
          updated_by: string | null;
          distance_km: number | null;
          duration_seconds: number | null;
        };
        Insert: {
          id?: string;
          workout_exercise_id: string;
          n: number;
          weight_kg?: number;
          reps?: number;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
          updated_by?: string | null;
          distance_km?: number | null;
          duration_seconds?: number | null;
        };
        Update: {
          id?: string;
          workout_exercise_id?: string;
          n?: number;
          weight_kg?: number;
          reps?: number;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
          updated_by?: string | null;
          distance_km?: number | null;
          duration_seconds?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'workout_sets_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workout_sets_workout_exercise_id_fkey';
            columns: ['workout_exercise_id'];
            isOneToOne: false;
            referencedRelation: 'workout_exercises';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      access_phrase: {
        Args: { p_first: string; p_kind: string; p_domain: string };
        Returns: string;
      };
      add_session_exercise: {
        Args: {
          p_workout_session_id: string;
          p_exercise_id: string;
          p_name: string;
          p_sets: Json;
          p_catalogue_id?: string | null;
        };
        Returns: undefined;
      };
      answer_access_request: {
        Args: { p_request_id: string; p_grant: boolean };
        Returns: undefined;
      };
      assign_program: {
        Args: { p_program_id: string; p_client_ids: string[] };
        Returns: number;
      };
      attach_coach: {
        Args: {
          p_coach_id: string;
          p_workouts?: boolean | null;
          p_nutrition?: boolean | null;
          p_metrics?: boolean | null;
          p_health?: boolean | null;
          p_monthly?: boolean | null;
          p_log_for?: boolean | null;
        };
        Returns: undefined;
      };
      backfill_missing_profiles: {
        Args: Record<string, never>;
        Returns: number;
      };
      can_log_for: {
        Args: { p_client_id: string };
        Returns: boolean;
      };
      client_data_counts: {
        Args: Record<string, never>;
        Returns: { label: string; value: string }[];
      };
      client_stats: {
        Args: { p_client_id: string };
        Returns: { sessions: number; week_streak: number; personal_records: number }[];
      };
      client_weekly_history: {
        Args: { p_client_id: string; p_weeks?: number | null };
        Returns: { week_start: string; done: number; target: number }[];
      };
      coach_who_may_see: {
        Args: { p_client_id: string; p_domain: string };
        Returns: string;
      };
      community_display_name: {
        Args: { p_identity: string; p_full_name: string; p_handle: string };
        Returns: string;
      };
      complete_password_reset_request: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      create_group: {
        Args: { p_name: string; p_identity?: string | null; p_handle?: string | null };
        Returns: string;
      };
      deactivate_account: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      decide_routine_update: {
        Args: { p_routine_instance_id: string; p_accept: boolean };
        Returns: boolean;
      };
      detach_coach: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      domain_label: {
        Args: { p_domain: string };
        Returns: string;
      };
      exercise_filter_options: {
        Args: Record<string, never>;
        Returns: { kind: string; value: string; label: string; count: number }[];
      };
      exercise_meta: {
        Args: { p_equipment: string; p_body_part: string };
        Returns: string;
      };
      exercise_preview: {
        Args: { p_exercise_id?: string | null; p_name?: string | null };
        Returns: {
          id: string;
          name: string;
          gif_path: string;
          external_id: string;
          body_part: string;
          target: string;
          equipment: string;
          secondary_muscles: string[];
          instructions: string[];
          difficulty: string;
        }[];
      };
      group_invited_not_joined: {
        Args: { p_group_id: string };
        Returns: number;
      };
      group_members: {
        Args: { p_group_id: string };
        Returns: { user_id: string; display_name: string; is_admin: boolean; is_coach: boolean }[];
      };
      group_messages: {
        Args: { p_group_id: string };
        Returns: {
          id: string;
          sender_id: string;
          sender_name: string;
          is_coach: boolean;
          body: string;
          created_at: string;
        }[];
      };
      guess_exercise_measure: {
        Args: { p_name: string; p_body_part: string; p_equipment: string };
        Returns: string;
      };
      has_client_permission: {
        Args: { p_client_id: string; p_domain: string };
        Returns: boolean;
      };
      invite_to_group: {
        Args: { p_group_id: string; p_user_ids: string[] };
        Returns: number;
      };
      is_group_admin: {
        Args: { p_group_id: string };
        Returns: boolean;
      };
      is_linked_to: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      is_thread_member: {
        Args: { p_thread_id: string };
        Returns: boolean;
      };
      is_thread_open: {
        Args: { p_thread_id: string };
        Returns: boolean;
      };
      join_group: {
        Args: { p_code: string; p_identity?: string | null; p_handle?: string | null };
        Returns: string;
      };
      leave_group: {
        Args: { p_group_id: string };
        Returns: boolean;
      };
      lookup_coach: {
        Args: { p_code: string };
        Returns: {
          id: string;
          full_name: string;
          avatar_url: string;
          client_count: number;
          gym: string;
          bio: string;
          specialties: string[];
        }[];
      };
      mark_notification_read: {
        Args: { p_id: string };
        Returns: undefined;
      };
      mark_thread_read: {
        Args: { p_thread_id: string };
        Returns: undefined;
      };
      measure_for_block: {
        Args: {
          p_exercise_id: string;
          p_target_kg: number;
          p_target_distance_km: number;
          p_target_duration_seconds: number;
        };
        Returns: string;
      };
      mint_invite_code: {
        Args: { p_name: string };
        Returns: string;
      };
      monthly_check_ins: {
        Args: { p_client_id: string; p_months?: number | null };
        Returns: {
          id: string;
          month_start: string;
          measured_at: string;
          weight_kg: number;
          waist_cm: number;
          chest_cm: number;
          hips_cm: number;
          body_fat_pct: number;
          note: string;
          logged_by_client: boolean;
        }[];
      };
      my_group_invites: {
        Args: Record<string, never>;
        Returns: {
          invite_id: string;
          group_id: string;
          group_name: string;
          invited_by_name: string;
          member_count: number;
        }[];
      };
      my_groups: {
        Args: Record<string, never>;
        Returns: {
          group_id: string;
          thread_id: string;
          name: string;
          join_code: string;
          owner_name: string;
          member_count: number;
          is_admin: boolean;
          my_identity: string;
          my_display_name: string;
          last_body: string;
          last_at: string;
          unread: boolean;
        }[];
      };
      my_threads: {
        Args: Record<string, never>;
        Returns: {
          thread_id: string;
          kind: string;
          coach_id: string;
          client_id: string;
          coach_name: string;
          client_name: string;
          coach_gym: string;
          coach_specialties: string[];
          permissions: Json;
          archived: boolean;
          last_body: string;
          last_at: string;
          unread: boolean;
        }[];
      };
      name_initials: {
        Args: { p_name: string };
        Returns: string;
      };
      new_group_code: {
        Args: Record<string, never>;
        Returns: string;
      };
      notifications_feed: {
        Args: { p_limit?: number | null };
        Returns: {
          id: string;
          kind: string;
          title: string;
          body: string;
          when: string;
          unread: boolean;
          person: Json;
          destination: Json;
          group_id: string;
          group_title: string;
        }[];
      };
      personal_records: {
        Args: { p_client_id: string; p_limit?: number | null };
        Returns: { name: string; weight_kg: number; reps: number; achieved_at: string }[];
      };
      publish_program: {
        Args: { p_program_id: string };
        Returns: number;
      };
      purge_expired_cache: {
        Args: Record<string, never>;
        Returns: number;
      };
      purge_old_password_reset_requests: {
        Args: Record<string, never>;
        Returns: number;
      };
      push_notification: {
        Args: { p_recipient: string; p_actor: string; p_kind: string; p_payload?: Json | null };
        Returns: undefined;
      };
      reactivate_account: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      record_password_reset_request: {
        Args: { p_email: string };
        Returns: undefined;
      };
      regenerate_invite_code: {
        Args: Record<string, never>;
        Returns: string;
      };
      remove_group_member: {
        Args: { p_group_id: string; p_user_id: string };
        Returns: undefined;
      };
      request_access: {
        Args: { p_client_id: string; p_domain: string };
        Returns: string;
      };
      respond_to_group_invite: {
        Args: {
          p_invite_id: string;
          p_accept: boolean;
          p_identity?: string | null;
          p_handle?: string | null;
        };
        Returns: string;
      };
      save_check_in: {
        Args: {
          p_client_id: string;
          p_check_in_id?: string | null;
          p_weight_kg?: number | null;
          p_waist_cm?: number | null;
          p_chest_cm?: number | null;
          p_hips_cm?: number | null;
          p_body_fat_pct?: number | null;
          p_note?: string | null;
        };
        Returns: string;
      };
      save_client_routine: {
        Args: {
          p_routine_instance_id: string;
          p_name: string;
          p_blocks: Json;
          p_note?: string | null;
        };
        Returns: string;
      };
      save_program: {
        Args: {
          p_name: string;
          p_weeks: number;
          p_sessions_per_week: number;
          p_routines: Json;
          p_note?: string | null;
          p_program_id?: string | null;
        };
        Returns: string;
      };
      save_program_blocks: {
        Args: { p_program_routine_id: string; p_blocks: Json };
        Returns: undefined;
      };
      save_routine: {
        Args: {
          p_name: string;
          p_blocks: Json;
          p_note?: string | null;
          p_routine_instance_id?: string | null;
        };
        Returns: string;
      };
      set_coach_permission: {
        Args: { p_domain: string; p_shared: boolean };
        Returns: undefined;
      };
      set_group_admin: {
        Args: { p_group_id: string; p_user_id: string; p_admin: boolean };
        Returns: undefined;
      };
      set_log_for: {
        Args: { p_allowed: boolean };
        Returns: undefined;
      };
      start_workout: {
        Args: { p_routine_instance_id?: string | null; p_title?: string | null };
        Returns: string;
      };
      unassign_program: {
        Args: { p_program_id: string; p_client_ids: string[] };
        Returns: number;
      };
      unread_notification_count: {
        Args: Record<string, never>;
        Returns: number;
      };
      volume_history: {
        Args: { p_client_id: string; p_weeks?: number | null };
        Returns: { week_start: string; volume_kg: number }[];
      };
      weekly_progress: {
        Args: { p_client_id: string };
        Returns: { done: number; target: number }[];
      };
      would_orphan_group: {
        Args: { p_group_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      coach_client_status: 'pending' | 'active' | 'paused' | 'ended';
      program_status: 'draft' | 'published' | 'archived';
      user_role: 'client' | 'coach';
    };
    CompositeTypes: Record<string, never>;
  };
};
