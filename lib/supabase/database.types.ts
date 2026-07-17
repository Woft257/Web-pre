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
          market_id: string | null
        }
        Insert: {
          action: string
          actor: string
          created_at?: string
          detail?: Json
          id?: number
          market_id?: string | null
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          detail?: Json
          id?: number
          market_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      event_users: {
        Row: {
          auth_version: number
          balance_micro: number
          created_at: string
          id: string
          initial_points_micro: number
          password_hash: string | null
          status: string
          uid: string
          updated_at: string
        }
        Insert: {
          auth_version?: number
          balance_micro?: number
          created_at?: string
          id?: string
          initial_points_micro?: number
          password_hash?: string | null
          status?: string
          uid: string
          updated_at?: string
        }
        Update: {
          auth_version?: number
          balance_micro?: number
          created_at?: string
          id?: string
          initial_points_micro?: number
          password_hash?: string | null
          status?: string
          uid?: string
          updated_at?: string
        }
        Relationships: []
      }
      leaderboard_entries: {
        Row: {
          balance_micro: number
          correct_predictions: number
          equity_micro: number
          masked_uid: string
          pnl_micro: number
          position_value_micro: number
          settled_predictions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_micro?: number
          correct_predictions?: number
          equity_micro?: number
          masked_uid: string
          pnl_micro?: number
          position_value_micro?: number
          settled_predictions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_micro?: number
          correct_predictions?: number
          equity_micro?: number
          masked_uid?: string
          pnl_micro?: number
          position_value_micro?: number
          settled_predictions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "event_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          amount_micro: number
          balance_after_micro: number
          created_at: string
          id: number
          kind: Database["public"]["Enums"]["ledger_kind"]
          market_id: string | null
          metadata: Json
          note: string | null
          trade_id: string | null
          user_id: string
        }
        Insert: {
          amount_micro: number
          balance_after_micro: number
          created_at?: string
          id?: number
          kind: Database["public"]["Enums"]["ledger_kind"]
          market_id?: string | null
          metadata?: Json
          note?: string | null
          trade_id?: string | null
          user_id: string
        }
        Update: {
          amount_micro?: number
          balance_after_micro?: number
          created_at?: string
          id?: number
          kind?: Database["public"]["Enums"]["ledger_kind"]
          market_id?: string | null
          metadata?: Json
          note?: string | null
          trade_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "event_users"
            referencedColumns: ["id"]
          },
        ]
      }
      markets: {
        Row: {
          away_code: string
          away_inventory_microshares: number
          away_name: string
          away_score: number
          competition: string
          created_at: string
          feed_status: Database["public"]["Enums"]["feed_status"]
          home_code: string
          home_inventory_microshares: number
          home_name: string
          home_score: number
          id: string
          kickoff_at: string
          latest_event: string | null
          liquidity_b_microshares: number
          match_minute: number | null
          match_period: string | null
          max_order_micro: number
          max_user_exposure_micro: number
          min_order_micro: number
          oracle_away_probability_ppm: number
          oracle_home_probability_ppm: number
          oracle_received_at: string | null
          oracle_source_at: string | null
          oracle_version: number
          outcome: Database["public"]["Enums"]["market_side"] | null
          provider: string
          provider_event_id: string | null
          settled_at: string | null
          slug: string
          spread_bps: number
          stage: string
          status: Database["public"]["Enums"]["market_status"]
          suspended_at: string | null
          suspended_oracle_version: number | null
          suspension_reason: string | null
          title: string
          trading_end_at: string
          updated_at: string
          vmm_version: number
        }
        Insert: {
          away_code: string
          away_inventory_microshares?: number
          away_name: string
          away_score?: number
          competition: string
          created_at?: string
          feed_status?: Database["public"]["Enums"]["feed_status"]
          home_code: string
          home_inventory_microshares?: number
          home_name: string
          home_score?: number
          id?: string
          kickoff_at: string
          latest_event?: string | null
          liquidity_b_microshares?: number
          match_minute?: number | null
          match_period?: string | null
          max_order_micro?: number
          max_user_exposure_micro?: number
          min_order_micro?: number
          oracle_away_probability_ppm?: number
          oracle_home_probability_ppm?: number
          oracle_received_at?: string | null
          oracle_source_at?: string | null
          oracle_version?: number
          outcome?: Database["public"]["Enums"]["market_side"] | null
          provider?: string
          provider_event_id?: string | null
          settled_at?: string | null
          slug: string
          spread_bps?: number
          stage: string
          status?: Database["public"]["Enums"]["market_status"]
          suspended_at?: string | null
          suspended_oracle_version?: number | null
          suspension_reason?: string | null
          title: string
          trading_end_at: string
          updated_at?: string
          vmm_version?: number
        }
        Update: {
          away_code?: string
          away_inventory_microshares?: number
          away_name?: string
          away_score?: number
          competition?: string
          created_at?: string
          feed_status?: Database["public"]["Enums"]["feed_status"]
          home_code?: string
          home_inventory_microshares?: number
          home_name?: string
          home_score?: number
          id?: string
          kickoff_at?: string
          latest_event?: string | null
          liquidity_b_microshares?: number
          match_minute?: number | null
          match_period?: string | null
          max_order_micro?: number
          max_user_exposure_micro?: number
          min_order_micro?: number
          oracle_away_probability_ppm?: number
          oracle_home_probability_ppm?: number
          oracle_received_at?: string | null
          oracle_source_at?: string | null
          oracle_version?: number
          outcome?: Database["public"]["Enums"]["market_side"] | null
          provider?: string
          provider_event_id?: string | null
          settled_at?: string | null
          slug?: string
          spread_bps?: number
          stage?: string
          status?: Database["public"]["Enums"]["market_status"]
          suspended_at?: string | null
          suspended_oracle_version?: number | null
          suspension_reason?: string | null
          title?: string
          trading_end_at?: string
          updated_at?: string
          vmm_version?: number
        }
        Relationships: []
      }
      odds_snapshots: {
        Row: {
          away_decimal_odds: number | null
          away_probability_ppm: number
          home_decimal_odds: number | null
          home_probability_ppm: number
          id: number
          market_id: string
          oracle_version: number
          provider: string
          provider_event_id: string | null
          raw_payload: Json | null
          received_at: string
          source_at: string
        }
        Insert: {
          away_decimal_odds?: number | null
          away_probability_ppm: number
          home_decimal_odds?: number | null
          home_probability_ppm: number
          id?: number
          market_id: string
          oracle_version: number
          provider: string
          provider_event_id?: string | null
          raw_payload?: Json | null
          received_at?: string
          source_at: string
        }
        Update: {
          away_decimal_odds?: number | null
          away_probability_ppm?: number
          home_decimal_odds?: number | null
          home_probability_ppm?: number
          id?: number
          market_id?: string
          oracle_version?: number
          provider?: string
          provider_event_id?: string | null
          raw_payload?: Json | null
          received_at?: string
          source_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "odds_snapshots_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          away_cost_micro: number
          away_shares_micro: number
          created_at: string
          gross_bought_micro: number
          home_cost_micro: number
          home_shares_micro: number
          market_id: string
          net_cost_micro: number
          realized_pnl_micro: number
          updated_at: string
          user_id: string
        }
        Insert: {
          away_cost_micro?: number
          away_shares_micro?: number
          created_at?: string
          gross_bought_micro?: number
          home_cost_micro?: number
          home_shares_micro?: number
          market_id: string
          net_cost_micro?: number
          realized_pnl_micro?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          away_cost_micro?: number
          away_shares_micro?: number
          created_at?: string
          gross_bought_micro?: number
          home_cost_micro?: number
          home_shares_micro?: number
          market_id?: string
          net_cost_micro?: number
          realized_pnl_micro?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
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
      settlements: {
        Row: {
          affected_users: number
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["settlement_kind"]
          market_id: string
          outcome: Database["public"]["Enums"]["market_side"] | null
          result_reference: string | null
          result_source: string
          settled_by: string
          total_payout_micro: number
        }
        Insert: {
          affected_users?: number
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["settlement_kind"]
          market_id: string
          outcome?: Database["public"]["Enums"]["market_side"] | null
          result_reference?: string | null
          result_source: string
          settled_by: string
          total_payout_micro?: number
        }
        Update: {
          affected_users?: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["settlement_kind"]
          market_id?: string
          outcome?: Database["public"]["Enums"]["market_side"] | null
          result_reference?: string | null
          result_source?: string
          settled_by?: string
          total_payout_micro?: number
        }
        Relationships: [
          {
            foreignKeyName: "settlements_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: true
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          action: Database["public"]["Enums"]["trade_action"]
          average_price_ppm: number
          cash_delta_micro: number
          created_at: string
          id: string
          idempotency_key: string
          market_id: string
          oracle_probability_ppm: number
          oracle_version: number
          quote_id: string
          shares_micro: number
          side: Database["public"]["Enums"]["market_side"]
          user_id: string
          vmm_version: number
        }
        Insert: {
          action: Database["public"]["Enums"]["trade_action"]
          average_price_ppm: number
          cash_delta_micro: number
          created_at?: string
          id?: string
          idempotency_key: string
          market_id: string
          oracle_probability_ppm: number
          oracle_version: number
          quote_id: string
          shares_micro: number
          side: Database["public"]["Enums"]["market_side"]
          user_id: string
          vmm_version: number
        }
        Update: {
          action?: Database["public"]["Enums"]["trade_action"]
          average_price_ppm?: number
          cash_delta_micro?: number
          created_at?: string
          id?: string
          idempotency_key?: string
          market_id?: string
          oracle_probability_ppm?: number
          oracle_version?: number
          quote_id?: string
          shares_micro?: number
          side?: Database["public"]["Enums"]["market_side"]
          user_id?: string
          vmm_version?: number
        }
        Relationships: [
          {
            foreignKeyName: "trades_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "event_users"
            referencedColumns: ["id"]
          },
        ]
      }
      uid_sessions: {
        Row: {
          created_at: string
          expires_at: string
          last_seen_at: string
          token_hash: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          last_seen_at?: string
          token_hash: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          last_seen_at?: string
          token_hash?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uid_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "event_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_event_user: {
        Args: { p_password_hash: string; p_uid: string }
        Returns: {
          auth_version: number
          balance_micro: number
          created_at: string
          id: string
          initial_points_micro: number
          password_hash: string | null
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
      admin_delete_event_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      admin_update_user_password: {
        Args: { p_password_hash: string; p_user_id: string }
        Returns: {
          auth_version: number
          balance_micro: number
          created_at: string
          id: string
          initial_points_micro: number
          password_hash: string | null
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
      create_or_get_event_user: {
        Args: { p_uid: string }
        Returns: {
          auth_version: number
          balance_micro: number
          created_at: string
          id: string
          initial_points_micro: number
          password_hash: string | null
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
      heartbeat_market_feed: {
        Args: {
          p_market_id: string
          p_match_minute?: number
          p_match_period?: string
          p_provider: string
          p_source_at: string
        }
        Returns: undefined
      }
      mask_uid: { Args: { value: string }; Returns: string }
      place_trade: {
        Args: {
          p_action: Database["public"]["Enums"]["trade_action"]
          p_amount_micro: number
          p_expected_oracle_version: number
          p_expected_vmm_version: number
          p_idempotency_key: string
          p_market_id: string
          p_quote_id: string
          p_side: Database["public"]["Enums"]["market_side"]
          p_user_id: string
        }
        Returns: {
          current_oracle_version: number
          current_vmm_version: number
          executed_average_price_ppm: number
          executed_cash_delta_micro: number
          executed_shares_micro: number
          trade_id: string
          user_balance_micro: number
        }[]
      }
      preview_settlement: {
        Args: {
          p_kind: Database["public"]["Enums"]["settlement_kind"]
          p_market_id: string
          p_outcome?: Database["public"]["Enums"]["market_side"]
        }
        Returns: {
          affected_users: number
          total_payout_micro: number
        }[]
      }
      refresh_leaderboard_for_market: {
        Args: { p_market_id: string }
        Returns: undefined
      }
      refresh_leaderboard_for_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      register_event_user: {
        Args: { p_password_hash: string; p_uid: string }
        Returns: {
          auth_version: number
          balance_micro: number
          created_at: string
          id: string
          initial_points_micro: number
          password_hash: string | null
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
      set_market_status: {
        Args: {
          p_actor: string
          p_market_id: string
          p_reason: string
          p_status: Database["public"]["Enums"]["market_status"]
        }
        Returns: {
          away_code: string
          away_inventory_microshares: number
          away_name: string
          away_score: number
          competition: string
          created_at: string
          feed_status: Database["public"]["Enums"]["feed_status"]
          home_code: string
          home_inventory_microshares: number
          home_name: string
          home_score: number
          id: string
          kickoff_at: string
          latest_event: string | null
          liquidity_b_microshares: number
          match_minute: number | null
          match_period: string | null
          max_order_micro: number
          max_user_exposure_micro: number
          min_order_micro: number
          oracle_away_probability_ppm: number
          oracle_home_probability_ppm: number
          oracle_received_at: string | null
          oracle_source_at: string | null
          oracle_version: number
          outcome: Database["public"]["Enums"]["market_side"] | null
          provider: string
          provider_event_id: string | null
          settled_at: string | null
          slug: string
          spread_bps: number
          stage: string
          status: Database["public"]["Enums"]["market_status"]
          suspended_at: string | null
          suspended_oracle_version: number | null
          suspension_reason: string | null
          title: string
          trading_end_at: string
          updated_at: string
          vmm_version: number
        }
        SetofOptions: {
          from: "*"
          to: "markets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      settle_market: {
        Args: {
          p_actor: string
          p_market_id: string
          p_outcome: Database["public"]["Enums"]["market_side"]
          p_result_reference: string
          p_result_source: string
        }
        Returns: {
          affected_users: number
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["settlement_kind"]
          market_id: string
          outcome: Database["public"]["Enums"]["market_side"] | null
          result_reference: string | null
          result_source: string
          settled_by: string
          total_payout_micro: number
        }
        SetofOptions: {
          from: "*"
          to: "settlements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_market_oracle: {
        Args: {
          p_away_decimal_odds?: number
          p_away_probability_ppm: number
          p_away_score: number
          p_home_decimal_odds?: number
          p_home_probability_ppm: number
          p_home_score: number
          p_latest_event?: string
          p_market_id: string
          p_match_minute?: number
          p_match_period?: string
          p_provider: string
          p_raw_payload?: Json
          p_source_at: string
          p_status: Database["public"]["Enums"]["market_status"]
          p_suspension_reason?: string
        }
        Returns: {
          away_code: string
          away_inventory_microshares: number
          away_name: string
          away_score: number
          competition: string
          created_at: string
          feed_status: Database["public"]["Enums"]["feed_status"]
          home_code: string
          home_inventory_microshares: number
          home_name: string
          home_score: number
          id: string
          kickoff_at: string
          latest_event: string | null
          liquidity_b_microshares: number
          match_minute: number | null
          match_period: string | null
          max_order_micro: number
          max_user_exposure_micro: number
          min_order_micro: number
          oracle_away_probability_ppm: number
          oracle_home_probability_ppm: number
          oracle_received_at: string | null
          oracle_source_at: string | null
          oracle_version: number
          outcome: Database["public"]["Enums"]["market_side"] | null
          provider: string
          provider_event_id: string | null
          settled_at: string | null
          slug: string
          spread_bps: number
          stage: string
          status: Database["public"]["Enums"]["market_status"]
          suspended_at: string | null
          suspended_oracle_version: number | null
          suspension_reason: string | null
          title: string
          trading_end_at: string
          updated_at: string
          vmm_version: number
        }
        SetofOptions: {
          from: "*"
          to: "markets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      vmm_cost: {
        Args: {
          p_away_inventory: number
          p_home_inventory: number
          p_home_probability: number
          p_liquidity_b: number
        }
        Returns: number
      }
      vmm_delta_cost: {
        Args: {
          p_away_inventory: number
          p_delta_shares: number
          p_home_inventory: number
          p_home_probability: number
          p_liquidity_b: number
          p_side: Database["public"]["Enums"]["market_side"]
        }
        Returns: number
      }
      vmm_shares_for_budget: {
        Args: {
          p_away_inventory: number
          p_budget: number
          p_home_inventory: number
          p_home_probability: number
          p_liquidity_b: number
          p_side: Database["public"]["Enums"]["market_side"]
        }
        Returns: number
      }
      void_market: {
        Args: {
          p_actor: string
          p_market_id: string
          p_result_reference: string
          p_result_source: string
        }
        Returns: {
          affected_users: number
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["settlement_kind"]
          market_id: string
          outcome: Database["public"]["Enums"]["market_side"] | null
          result_reference: string | null
          result_source: string
          settled_by: string
          total_payout_micro: number
        }
        SetofOptions: {
          from: "*"
          to: "settlements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      feed_status: "healthy" | "stale" | "suspended" | "offline"
      ledger_kind:
        | "initial_grant"
        | "trade_buy"
        | "trade_sell"
        | "settlement"
        | "void_redemption"
        | "admin_adjustment"
        | "reversal"
      market_side: "home" | "away"
      market_status:
        | "scheduled"
        | "pre_match_open"
        | "live_open"
        | "suspended"
        | "ended"
        | "settled"
        | "voided"
      settlement_kind: "result" | "void"
      trade_action: "buy" | "sell"
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
    Enums: {
      feed_status: ["healthy", "stale", "suspended", "offline"],
      ledger_kind: [
        "initial_grant",
        "trade_buy",
        "trade_sell",
        "settlement",
        "void_redemption",
        "admin_adjustment",
        "reversal",
      ],
      market_side: ["home", "away"],
      market_status: [
        "scheduled",
        "pre_match_open",
        "live_open",
        "suspended",
        "ended",
        "settled",
        "voided",
      ],
      settlement_kind: ["result", "void"],
      trade_action: ["buy", "sell"],
    },
  },
} as const
