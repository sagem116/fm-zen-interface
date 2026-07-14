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
      club_reputation_season: {
        Row: {
          avg_attendance: number | null
          club_id: string | null
          club_name: string
          created_at: string
          id: string
          reputation: number | null
          season_id: string
          season_ticket_holders: number | null
          season_year: number
        }
        Insert: {
          avg_attendance?: number | null
          club_id?: string | null
          club_name: string
          created_at?: string
          id?: string
          reputation?: number | null
          season_id: string
          season_ticket_holders?: number | null
          season_year: number
        }
        Update: {
          avg_attendance?: number | null
          club_id?: string | null
          club_name?: string
          created_at?: string
          id?: string
          reputation?: number | null
          season_id?: string
          season_ticket_holders?: number | null
          season_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "club_reputation_season_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_reputation_season_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          continent: string | null
          country_id: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          continent?: string | null
          country_id?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          continent?: string | null
          country_id?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "clubs_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_assignments: {
        Row: {
          ca: number | null
          club_id: string | null
          club_name: string | null
          club_role: string | null
          coach_id: string | null
          coach_name: string
          country_name: string | null
          cp: number | null
          created_at: string
          id: string
          info: string | null
          intl_role: string | null
          intl_salary: number | null
          module: string
          rc: number | null
          rm: number | null
          salary: number | null
          season_id: string
        }
        Insert: {
          ca?: number | null
          club_id?: string | null
          club_name?: string | null
          club_role?: string | null
          coach_id?: string | null
          coach_name: string
          country_name?: string | null
          cp?: number | null
          created_at?: string
          id?: string
          info?: string | null
          intl_role?: string | null
          intl_salary?: number | null
          module: string
          rc?: number | null
          rm?: number | null
          salary?: number | null
          season_id: string
        }
        Update: {
          ca?: number | null
          club_id?: string | null
          club_name?: string | null
          club_role?: string | null
          coach_id?: string | null
          coach_name?: string
          country_name?: string | null
          cp?: number | null
          created_at?: string
          id?: string
          info?: string | null
          intl_role?: string | null
          intl_salary?: number | null
          module?: string
          rc?: number | null
          rm?: number | null
          salary?: number | null
          season_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_assignments_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_assignments_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_assignments_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          age: number | null
          attacking_formation: string | null
          ca: number | null
          cp: number | null
          created_at: string
          defensive_formation: string | null
          id: string
          idu: string | null
          is_national_team: boolean | null
          marking_type: string | null
          mentality: string | null
          name: string
          national_team: string | null
          nationality: string | null
          personality: string | null
          play_style: string | null
          preferred_formation: string | null
          press_relationship: string | null
          pressing_type: string | null
          rc: number | null
          rm: number | null
          secondary_formation: string | null
          tactical_style: string | null
          training_type: string | null
        }
        Insert: {
          age?: number | null
          attacking_formation?: string | null
          ca?: number | null
          cp?: number | null
          created_at?: string
          defensive_formation?: string | null
          id?: string
          idu?: string | null
          is_national_team?: boolean | null
          marking_type?: string | null
          mentality?: string | null
          name: string
          national_team?: string | null
          nationality?: string | null
          personality?: string | null
          play_style?: string | null
          preferred_formation?: string | null
          press_relationship?: string | null
          pressing_type?: string | null
          rc?: number | null
          rm?: number | null
          secondary_formation?: string | null
          tactical_style?: string | null
          training_type?: string | null
        }
        Update: {
          age?: number | null
          attacking_formation?: string | null
          ca?: number | null
          cp?: number | null
          created_at?: string
          defensive_formation?: string | null
          id?: string
          idu?: string | null
          is_national_team?: boolean | null
          marking_type?: string | null
          mentality?: string | null
          name?: string
          national_team?: string | null
          nationality?: string | null
          personality?: string | null
          play_style?: string | null
          preferred_formation?: string | null
          press_relationship?: string | null
          pressing_type?: string | null
          rc?: number | null
          rm?: number | null
          secondary_formation?: string | null
          tactical_style?: string | null
          training_type?: string | null
        }
        Relationships: []
      }
      competition_reputation: {
        Row: {
          competition: string
          continent: string | null
          country: string | null
          created_at: string
          id: string
          reputation: number | null
          season_year: number
        }
        Insert: {
          competition: string
          continent?: string | null
          country?: string | null
          created_at?: string
          id?: string
          reputation?: number | null
          season_year: number
        }
        Update: {
          competition?: string
          continent?: string | null
          country?: string | null
          created_at?: string
          id?: string
          reputation?: number | null
          season_year?: number
        }
        Relationships: []
      }
      competition_stats: {
        Row: {
          age_avg: number | null
          avg_rating_avg: number | null
          ca_avg: number | null
          comp_type: string
          competition: string
          continent: string | null
          country: string | null
          cp_avg: number | null
          created_at: string
          fouls_per90_avg: number | null
          id: string
          n_players: number | null
          pass_pct_avg: number | null
          ra_avg: number | null
          rc_avg: number | null
          reds_avg: number | null
          rm_avg: number | null
          salary_avg: number | null
          season_year: number
          shot_pct_avg: number | null
          tackles_per90_avg: number | null
          vp_avg: number | null
          xg_avg: number | null
          yellows_avg: number | null
        }
        Insert: {
          age_avg?: number | null
          avg_rating_avg?: number | null
          ca_avg?: number | null
          comp_type: string
          competition: string
          continent?: string | null
          country?: string | null
          cp_avg?: number | null
          created_at?: string
          fouls_per90_avg?: number | null
          id?: string
          n_players?: number | null
          pass_pct_avg?: number | null
          ra_avg?: number | null
          rc_avg?: number | null
          reds_avg?: number | null
          rm_avg?: number | null
          salary_avg?: number | null
          season_year: number
          shot_pct_avg?: number | null
          tackles_per90_avg?: number | null
          vp_avg?: number | null
          xg_avg?: number | null
          yellows_avg?: number | null
        }
        Update: {
          age_avg?: number | null
          avg_rating_avg?: number | null
          ca_avg?: number | null
          comp_type?: string
          competition?: string
          continent?: string | null
          country?: string | null
          cp_avg?: number | null
          created_at?: string
          fouls_per90_avg?: number | null
          id?: string
          n_players?: number | null
          pass_pct_avg?: number | null
          ra_avg?: number | null
          rc_avg?: number | null
          reds_avg?: number | null
          rm_avg?: number | null
          salary_avg?: number | null
          season_year?: number
          shot_pct_avg?: number | null
          tackles_per90_avg?: number | null
          vp_avg?: number | null
          xg_avg?: number | null
          yellows_avg?: number | null
        }
        Relationships: []
      }
      config_weights: {
        Row: {
          category: string
          id: string
          key: string
          profile_id: string
          value: number
        }
        Insert: {
          category: string
          id?: string
          key: string
          profile_id: string
          value: number
        }
        Update: {
          category?: string
          id?: string
          key?: string
          profile_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "config_weights_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "weight_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      continental_results: {
        Row: {
          club1_id: string | null
          club2_id: string | null
          competition: string
          created_at: string
          id: string
          qf1: string | null
          qf2: string | null
          qf3: string | null
          qf4: string | null
          result: string | null
          season_id: string
          sf1: string | null
          sf2: string | null
          team1: string | null
          team2: string | null
          winner_club_id: string | null
        }
        Insert: {
          club1_id?: string | null
          club2_id?: string | null
          competition: string
          created_at?: string
          id?: string
          qf1?: string | null
          qf2?: string | null
          qf3?: string | null
          qf4?: string | null
          result?: string | null
          season_id: string
          sf1?: string | null
          sf2?: string | null
          team1?: string | null
          team2?: string | null
          winner_club_id?: string | null
        }
        Update: {
          club1_id?: string | null
          club2_id?: string | null
          competition?: string
          created_at?: string
          id?: string
          qf1?: string | null
          qf2?: string | null
          qf3?: string | null
          qf4?: string | null
          result?: string | null
          season_id?: string
          sf1?: string | null
          sf2?: string | null
          team1?: string | null
          team2?: string | null
          winner_club_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "continental_results_club1_id_fkey"
            columns: ["club1_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "continental_results_club2_id_fkey"
            columns: ["club2_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "continental_results_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "continental_results_winner_club_id_fkey"
            columns: ["winner_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      imports: {
        Row: {
          created_at: string
          filename: string | null
          id: string
          module: string
          season_id: string
          status: string
          warnings: Json | null
        }
        Insert: {
          created_at?: string
          filename?: string | null
          id?: string
          module: string
          season_id: string
          status?: string
          warnings?: Json | null
        }
        Update: {
          created_at?: string
          filename?: string | null
          id?: string
          module?: string
          season_id?: string
          status?: string
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "imports_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      international_results: {
        Row: {
          coach1: string | null
          coach2: string | null
          competition: string
          created_at: string
          id: string
          qf1: string | null
          qf1_coach: string | null
          qf2: string | null
          qf2_coach: string | null
          qf3: string | null
          qf3_coach: string | null
          qf4: string | null
          qf4_coach: string | null
          result: string | null
          season_id: string
          sf1: string | null
          sf1_coach: string | null
          sf2: string | null
          sf2_coach: string | null
          team1: string | null
          team2: string | null
          winner: string | null
        }
        Insert: {
          coach1?: string | null
          coach2?: string | null
          competition: string
          created_at?: string
          id?: string
          qf1?: string | null
          qf1_coach?: string | null
          qf2?: string | null
          qf2_coach?: string | null
          qf3?: string | null
          qf3_coach?: string | null
          qf4?: string | null
          qf4_coach?: string | null
          result?: string | null
          season_id: string
          sf1?: string | null
          sf1_coach?: string | null
          sf2?: string | null
          sf2_coach?: string | null
          team1?: string | null
          team2?: string | null
          winner?: string | null
        }
        Update: {
          coach1?: string | null
          coach2?: string | null
          competition?: string
          created_at?: string
          id?: string
          qf1?: string | null
          qf1_coach?: string | null
          qf2?: string | null
          qf2_coach?: string | null
          qf3?: string | null
          qf3_coach?: string | null
          qf4?: string | null
          qf4_coach?: string | null
          result?: string | null
          season_id?: string
          sf1?: string | null
          sf1_coach?: string | null
          sf2?: string | null
          sf2_coach?: string | null
          team1?: string | null
          team2?: string | null
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "international_results_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      player_profiles: {
        Row: {
          age: number | null
          attributes: Json
          ca: number | null
          club: string | null
          continent: string | null
          country: string | null
          cp: number | null
          created_at: string
          extras: Json
          height: number | null
          id: string
          idu: string | null
          nationality: string | null
          personality: string | null
          player_name: string
          preferred_foot: string | null
          primary_position: string | null
          reputation: number | null
          salary: number | null
          season_id: string
          season_year: number
          secondary_positions: string | null
          vp: number | null
          weight: number | null
        }
        Insert: {
          age?: number | null
          attributes?: Json
          ca?: number | null
          club?: string | null
          continent?: string | null
          country?: string | null
          cp?: number | null
          created_at?: string
          extras?: Json
          height?: number | null
          id?: string
          idu?: string | null
          nationality?: string | null
          personality?: string | null
          player_name: string
          preferred_foot?: string | null
          primary_position?: string | null
          reputation?: number | null
          salary?: number | null
          season_id: string
          season_year: number
          secondary_positions?: string | null
          vp?: number | null
          weight?: number | null
        }
        Update: {
          age?: number | null
          attributes?: Json
          ca?: number | null
          club?: string | null
          continent?: string | null
          country?: string | null
          cp?: number | null
          created_at?: string
          extras?: Json
          height?: number | null
          id?: string
          idu?: string | null
          nationality?: string | null
          personality?: string | null
          player_name?: string
          preferred_foot?: string | null
          primary_position?: string | null
          reputation?: number | null
          salary?: number | null
          season_id?: string
          season_year?: number
          secondary_positions?: string | null
          vp?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_profiles_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      player_stats: {
        Row: {
          age: number | null
          ast: number | null
          avg_rating: number | null
          ca: number | null
          club: string | null
          comp_type: string
          competition: string
          continent: string | null
          country: string | null
          cp: number | null
          created_at: string
          fouls_per90: number | null
          games: number | null
          gls: number | null
          id: string
          idu: string | null
          nationality: string | null
          pass_pct: number | null
          player_name: string
          ra: number | null
          rc: number | null
          reds: number | null
          rm: number | null
          salary: number | null
          season_year: number
          shot_pct: number | null
          tackles_per90: number | null
          vp: number | null
          xg: number | null
          yellows: number | null
        }
        Insert: {
          age?: number | null
          ast?: number | null
          avg_rating?: number | null
          ca?: number | null
          club?: string | null
          comp_type: string
          competition: string
          continent?: string | null
          country?: string | null
          cp?: number | null
          created_at?: string
          fouls_per90?: number | null
          games?: number | null
          gls?: number | null
          id?: string
          idu?: string | null
          nationality?: string | null
          pass_pct?: number | null
          player_name: string
          ra?: number | null
          rc?: number | null
          reds?: number | null
          rm?: number | null
          salary?: number | null
          season_year: number
          shot_pct?: number | null
          tackles_per90?: number | null
          vp?: number | null
          xg?: number | null
          yellows?: number | null
        }
        Update: {
          age?: number | null
          ast?: number | null
          avg_rating?: number | null
          ca?: number | null
          club?: string | null
          comp_type?: string
          competition?: string
          continent?: string | null
          country?: string | null
          cp?: number | null
          created_at?: string
          fouls_per90?: number | null
          games?: number | null
          gls?: number | null
          id?: string
          idu?: string | null
          nationality?: string | null
          pass_pct?: number | null
          player_name?: string
          ra?: number | null
          rc?: number | null
          reds?: number | null
          rm?: number | null
          salary?: number | null
          season_year?: number
          shot_pct?: number | null
          tackles_per90?: number | null
          vp?: number | null
          xg?: number | null
          yellows?: number | null
        }
        Relationships: []
      }
      players: {
        Row: {
          age: number | null
          ast: number | null
          ca: number | null
          club_id: string | null
          club_name: string | null
          cp: number | null
          created_at: string
          gls: number | null
          id: string
          idu: string | null
          info: string | null
          league: string | null
          module: string
          name: string
          ra: number | null
          rec: string | null
          rm: number | null
          salary: number | null
          season_id: string
          vp: number | null
        }
        Insert: {
          age?: number | null
          ast?: number | null
          ca?: number | null
          club_id?: string | null
          club_name?: string | null
          cp?: number | null
          created_at?: string
          gls?: number | null
          id?: string
          idu?: string | null
          info?: string | null
          league?: string | null
          module: string
          name: string
          ra?: number | null
          rec?: string | null
          rm?: number | null
          salary?: number | null
          season_id: string
          vp?: number | null
        }
        Update: {
          age?: number | null
          ast?: number | null
          ca?: number | null
          club_id?: string | null
          club_name?: string | null
          cp?: number | null
          created_at?: string
          gls?: number | null
          id?: string
          idu?: string | null
          info?: string | null
          league?: string | null
          module?: string
          name?: string
          ra?: number | null
          rec?: string | null
          rm?: number | null
          salary?: number | null
          season_id?: string
          vp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "players_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          id: string
          label: string | null
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          year?: number
        }
        Relationships: []
      }
      standings: {
        Row: {
          club_id: string | null
          club_name: string
          competition: string | null
          created_at: string
          division_label: string | null
          division_num: number | null
          draws: number | null
          ga: number | null
          gd: number | null
          gf: number | null
          id: string
          info: string | null
          is_champion: boolean | null
          losses: number | null
          module: string
          played: number | null
          points: number | null
          position: number | null
          season_id: string
          wins: number | null
        }
        Insert: {
          club_id?: string | null
          club_name: string
          competition?: string | null
          created_at?: string
          division_label?: string | null
          division_num?: number | null
          draws?: number | null
          ga?: number | null
          gd?: number | null
          gf?: number | null
          id?: string
          info?: string | null
          is_champion?: boolean | null
          losses?: number | null
          module: string
          played?: number | null
          points?: number | null
          position?: number | null
          season_id: string
          wins?: number | null
        }
        Update: {
          club_id?: string | null
          club_name?: string
          competition?: string | null
          created_at?: string
          division_label?: string | null
          division_num?: number | null
          draws?: number | null
          ga?: number | null
          gd?: number | null
          gf?: number | null
          id?: string
          info?: string | null
          is_champion?: boolean | null
          losses?: number | null
          module?: string
          played?: number | null
          points?: number | null
          position?: number | null
          season_id?: string
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "standings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standings_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          coach_id: string | null
          created_at: string
          from_club_id: string | null
          from_club_name: string | null
          from_club_name_key: string | null
          id: string
          person_name: string
          person_name_key: string
          person_type: string
          player_id: string | null
          season_id: string
          season_year: number
          to_club_id: string | null
          to_club_name: string | null
          to_club_name_key: string | null
          transfer_date: string
          value: number
        }
        Insert: {
          coach_id?: string | null
          created_at?: string
          from_club_id?: string | null
          from_club_name?: string | null
          from_club_name_key?: string | null
          id?: string
          person_name: string
          person_name_key: string
          person_type?: string
          player_id?: string | null
          season_id: string
          season_year: number
          to_club_id?: string | null
          to_club_name?: string | null
          to_club_name_key?: string | null
          transfer_date: string
          value?: number
        }
        Update: {
          coach_id?: string | null
          created_at?: string
          from_club_id?: string | null
          from_club_name?: string | null
          from_club_name_key?: string | null
          id?: string
          person_name?: string
          person_name_key?: string
          person_type?: string
          player_id?: string | null
          season_id?: string
          season_year?: number
          to_club_id?: string | null
          to_club_name?: string | null
          to_club_name_key?: string | null
          transfer_date?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "transfers_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_from_club_id_fkey"
            columns: ["from_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_club_id_fkey"
            columns: ["to_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      weight_profiles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
  public: {
    Enums: {},
  },
} as const
