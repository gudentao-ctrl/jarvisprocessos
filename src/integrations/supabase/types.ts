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
      action_plans: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          cronoanalysis_id: string | null
          description: string | null
          due_date: string | null
          id: string
          indicator_id: string | null
          interview_id: string | null
          pain_point_id: string | null
          priority: Database["public"]["Enums"]["action_priority"]
          process_id: string | null
          responsible: string | null
          status: Database["public"]["Enums"]["action_status"]
          title: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          cronoanalysis_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          indicator_id?: string | null
          interview_id?: string | null
          pain_point_id?: string | null
          priority?: Database["public"]["Enums"]["action_priority"]
          process_id?: string | null
          responsible?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          cronoanalysis_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          indicator_id?: string | null
          interview_id?: string | null
          pain_point_id?: string | null
          priority?: Database["public"]["Enums"]["action_priority"]
          process_id?: string | null
          responsible?: string | null
          status?: Database["public"]["Enums"]["action_status"]
          title?: string
          updated_at?: string
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
            foreignKeyName: "action_plans_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
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
        ]
      }
      companies: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
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
        ]
      }
      indicators: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          frequency: string | null
          id: string
          name: string
          process_id: string | null
          target: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          frequency?: string | null
          id?: string
          name: string
          process_id?: string | null
          target?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          frequency?: string | null
          id?: string
          name?: string
          process_id?: string | null
          target?: number | null
          unit?: string | null
          updated_at?: string
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
          audio_mime: string | null
          audio_path: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          interview_date: string
          participant: string | null
          sector_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          audio_mime?: string | null
          audio_path?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          interview_date?: string
          participant?: string | null
          sector_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          audio_mime?: string | null
          audio_path?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          interview_date?: string
          participant?: string | null
          sector_id?: string | null
          status?: string
          title?: string
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
            foreignKeyName: "interviews_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      pain_points: {
        Row: {
          category: Database["public"]["Enums"]["pain_category"]
          company_id: string | null
          created_at: string
          description: string
          id: string
          severity: number
          source: Database["public"]["Enums"]["pain_source"]
          source_id: string | null
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["pain_category"]
          company_id?: string | null
          created_at?: string
          description: string
          id?: string
          severity?: number
          source?: Database["public"]["Enums"]["pain_source"]
          source_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["pain_category"]
          company_id?: string | null
          created_at?: string
          description?: string
          id?: string
          severity?: number
          source?: Database["public"]["Enums"]["pain_source"]
          source_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pain_points_company_id_fkey"
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
          created_at: string
          description: string | null
          id: string
          notes: string | null
          ordering: number
          process_id: string
          responsible: string | null
          systems: string[]
          time_minutes: number | null
          title: string
          type: Database["public"]["Enums"]["activity_type"]
          updated_at: string
          x: number | null
          y: number | null
        }
        Insert: {
          area?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          ordering?: number
          process_id: string
          responsible?: string | null
          systems?: string[]
          time_minutes?: number | null
          title: string
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
          x?: number | null
          y?: number | null
        }
        Update: {
          area?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          ordering?: number
          process_id?: string
          responsible?: string | null
          systems?: string[]
          time_minutes?: number | null
          title?: string
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
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
        ]
      }
      process_decision_map: {
        Row: {
          activity_id: string | null
          approval_required: boolean | null
          created_at: string
          decider: string | null
          decision: string | null
          id: string
          notes: string | null
          process_id: string
          reported_delay: string | null
        }
        Insert: {
          activity_id?: string | null
          approval_required?: boolean | null
          created_at?: string
          decider?: string | null
          decision?: string | null
          id?: string
          notes?: string | null
          process_id: string
          reported_delay?: string | null
        }
        Update: {
          activity_id?: string | null
          approval_required?: boolean | null
          created_at?: string
          decider?: string | null
          decision?: string | null
          id?: string
          notes?: string | null
          process_id?: string
          reported_delay?: string | null
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
          created_at: string
          destination: string | null
          document: string | null
          id: string
          loss_risk: boolean | null
          medium: string | null
          notes: string | null
          origin: string | null
          process_id: string
          responsible: string | null
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          destination?: string | null
          document?: string | null
          id?: string
          loss_risk?: boolean | null
          medium?: string | null
          notes?: string | null
          origin?: string | null
          process_id: string
          responsible?: string | null
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          destination?: string | null
          document?: string | null
          id?: string
          loss_risk?: boolean | null
          medium?: string | null
          notes?: string | null
          origin?: string | null
          process_id?: string
          responsible?: string | null
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
          level: Database["public"]["Enums"]["process_level"]
          name: string
          objective: string | null
          outputs: string | null
          parent_id: string | null
          responsible: string | null
          source_interview_id: string | null
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
          level?: Database["public"]["Enums"]["process_level"]
          name: string
          objective?: string | null
          outputs?: string | null
          parent_id?: string | null
          responsible?: string | null
          source_interview_id?: string | null
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
          level?: Database["public"]["Enums"]["process_level"]
          name?: string
          objective?: string | null
          outputs?: string | null
          parent_id?: string | null
          responsible?: string | null
          source_interview_id?: string | null
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
            foreignKeyName: "processes_source_interview_id_fkey"
            columns: ["source_interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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
      process_level: "0" | "1" | "2"
      va_class: "VA" | "NVA" | "NNVA"
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
      process_level: ["0", "1", "2"],
      va_class: ["VA", "NVA", "NNVA"],
    },
  },
} as const
