export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          actor: string
          created_at: string
          detail: Json
          id: number
        }
        Insert: {
          action: string
          actor: string
          created_at?: string
          detail?: Json
          id?: number
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          detail?: Json
          id?: number
        }
        Relationships: []
      }
      contest_results: {
        Row: {
          argentina_score: number
          created_at: string
          id: boolean
          is_published: boolean
          messi_scores: boolean
          published_at: string | null
          spain_score: number
          updated_at: string
          updated_by: string
          winner: string
        }
        Insert: {
          argentina_score: number
          created_at?: string
          id?: boolean
          is_published?: boolean
          messi_scores: boolean
          published_at?: string | null
          spain_score: number
          updated_at?: string
          updated_by: string
          winner: string
        }
        Update: {
          argentina_score?: number
          created_at?: string
          id?: boolean
          is_published?: boolean
          messi_scores?: boolean
          published_at?: string | null
          spain_score?: number
          updated_at?: string
          updated_by?: string
          winner?: string
        }
        Relationships: []
      }
      contest_settings: {
        Row: {
          away_team: string
          created_at: string
          home_team: string
          id: boolean
          predictions_open: boolean
          submission_closes_at: string
          title: string
          updated_at: string
        }
        Insert: {
          away_team?: string
          created_at?: string
          home_team?: string
          id?: boolean
          predictions_open?: boolean
          submission_closes_at: string
          title: string
          updated_at?: string
        }
        Update: {
          away_team?: string
          created_at?: string
          home_team?: string
          id?: boolean
          predictions_open?: boolean
          submission_closes_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_users: {
        Row: {
          auth_version: number
          created_at: string
          id: string
          invite_code_id: string
          status: string
          uid: string
          updated_at: string
        }
        Insert: {
          auth_version?: number
          created_at?: string
          id?: string
          invite_code_id: string
          status?: string
          uid: string
          updated_at?: string
        }
        Update: {
          auth_version?: number
          created_at?: string
          id?: string
          invite_code_id?: string
          status?: string
          uid?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_users_invite_code_id_fkey"
            columns: ["invite_code_id"]
            isOneToOne: false
            referencedRelation: "invite_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          claim_count: number
          code_hash: string
          code_hint: string
          created_at: string
          id: string
          last_claimed_at: string | null
          status: string
        }
        Insert: {
          claim_count?: number
          code_hash: string
          code_hint: string
          created_at?: string
          id?: string
          last_claimed_at?: string | null
          status?: string
        }
        Update: {
          claim_count?: number
          code_hash?: string
          code_hint?: string
          created_at?: string
          id?: string
          last_claimed_at?: string | null
          status?: string
        }
        Relationships: []
      }
      predictions: {
        Row: {
          argentina_score: number
          id: string
          messi_scores: boolean
          spain_score: number
          submitted_at: string
          user_id: string
          winner: string
        }
        Insert: {
          argentina_score: number
          id?: string
          messi_scores: boolean
          spain_score: number
          submitted_at?: string
          user_id: string
          winner: string
        }
        Update: {
          argentina_score?: number
          id?: string
          messi_scores?: boolean
          spain_score?: number
          submitted_at?: string
          user_id?: string
          winner?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "event_users"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_buckets: {
        Row: {
          key_hash: string
          request_count: number
          scope: string
          updated_at: string
          window_started_at: string
        }
        Insert: {
          key_hash: string
          request_count?: number
          scope: string
          updated_at?: string
          window_started_at?: string
        }
        Update: {
          key_hash?: string
          request_count?: number
          scope?: string
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      contest_leaderboard: {
        Row: {
          correct_answers: number | null
          masked_uid: string | null
          points: number | null
          rank: number | null
          submitted_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "event_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      claim_contest_access: {
        Args: { p_code_hash: string; p_uid: string }
        Returns: {
          auth_version: number
          created_at: string
          id: string
          invite_code_id: string
          status: string
          uid: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "event_users"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      consume_rate_limit: {
        Args: {
          p_key_hash: string
          p_limit: number
          p_scope: string
          p_window_seconds: number
        }
        Returns: boolean
      }
      mask_uid: { Args: { value: string }; Returns: string }
      publish_contest_result: {
        Args: {
          p_actor: string
          p_argentina_score: number
          p_messi_scores: boolean
          p_spain_score: number
          p_winner: string
        }
        Returns: {
          argentina_score: number
          created_at: string
          id: boolean
          is_published: boolean
          messi_scores: boolean
          published_at: string | null
          spain_score: number
          updated_at: string
          updated_by: string
          winner: string
        }
        SetofOptions: {
          from: "*"
          to: "contest_results"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_predictions_open: {
        Args: { p_actor: string; p_open: boolean }
        Returns: {
          away_team: string
          created_at: string
          home_team: string
          id: boolean
          predictions_open: boolean
          submission_closes_at: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "contest_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_contest_prediction: {
        Args: {
          p_argentina_score: number
          p_messi_scores: boolean
          p_spain_score: number
          p_user_id: string
          p_winner: string
        }
        Returns: {
          argentina_score: number
          id: string
          messi_scores: boolean
          spain_score: number
          submitted_at: string
          user_id: string
          winner: string
        }
        SetofOptions: {
          from: "*"
          to: "predictions"
          isOneToOne: true
          isSetofReturn: false
        }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
