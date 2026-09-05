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
      access_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          email: string | null
          full_name: string
          id: string
          message: string
          requested_company: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          message?: string
          requested_company?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          message?: string
          requested_company?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      action_plan_history: {
        Row: {
          changed_at: string
          comment: string | null
          field: string
          id: string
          new_value: string | null
          old_value: string | null
          plan_id: string
          user_id: string | null
        }
        Insert: {
          changed_at?: string
          comment?: string | null
          field: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          plan_id: string
          user_id?: string | null
        }
        Update: {
          changed_at?: string
          comment?: string | null
          field?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          plan_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_plan_history_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "action_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      action_plans: {
        Row: {
          category: string | null
          cause: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          cronoanalysis_id: string | null
          demand_type: string | null
          description: string | null
          due_date: string | null
          evidences: Json | null
          expected_benefit: string
          expected_result: string | null
          gravity: number | null
          gut_score: number | null
          id: string
          indicator_id: string | null
          interview_id: string | null
          new_due_date: string | null
          observations: string | null
          opportunity_id: string | null
          origin: string | null
          pain_point_id: string | null
          priority: Database["public"]["Enums"]["action_priority"]
          problem: string | null
          process_id: string | null
          process_ids: string[] | null
          project_id: string | null
          public_token: string | null
          related_process_ids: string[] | null
          responsible: string | null
          root_cause_id: string | null
          sector: string | null
          status: Database["public"]["Enums"]["action_status"]
          title: string
          trend: number | null
          updated_at: string
          urgency: number | null
        }
        Insert: {
          category?: string | null
          cause?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          cronoanalysis_id?: string | null
          demand_type?: string | null
          description?: string | null
          due_date?: string | null
          evidences?: Json | null
          expected_benefit?: string
          expected_result?: string | null
          gravity?: number | null
          gut_score?: number | null
          id?: string
          indicator_id?: string | null
          interview_id?: string | null
          new_due_date?: string | null
          observations?: string | null
          opportunity_id?: string | null
          origin?: string | null
          pain_point_id?: string | null
          priority?: Database["public"]["Enums"]["action_priority"]
          problem?: string | null
          process_id?: string | null
          process_ids?: string[] | null
          project_id?: string | null
          public_token?: string | null
          related_process_ids?: string[] | null
          responsible?: string | null
          root_cause_id?: string | null
          sector?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          title: string
          trend?: number | null
          updated_at?: string
          urgency?: number | null
        }
        Update: {
          category?: string | null
          cause?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          cronoanalysis_id?: string | null
          demand_type?: string | null
          description?: string | null
          due_date?: string | null
          evidences?: Json | null
          expected_benefit?: string
          expected_result?: string | null
          gravity?: number | null
          gut_score?: number | null
          id?: string
          indicator_id?: string | null
          interview_id?: string | null
          new_due_date?: string | null
          observations?: string | null
          opportunity_id?: string | null
          origin?: string | null
          pain_point_id?: string | null
          priority?: Database["public"]["Enums"]["action_priority"]
          problem?: string | null
          process_id?: string | null
          process_ids?: string[] | null
          project_id?: string | null
          public_token?: string | null
          related_process_ids?: string[] | null
          responsible?: string | null
          root_cause_id?: string | null
          sector?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          title?: string
          trend?: number | null
          updated_at?: string
          urgency?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "action_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_cronoanalysis_id_fkey"
            columns: ["cronoanalysis_id"]
            isOneToOne: false
            referencedRelation: "cronoanalysis_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "v_indicator_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "improvement_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_pain_point_id_fkey"
            columns: ["pain_point_id"]
            isOneToOne: false
            referencedRelation: "pain_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_plans_root_cause_id_fkey"
            columns: ["root_cause_id"]
            isOneToOne: false
            referencedRelation: "root_cause_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_connections: {
        Row: {
          created_at: string
          from_activity_id: string
          id: string
          label: string
          order_index: number
          process_id: string
          to_activity_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_activity_id: string
          id?: string
          label?: string
          order_index?: number
          process_id: string
          to_activity_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_activity_id?: string
          id?: string
          label?: string
          order_index?: number
          process_id?: string
          to_activity_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_connections_from_activity_id_fkey"
            columns: ["from_activity_id"]
            isOneToOne: false
            referencedRelation: "process_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_connections_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_connections_to_activity_id_fkey"
            columns: ["to_activity_id"]
            isOneToOne: false
            referencedRelation: "process_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_links: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          link_type: string
          target_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          link_type: string
          target_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          link_type?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_links_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "process_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          company_id: string | null
          created_at: string
          details: Json
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          company_id?: string | null
          created_at?: string
          details?: Json
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          company_id?: string | null
          created_at?: string
          details?: Json
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          activity_type: string | null
          audio_url: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string
          duration_min: number | null
          ends_at: string | null
          event_type: string
          id: string
          location: string
          minutes: string | null
          next_actions: Json | null
          participants: string[]
          project_id: string | null
          starts_at: string
          title: string
          transcript: string | null
          travel_min: number | null
          updated_at: string
          work_hours: number | null
        }
        Insert: {
          activity_type?: string | null
          audio_url?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          duration_min?: number | null
          ends_at?: string | null
          event_type?: string
          id?: string
          location?: string
          minutes?: string | null
          next_actions?: Json | null
          participants?: string[]
          project_id?: string | null
          starts_at: string
          title: string
          transcript?: string | null
          travel_min?: number | null
          updated_at?: string
          work_hours?: number | null
        }
        Update: {
          activity_type?: string | null
          audio_url?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          duration_min?: number | null
          ends_at?: string | null
          event_type?: string
          id?: string
          location?: string
          minutes?: string | null
          next_actions?: Json | null
          participants?: string[]
          project_id?: string | null
          starts_at?: string
          title?: string
          transcript?: string | null
          travel_min?: number | null
          updated_at?: string
          work_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          public_company_logo_url: string | null
          public_consultancy_logo_url: string | null
          public_enabled: boolean
          public_title: string | null
          public_token: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          public_company_logo_url?: string | null
          public_consultancy_logo_url?: string | null
          public_enabled?: boolean
          public_title?: string | null
          public_token?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          public_company_logo_url?: string | null
          public_consultancy_logo_url?: string | null
          public_enabled?: boolean
          public_title?: string | null
          public_token?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          member_role: string
          permissions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          member_role?: string
          permissions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          member_role?: string
          permissions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cronoanalysis_observations: {
        Row: {
          activity: string
          classification: Database["public"]["Enums"]["va_class"]
          created_at: string
          id: string
          notes: string | null
          ordering: number
          session_id: string
          time_minutes: number
        }
        Insert: {
          activity: string
          classification?: Database["public"]["Enums"]["va_class"]
          created_at?: string
          id?: string
          notes?: string | null
          ordering?: number
          session_id: string
          time_minutes?: number
        }
        Update: {
          activity?: string
          classification?: Database["public"]["Enums"]["va_class"]
          created_at?: string
          id?: string
          notes?: string | null
          ordering?: number
          session_id?: string
          time_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "cronoanalysis_observations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cronoanalysis_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cronoanalysis_sessions: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          machine: string | null
          notes: string | null
          observation_date: string
          observer: string | null
          process_id: string | null
          product: string | null
          production_line: string | null
          project_id: string | null
          takt_time: number | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          machine?: string | null
          notes?: string | null
          observation_date?: string
          observer?: string | null
          process_id?: string | null
          product?: string | null
          production_line?: string | null
          project_id?: string | null
          takt_time?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          machine?: string | null
          notes?: string | null
          observation_date?: string
          observer?: string | null
          process_id?: string | null
          product?: string | null
          production_line?: string | null
          project_id?: string | null
          takt_time?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cronoanalysis_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronoanalysis_sessions_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronoanalysis_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          accent_color: string
          client_logo_url: string | null
          code_prefix: string
          company_id: string | null
          consultancy_logo_url: string | null
          created_at: string
          font_family: string
          footer_html: string
          header_html: string
          id: string
          is_default: boolean
          name: string
          numbering_seed: number
          primary_color: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          client_logo_url?: string | null
          code_prefix?: string
          company_id?: string | null
          consultancy_logo_url?: string | null
          created_at?: string
          font_family?: string
          footer_html?: string
          header_html?: string
          id?: string
          is_default?: boolean
          name?: string
          numbering_seed?: number
          primary_color?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          client_logo_url?: string | null
          code_prefix?: string
          company_id?: string | null
          consultancy_logo_url?: string | null
          created_at?: string
          font_family?: string
          footer_html?: string
          header_html?: string
          id?: string
          is_default?: boolean
          name?: string
          numbering_seed?: number
          primary_color?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_diagnostics: {
        Row: {
          company_id: string
          content: Json
          created_at: string
          created_by: string | null
          edited_at: string | null
          generated_at: string
          id: string
          project_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          content?: Json
          created_at?: string
          created_by?: string | null
          edited_at?: string | null
          generated_at?: string
          id?: string
          project_id?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          edited_at?: string | null
          generated_at?: string
          id?: string
          project_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "executive_diagnostics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executive_diagnostics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      improvement_opportunities: {
        Row: {
          action_plan_id: string | null
          category: string
          company_id: string
          confidence: number | null
          created_at: string
          created_by: string | null
          description: string
          effort: Database["public"]["Enums"]["effort_level"]
          expected_benefit: string
          generated_by_ai: boolean
          id: string
          impact: Database["public"]["Enums"]["impact_level"]
          indicator_id: string | null
          pain_point_id: string | null
          priority: Database["public"]["Enums"]["opportunity_priority"]
          priority_score: number
          process_id: string | null
          project_id: string | null
          root_cause_id: string | null
          source: Database["public"]["Enums"]["opportunity_source"]
          source_interview_id: string | null
          status: Database["public"]["Enums"]["opportunity_status"]
          title: string
          tobe_process_id: string | null
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          action_plan_id?: string | null
          category?: string
          company_id: string
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          description?: string
          effort?: Database["public"]["Enums"]["effort_level"]
          expected_benefit?: string
          generated_by_ai?: boolean
          id?: string
          impact?: Database["public"]["Enums"]["impact_level"]
          indicator_id?: string | null
          pain_point_id?: string | null
          priority?: Database["public"]["Enums"]["opportunity_priority"]
          priority_score?: number
          process_id?: string | null
          project_id?: string | null
          root_cause_id?: string | null
          source?: Database["public"]["Enums"]["opportunity_source"]
          source_interview_id?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          title: string
          tobe_process_id?: string | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          action_plan_id?: string | null
          category?: string
          company_id?: string
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          description?: string
          effort?: Database["public"]["Enums"]["effort_level"]
          expected_benefit?: string
          generated_by_ai?: boolean
          id?: string
          impact?: Database["public"]["Enums"]["impact_level"]
          indicator_id?: string | null
          pain_point_id?: string | null
          priority?: Database["public"]["Enums"]["opportunity_priority"]
          priority_score?: number
          process_id?: string | null
          project_id?: string | null
          root_cause_id?: string | null
          source?: Database["public"]["Enums"]["opportunity_source"]
          source_interview_id?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          title?: string
          tobe_process_id?: string | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "improvement_opportunities_action_plan_fk"
            columns: ["action_plan_id"]
            isOneToOne: false
            referencedRelation: "action_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "improvement_opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "improvement_opportunities_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "improvement_opportunities_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "v_indicator_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "improvement_opportunities_pain_point_id_fkey"
            columns: ["pain_point_id"]
            isOneToOne: false
            referencedRelation: "pain_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "improvement_opportunities_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "improvement_opportunities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "improvement_opportunities_root_cause_fk"
            columns: ["root_cause_id"]
            isOneToOne: false
            referencedRelation: "root_cause_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "improvement_opportunities_source_interview_id_fkey"
            columns: ["source_interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "improvement_opportunities_tobe_process_id_fkey"
            columns: ["tobe_process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_collections: {
        Row: {
          created_at: string
          evaluation: string
          id: string
          indicator_id: string
          ip_hash: string | null
          observation: string | null
          reference_period: string | null
          submitted_at: string
          submitted_by_name: string | null
          value: number
        }
        Insert: {
          created_at?: string
          evaluation?: string
          id?: string
          indicator_id: string
          ip_hash?: string | null
          observation?: string | null
          reference_period?: string | null
          submitted_at?: string
          submitted_by_name?: string | null
          value: number
        }
        Update: {
          created_at?: string
          evaluation?: string
          id?: string
          indicator_id?: string
          ip_hash?: string | null
          observation?: string | null
          reference_period?: string | null
          submitted_at?: string
          submitted_by_name?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "indicator_collections_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_collections_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "v_indicator_status"
            referencedColumns: ["id"]
          },
        ]
      }
      indicators: {
        Row: {
          code: string | null
          company_id: string | null
          confidence: number | null
          created_at: string
          critical_max: number | null
          critical_min: number | null
          description: string | null
          direction: string
          frequency: string | null
          generated_by_ai: boolean
          id: string
          instructions: string | null
          name: string
          process_id: string | null
          process_ids: string[] | null
          project_id: string | null
          public_token: string | null
          responsible_email: string | null
          responsible_name: string | null
          source_interview_id: string | null
          target: number | null
          unit: string | null
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          code?: string | null
          company_id?: string | null
          confidence?: number | null
          created_at?: string
          critical_max?: number | null
          critical_min?: number | null
          description?: string | null
          direction?: string
          frequency?: string | null
          generated_by_ai?: boolean
          id?: string
          instructions?: string | null
          name: string
          process_id?: string | null
          process_ids?: string[] | null
          project_id?: string | null
          public_token?: string | null
          responsible_email?: string | null
          responsible_name?: string | null
          source_interview_id?: string | null
          target?: number | null
          unit?: string | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          code?: string | null
          company_id?: string | null
          confidence?: number | null
          created_at?: string
          critical_max?: number | null
          critical_min?: number | null
          description?: string | null
          direction?: string
          frequency?: string | null
          generated_by_ai?: boolean
          id?: string
          instructions?: string | null
          name?: string
          process_id?: string | null
          process_ids?: string[] | null
          project_id?: string | null
          public_token?: string | null
          responsible_email?: string | null
          responsible_name?: string | null
          source_interview_id?: string | null
          target?: number | null
          unit?: string | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indicators_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicators_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicators_source_interview_id_fkey"
            columns: ["source_interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_analysis: {
        Row: {
          critical_points: Json
          decisions: Json
          flows: Json
          id: string
          insights: Json
          interview_id: string
          pains: Json
          problems: Json
          summary: string
          systems: Json
          updated_at: string
        }
        Insert: {
          critical_points?: Json
          decisions?: Json
          flows?: Json
          id?: string
          insights?: Json
          interview_id: string
          pains?: Json
          problems?: Json
          summary?: string
          systems?: Json
          updated_at?: string
        }
        Update: {
          critical_points?: Json
          decisions?: Json
          flows?: Json
          id?: string
          insights?: Json
          interview_id?: string
          pains?: Json
          problems?: Json
          summary?: string
          systems?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_analysis_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: true
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          audio_duration_sec: number | null
          audio_mime: string | null
          audio_parts: string[] | null
          audio_path: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          generated_at: string | null
          generation_status: string
          id: string
          interview_date: string
          meeting_type: string | null
          minutes_md: string | null
          participant: string | null
          project_id: string | null
          sector_id: string | null
          status: string
          title: string
          transcript_hash: string | null
          updated_at: string
        }
        Insert: {
          audio_duration_sec?: number | null
          audio_mime?: string | null
          audio_parts?: string[] | null
          audio_path?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          generated_at?: string | null
          generation_status?: string
          id?: string
          interview_date?: string
          meeting_type?: string | null
          minutes_md?: string | null
          participant?: string | null
          project_id?: string | null
          sector_id?: string | null
          status?: string
          title: string
          transcript_hash?: string | null
          updated_at?: string
        }
        Update: {
          audio_duration_sec?: number | null
          audio_mime?: string | null
          audio_parts?: string[] | null
          audio_path?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          generated_at?: string | null
          generation_status?: string
          id?: string
          interview_date?: string
          meeting_type?: string | null
          minutes_md?: string | null
          participant?: string | null
          project_id?: string | null
          sector_id?: string | null
          status?: string
          title?: string
          transcript_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          company_id: string
          created_at: string
          description: string
          expenses_amount: number
          hours: number
          hours_amount: number
          id: string
          invoice_id: string
          tools_amount: number
          work_hour_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string
          expenses_amount?: number
          hours?: number
          hours_amount?: number
          id?: string
          invoice_id: string
          tools_amount?: number
          work_hour_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string
          expenses_amount?: number
          hours?: number
          hours_amount?: number
          id?: string
          invoice_id?: string
          tools_amount?: number
          work_hour_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_work_hour_id_fkey"
            columns: ["work_hour_id"]
            isOneToOne: false
            referencedRelation: "work_hours"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          company_id: string
          created_at: string
          expenses_amount: number
          hourly_rate: number
          hours_amount: number
          hours_total: number
          id: string
          invoiced_at: string
          invoiced_by: string | null
          notes: string
          period_end: string | null
          period_start: string | null
          project_id: string | null
          status: string
          tools_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          expenses_amount?: number
          hourly_rate?: number
          hours_amount?: number
          hours_total?: number
          id?: string
          invoiced_at?: string
          invoiced_by?: string | null
          notes?: string
          period_end?: string | null
          period_start?: string | null
          project_id?: string | null
          status?: string
          tools_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          expenses_amount?: number
          hourly_rate?: number
          hours_amount?: number
          hours_total?: number
          id?: string
          invoiced_at?: string
          invoiced_by?: string | null
          notes?: string
          period_end?: string | null
          period_start?: string | null
          project_id?: string | null
          status?: string
          tools_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pain_points: {
        Row: {
          category: Database["public"]["Enums"]["pain_category"]
          company_id: string | null
          confidence: number | null
          created_at: string
          description: string
          generated_by_ai: boolean
          id: string
          project_id: string | null
          severity: number
          source: Database["public"]["Enums"]["pain_source"]
          source_id: string | null
          source_interview_id: string | null
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["pain_category"]
          company_id?: string | null
          confidence?: number | null
          created_at?: string
          description: string
          generated_by_ai?: boolean
          id?: string
          project_id?: string | null
          severity?: number
          source?: Database["public"]["Enums"]["pain_source"]
          source_id?: string | null
          source_interview_id?: string | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["pain_category"]
          company_id?: string | null
          confidence?: number | null
          created_at?: string
          description?: string
          generated_by_ai?: boolean
          id?: string
          project_id?: string | null
          severity?: number
          source?: Database["public"]["Enums"]["pain_source"]
          source_id?: string | null
          source_interview_id?: string | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pain_points_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pain_points_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pain_points_source_interview_id_fkey"
            columns: ["source_interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string | null
          method: string
          notes: string
          paid_at: string
          project_id: string | null
          reference: string
          updated_at: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          method?: string
          notes?: string
          paid_at?: string
          project_id?: string | null
          reference?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          method?: string
          notes?: string
          paid_at?: string
          project_id?: string | null
          reference?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pops: {
        Row: {
          company_id: string | null
          content: Json
          created_at: string
          created_by: string | null
          id: string
          process_id: string | null
          project_id: string | null
          source_path: string | null
          source_type: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          process_id?: string | null
          project_id?: string | null
          source_path?: string | null
          source_type?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          process_id?: string | null
          project_id?: string | null
          source_path?: string | null
          source_type?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pops_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pops_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pops_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      prioritization_criteria: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          updated_at: string
          weights: Json
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
          weights?: Json
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          weights?: Json
        }
        Relationships: [
          {
            foreignKeyName: "prioritization_criteria_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      process_activities: {
        Row: {
          area: string | null
          attachments: Json
          confidence: number | null
          created_at: string
          description: string | null
          documents: string[]
          generated_by_ai: boolean
          id: string
          improvements: string
          inputs: string
          interview_snippet: string
          notes: string | null
          ordering: number
          outputs: string
          problems: string
          process_id: string
          responsible: string | null
          source_interview_id: string | null
          systems: string[]
          time_minutes: number | null
          title: string
          type: Database["public"]["Enums"]["activity_type"]
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          x: number | null
          y: number | null
        }
        Insert: {
          area?: string | null
          attachments?: Json
          confidence?: number | null
          created_at?: string
          description?: string | null
          documents?: string[]
          generated_by_ai?: boolean
          id?: string
          improvements?: string
          inputs?: string
          interview_snippet?: string
          notes?: string | null
          ordering?: number
          outputs?: string
          problems?: string
          process_id: string
          responsible?: string | null
          source_interview_id?: string | null
          systems?: string[]
          time_minutes?: number | null
          title: string
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          x?: number | null
          y?: number | null
        }
        Update: {
          area?: string | null
          attachments?: Json
          confidence?: number | null
          created_at?: string
          description?: string | null
          documents?: string[]
          generated_by_ai?: boolean
          id?: string
          improvements?: string
          inputs?: string
          interview_snippet?: string
          notes?: string | null
          ordering?: number
          outputs?: string
          problems?: string
          process_id?: string
          responsible?: string | null
          source_interview_id?: string | null
          systems?: string[]
          time_minutes?: number | null
          title?: string
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          x?: number | null
          y?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "process_activities_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_activities_source_interview_id_fkey"
            columns: ["source_interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      process_decision_map: {
        Row: {
          activity_id: string | null
          approval_required: boolean | null
          confidence: number | null
          created_at: string
          criteria: string | null
          data_used: string | null
          decider: string | null
          decision: string | null
          financial_impact: number | null
          frequency: string | null
          generated_by_ai: boolean
          id: string
          notes: string | null
          process_id: string
          reported_delay: string | null
          source_interview_id: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          activity_id?: string | null
          approval_required?: boolean | null
          confidence?: number | null
          created_at?: string
          criteria?: string | null
          data_used?: string | null
          decider?: string | null
          decision?: string | null
          financial_impact?: number | null
          frequency?: string | null
          generated_by_ai?: boolean
          id?: string
          notes?: string | null
          process_id: string
          reported_delay?: string | null
          source_interview_id?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          activity_id?: string | null
          approval_required?: boolean | null
          confidence?: number | null
          created_at?: string
          criteria?: string | null
          data_used?: string | null
          decider?: string | null
          decision?: string | null
          financial_impact?: number | null
          frequency?: string | null
          generated_by_ai?: boolean
          id?: string
          notes?: string | null
          process_id?: string
          reported_delay?: string | null
          source_interview_id?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_decision_map_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "process_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_decision_map_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_decision_map_source_interview_id_fkey"
            columns: ["source_interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      process_decisions: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          question: string
          updated_at: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          question?: string
          updated_at?: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          question?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_decisions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: true
            referencedRelation: "process_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      process_edges: {
        Row: {
          created_at: string
          id: string
          label: string | null
          process_id: string
          source_id: string
          target_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          process_id: string
          source_id: string
          target_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          process_id?: string
          source_id?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_edges_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_edges_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "process_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_edges_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "process_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      process_information_map: {
        Row: {
          activity_id: string | null
          confidence: number | null
          created_at: string
          destination: string | null
          document: string | null
          generated_by_ai: boolean
          has_rework: boolean | null
          id: string
          is_automated: boolean | null
          is_digital: boolean | null
          loss_risk: boolean | null
          medium: string | null
          notes: string | null
          origin: string | null
          periodicity: string | null
          process_id: string
          responsible: string | null
          source_interview_id: string | null
          system: string | null
          time_minutes: number | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          activity_id?: string | null
          confidence?: number | null
          created_at?: string
          destination?: string | null
          document?: string | null
          generated_by_ai?: boolean
          has_rework?: boolean | null
          id?: string
          is_automated?: boolean | null
          is_digital?: boolean | null
          loss_risk?: boolean | null
          medium?: string | null
          notes?: string | null
          origin?: string | null
          periodicity?: string | null
          process_id: string
          responsible?: string | null
          source_interview_id?: string | null
          system?: string | null
          time_minutes?: number | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          activity_id?: string | null
          confidence?: number | null
          created_at?: string
          destination?: string | null
          document?: string | null
          generated_by_ai?: boolean
          has_rework?: boolean | null
          id?: string
          is_automated?: boolean | null
          is_digital?: boolean | null
          loss_risk?: boolean | null
          medium?: string | null
          notes?: string | null
          origin?: string | null
          periodicity?: string | null
          process_id?: string
          responsible?: string | null
          source_interview_id?: string | null
          system?: string | null
          time_minutes?: number | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_information_map_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "process_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_information_map_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_information_map_source_interview_id_fkey"
            columns: ["source_interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      process_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["version_kind"]
          label: string
          notes: string
          process_id: string
          snapshot: Json
          version_no: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind: Database["public"]["Enums"]["version_kind"]
          label?: string
          notes?: string
          process_id: string
          snapshot?: Json
          version_no: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["version_kind"]
          label?: string
          notes?: string
          process_id?: string
          snapshot?: Json
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "process_versions_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      processes: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          inputs: string | null
          kind: Database["public"]["Enums"]["process_kind"]
          level: Database["public"]["Enums"]["process_level"]
          name: string
          objective: string | null
          outputs: string | null
          parent_id: string | null
          project_id: string | null
          responsible: string | null
          source_interview_id: string | null
          source_process_id: string | null
          status: Database["public"]["Enums"]["process_status"]
          systems: string[]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          inputs?: string | null
          kind?: Database["public"]["Enums"]["process_kind"]
          level?: Database["public"]["Enums"]["process_level"]
          name: string
          objective?: string | null
          outputs?: string | null
          parent_id?: string | null
          project_id?: string | null
          responsible?: string | null
          source_interview_id?: string | null
          source_process_id?: string | null
          status?: Database["public"]["Enums"]["process_status"]
          systems?: string[]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          inputs?: string | null
          kind?: Database["public"]["Enums"]["process_kind"]
          level?: Database["public"]["Enums"]["process_level"]
          name?: string
          objective?: string | null
          outputs?: string | null
          parent_id?: string | null
          project_id?: string | null
          responsible?: string | null
          source_interview_id?: string | null
          source_process_id?: string | null
          status?: Database["public"]["Enums"]["process_status"]
          systems?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "processes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processes_source_interview_id_fkey"
            columns: ["source_interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processes_source_process_id_fkey"
            columns: ["source_process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          is_superadmin: boolean
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          is_superadmin?: boolean
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          is_superadmin?: boolean
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          progress_pct: number
          responsible: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          progress_pct?: number
          responsible?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          progress_pct?: number
          responsible?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_items: {
        Row: {
          area: string
          company_id: string
          created_at: string
          deadline: string | null
          description: string
          effort: Database["public"]["Enums"]["effort_level"]
          expected_impact: string
          horizon: Database["public"]["Enums"]["roadmap_horizon"]
          id: string
          opportunity_id: string | null
          priority: Database["public"]["Enums"]["opportunity_priority"]
          project_id: string | null
          responsible: string
          status: Database["public"]["Enums"]["roadmap_status"]
          theme: string
          title: string
          updated_at: string
        }
        Insert: {
          area?: string
          company_id: string
          created_at?: string
          deadline?: string | null
          description?: string
          effort?: Database["public"]["Enums"]["effort_level"]
          expected_impact?: string
          horizon?: Database["public"]["Enums"]["roadmap_horizon"]
          id?: string
          opportunity_id?: string | null
          priority?: Database["public"]["Enums"]["opportunity_priority"]
          project_id?: string | null
          responsible?: string
          status?: Database["public"]["Enums"]["roadmap_status"]
          theme?: string
          title: string
          updated_at?: string
        }
        Update: {
          area?: string
          company_id?: string
          created_at?: string
          deadline?: string | null
          description?: string
          effort?: Database["public"]["Enums"]["effort_level"]
          expected_impact?: string
          horizon?: Database["public"]["Enums"]["roadmap_horizon"]
          id?: string
          opportunity_id?: string | null
          priority?: Database["public"]["Enums"]["opportunity_priority"]
          project_id?: string | null
          responsible?: string
          status?: Database["public"]["Enums"]["roadmap_status"]
          theme?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmap_items_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "improvement_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadmap_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      root_cause_actions: {
        Row: {
          action_plan_id: string | null
          analysis_id: string
          created_at: string
          description: string
          id: string
          kind: Database["public"]["Enums"]["rca_action_kind"]
        }
        Insert: {
          action_plan_id?: string | null
          analysis_id: string
          created_at?: string
          description: string
          id?: string
          kind?: Database["public"]["Enums"]["rca_action_kind"]
        }
        Update: {
          action_plan_id?: string | null
          analysis_id?: string
          created_at?: string
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["rca_action_kind"]
        }
        Relationships: [
          {
            foreignKeyName: "root_cause_actions_action_plan_id_fkey"
            columns: ["action_plan_id"]
            isOneToOne: false
            referencedRelation: "action_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "root_cause_actions_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "root_cause_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      root_cause_analyses: {
        Row: {
          company_id: string
          conclusion: string
          created_at: string
          created_by: string | null
          data: Json
          id: string
          method: Database["public"]["Enums"]["rca_method"]
          opportunity_id: string | null
          pain_point_id: string | null
          problem: string
          process_id: string | null
          project_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          conclusion?: string
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          method?: Database["public"]["Enums"]["rca_method"]
          opportunity_id?: string | null
          pain_point_id?: string | null
          problem: string
          process_id?: string | null
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          conclusion?: string
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          method?: Database["public"]["Enums"]["rca_method"]
          opportunity_id?: string | null
          pain_point_id?: string | null
          problem?: string
          process_id?: string | null
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "root_cause_analyses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "root_cause_analyses_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "improvement_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "root_cause_analyses_pain_point_id_fkey"
            columns: ["pain_point_id"]
            isOneToOne: false
            referencedRelation: "pain_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "root_cause_analyses_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "root_cause_analyses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sectors: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "sectors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tobe_change_log: {
        Row: {
          change_type: Database["public"]["Enums"]["tobe_change_type"]
          created_at: string
          expected_benefit: string
          id: string
          indicator_id: string | null
          opportunity_id: string | null
          problem_addressed: string
          target_ref: string
          tobe_process_id: string
        }
        Insert: {
          change_type: Database["public"]["Enums"]["tobe_change_type"]
          created_at?: string
          expected_benefit?: string
          id?: string
          indicator_id?: string | null
          opportunity_id?: string | null
          problem_addressed?: string
          target_ref?: string
          tobe_process_id: string
        }
        Update: {
          change_type?: Database["public"]["Enums"]["tobe_change_type"]
          created_at?: string
          expected_benefit?: string
          id?: string
          indicator_id?: string | null
          opportunity_id?: string | null
          problem_addressed?: string
          target_ref?: string
          tobe_process_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tobe_change_log_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tobe_change_log_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "v_indicator_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tobe_change_log_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "improvement_opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tobe_change_log_tobe_process_id_fkey"
            columns: ["tobe_process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      transcript_edits: {
        Row: {
          edited_at: string
          edited_by: string | null
          id: string
          previous_content: string
          transcript_id: string
        }
        Insert: {
          edited_at?: string
          edited_by?: string | null
          id?: string
          previous_content: string
          transcript_id: string
        }
        Update: {
          edited_at?: string
          edited_by?: string | null
          id?: string
          previous_content?: string
          transcript_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcript_edits_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "transcripts"
            referencedColumns: ["id"]
          },
        ]
      }
      transcripts: {
        Row: {
          content: string
          id: string
          interview_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          id?: string
          interview_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          id?: string
          interview_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: true
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_hour_expenses: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          project_id: string | null
          updated_at: string
          work_hour_id: string
        }
        Insert: {
          amount?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          project_id?: string | null
          updated_at?: string
          work_hour_id: string
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          project_id?: string | null
          updated_at?: string
          work_hour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_hour_expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_hour_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_hour_expenses_work_hour_id_fkey"
            columns: ["work_hour_id"]
            isOneToOne: false
            referencedRelation: "work_hours"
            referencedColumns: ["id"]
          },
        ]
      }
      work_hour_tools: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          project_id: string | null
          quantity: number
          updated_at: string
          work_hour_id: string
        }
        Insert: {
          amount?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          project_id?: string | null
          quantity?: number
          updated_at?: string
          work_hour_id: string
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          project_id?: string | null
          quantity?: number
          updated_at?: string
          work_hour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_hour_tools_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_hour_tools_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_hour_tools_work_hour_id_fkey"
            columns: ["work_hour_id"]
            isOneToOne: false
            referencedRelation: "work_hours"
            referencedColumns: ["id"]
          },
        ]
      }
      work_hours: {
        Row: {
          activity_type: string
          billing_status: string
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string
          end_time: string | null
          hours: number
          id: string
          invoice_id: string | null
          invoiced_at: string | null
          invoiced_by: string | null
          notes: string
          project_id: string | null
          responsible: string
          start_time: string | null
          updated_at: string
          user_id: string | null
          work_date: string
        }
        Insert: {
          activity_type?: string
          billing_status?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          end_time?: string | null
          hours?: number
          id?: string
          invoice_id?: string | null
          invoiced_at?: string | null
          invoiced_by?: string | null
          notes?: string
          project_id?: string | null
          responsible?: string
          start_time?: string | null
          updated_at?: string
          user_id?: string | null
          work_date?: string
        }
        Update: {
          activity_type?: string
          billing_status?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          end_time?: string | null
          hours?: number
          id?: string
          invoice_id?: string | null
          invoiced_at?: string | null
          invoiced_by?: string | null
          notes?: string
          project_id?: string | null
          responsible?: string
          start_time?: string | null
          updated_at?: string
          user_id?: string | null
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_hours_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_hours_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_hours_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_indicator_status: {
        Row: {
          code: string | null
          company_id: string | null
          critical_max: number | null
          critical_min: number | null
          frequency: string | null
          id: string | null
          last_at: string | null
          last_evaluation: string | null
          last_value: number | null
          name: string | null
          next_due_at: string | null
          process_id: string | null
          project_id: string | null
          public_token: string | null
          responsible_name: string | null
          status: string | null
          target: number | null
          unit: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indicators_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicators_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      action_priority: "baixa" | "media" | "alta" | "critica"
      action_status: "aberto" | "em_andamento" | "concluido"
      activity_type:
        | "start"
        | "task"
        | "decision"
        | "wait"
        | "approval"
        | "end"
        | "info_in"
        | "info_out"
      app_role: "admin" | "member"
      effort_level: "baixo" | "medio" | "alto"
      impact_level: "baixo" | "medio" | "alto"
      opportunity_priority: "baixa" | "media" | "alta" | "critica"
      opportunity_source: "ia" | "manual"
      opportunity_status:
        | "sugerida"
        | "aprovada"
        | "rejeitada"
        | "em_andamento"
        | "implementada"
      pain_category:
        | "processo"
        | "informacao"
        | "governanca"
        | "pessoas"
        | "tecnologia"
        | "planejamento"
        | "qualidade"
        | "producao"
        | "compras"
        | "logistica"
      pain_source: "interview" | "process" | "cronoanalysis" | "manual"
      process_kind: "as_is" | "to_be"
      process_level: "0" | "1" | "2"
      process_status: "draft" | "approved" | "archived"
      project_status:
        | "planejamento"
        | "em_andamento"
        | "pausado"
        | "concluido"
        | "arquivado"
      rca_action_kind: "corretiva" | "preventiva"
      rca_method: "cinco_porques" | "ishikawa" | "categoria"
      roadmap_horizon: "curto" | "medio" | "longo"
      roadmap_status: "planejado" | "em_andamento" | "concluido" | "cancelado"
      tobe_change_type: "added" | "removed" | "modified" | "simplified"
      va_class: "VA" | "NVA" | "NNVA"
      version_kind: "as_is" | "to_be"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      action_priority: ["baixa", "media", "alta", "critica"],
      action_status: ["aberto", "em_andamento", "concluido"],
      activity_type: [
        "start",
        "task",
        "decision",
        "wait",
        "approval",
        "end",
        "info_in",
        "info_out",
      ],
      app_role: ["admin", "member"],
      effort_level: ["baixo", "medio", "alto"],
      impact_level: ["baixo", "medio", "alto"],
      opportunity_priority: ["baixa", "media", "alta", "critica"],
      opportunity_source: ["ia", "manual"],
      opportunity_status: [
        "sugerida",
        "aprovada",
        "rejeitada",
        "em_andamento",
        "implementada",
      ],
      pain_category: [
        "processo",
        "informacao",
        "governanca",
        "pessoas",
        "tecnologia",
        "planejamento",
        "qualidade",
        "producao",
        "compras",
        "logistica",
      ],
      pain_source: ["interview", "process", "cronoanalysis", "manual"],
      process_kind: ["as_is", "to_be"],
      process_level: ["0", "1", "2"],
      process_status: ["draft", "approved", "archived"],
      project_status: [
        "planejamento",
        "em_andamento",
        "pausado",
        "concluido",
        "arquivado",
      ],
      rca_action_kind: ["corretiva", "preventiva"],
      rca_method: ["cinco_porques", "ishikawa", "categoria"],
      roadmap_horizon: ["curto", "medio", "longo"],
      roadmap_status: ["planejado", "em_andamento", "concluido", "cancelado"],
      tobe_change_type: ["added", "removed", "modified", "simplified"],
      va_class: ["VA", "NVA", "NNVA"],
      version_kind: ["as_is", "to_be"],
    },
  },
} as const
