export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_edited: boolean | null
          parent_id: string | null
          post_id: string
          reactions_count: number | null
          replies_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          parent_id?: string | null
          post_id: string
          reactions_count?: number | null
          replies_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_edited?: boolean | null
          parent_id?: string | null
          post_id?: string
          reactions_count?: number | null
          replies_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          cover_url: string | null
          created_at: string | null
          description: string | null
          founded_year: number | null
          id: string
          industry: string | null
          is_verified: boolean | null
          location: string | null
          logo_url: string | null
          name: string
          size_range: string | null
          slug: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          founded_year?: number | null
          id?: string
          industry?: string | null
          is_verified?: boolean | null
          location?: string | null
          logo_url?: string | null
          name: string
          size_range?: string | null
          slug: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          founded_year?: number | null
          id?: string
          industry?: string | null
          is_verified?: boolean | null
          location?: string | null
          logo_url?: string | null
          name?: string
          size_range?: string | null
          slug?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      connections: {
        Row: {
          created_at: string | null
          id: string
          initiated_by: string
          message: string | null
          status: string | null
          updated_at: string | null
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          initiated_by: string
          message?: string | null
          status?: string | null
          updated_at?: string | null
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          initiated_by?: string
          message?: string | null
          status?: string | null
          updated_at?: string | null
          user1_id?: string
          user2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_user1_id_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connections_user2_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string | null
          left_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          is_group: boolean | null
          last_message_at: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          is_group?: boolean | null
          last_message_at?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          is_group?: boolean | null
          last_message_at?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_activations: {
        Row: {
          activation_status: string | null
          country: string | null
          created_at: string
          currency: string | null
          current_frequency: string | null
          discount_percentage: number | null
          engagement_locked: boolean | null
          engagement_model: string | null
          engagement_model_details: Json | null
          engagement_model_selected_at: string | null
          enm_terms: boolean | null
          final_calculated_price: number | null
          frequency_change_history: Json | null
          frequency_payments: Json | null
          id: string
          last_payment_date: string | null
          lock_date: string | null
          mem_payment_amount: number | null
          mem_payment_currency: string | null
          mem_payment_date: string | null
          mem_payment_method: string | null
          mem_payment_status: string | null
          mem_receipt_number: string | null
          mem_terms: boolean | null
          membership_status: string
          membership_type: string | null
          organization_type: string | null
          payment_simulation_status: string | null
          platform_fee_percentage: number | null
          pricing_locked: boolean | null
          pricing_tier: string | null
          selected_frequency: string | null
          terms_accepted: boolean | null
          tier_features: Json | null
          tier_selected_at: string | null
          total_payments_made: number | null
          updated_at: string
          updated_platform_fee_percentage: number | null
          user_id: string | null
          workflow_completed: boolean | null
          workflow_step: string | null
        }
        Insert: {
          activation_status?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          current_frequency?: string | null
          discount_percentage?: number | null
          engagement_locked?: boolean | null
          engagement_model?: string | null
          engagement_model_details?: Json | null
          engagement_model_selected_at?: string | null
          enm_terms?: boolean | null
          final_calculated_price?: number | null
          frequency_change_history?: Json | null
          frequency_payments?: Json | null
          id?: string
          last_payment_date?: string | null
          lock_date?: string | null
          mem_payment_amount?: number | null
          mem_payment_currency?: string | null
          mem_payment_date?: string | null
          mem_payment_method?: string | null
          mem_payment_status?: string | null
          mem_receipt_number?: string | null
          mem_terms?: boolean | null
          membership_status: string
          membership_type?: string | null
          organization_type?: string | null
          payment_simulation_status?: string | null
          platform_fee_percentage?: number | null
          pricing_locked?: boolean | null
          pricing_tier?: string | null
          selected_frequency?: string | null
          terms_accepted?: boolean | null
          tier_features?: Json | null
          tier_selected_at?: string | null
          total_payments_made?: number | null
          updated_at?: string
          updated_platform_fee_percentage?: number | null
          user_id?: string | null
          workflow_completed?: boolean | null
          workflow_step?: string | null
        }
        Update: {
          activation_status?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          current_frequency?: string | null
          discount_percentage?: number | null
          engagement_locked?: boolean | null
          engagement_model?: string | null
          engagement_model_details?: Json | null
          engagement_model_selected_at?: string | null
          enm_terms?: boolean | null
          final_calculated_price?: number | null
          frequency_change_history?: Json | null
          frequency_payments?: Json | null
          id?: string
          last_payment_date?: string | null
          lock_date?: string | null
          mem_payment_amount?: number | null
          mem_payment_currency?: string | null
          mem_payment_date?: string | null
          mem_payment_method?: string | null
          mem_payment_status?: string | null
          mem_receipt_number?: string | null
          mem_terms?: boolean | null
          membership_status?: string
          membership_type?: string | null
          organization_type?: string | null
          payment_simulation_status?: string | null
          platform_fee_percentage?: number | null
          pricing_locked?: boolean | null
          pricing_tier?: string | null
          selected_frequency?: string | null
          terms_accepted?: boolean | null
          tier_features?: Json | null
          tier_selected_at?: string | null
          total_payments_made?: number | null
          updated_at?: string
          updated_platform_fee_percentage?: number | null
          user_id?: string | null
          workflow_completed?: boolean | null
          workflow_step?: string | null
        }
        Relationships: []
      }
      engagement_model_fee_mapping: {
        Row: {
          calculation_order: number | null
          created_at: string | null
          engagement_model_id: string
          fee_component_id: string
          id: string
          is_required: boolean | null
          updated_at: string | null
        }
        Insert: {
          calculation_order?: number | null
          created_at?: string | null
          engagement_model_id: string
          fee_component_id: string
          id?: string
          is_required?: boolean | null
          updated_at?: string | null
        }
        Update: {
          calculation_order?: number | null
          created_at?: string | null
          engagement_model_id?: string
          fee_component_id?: string
          id?: string
          is_required?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_model_fee_mapping_engagement_model_id_fkey"
            columns: ["engagement_model_id"]
            isOneToOne: false
            referencedRelation: "master_engagement_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_model_fee_mapping_fee_component_id_fkey"
            columns: ["fee_component_id"]
            isOneToOne: false
            referencedRelation: "master_fee_components"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          created_at: string
          id: string
          post_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences: {
        Row: {
          company_id: string | null
          company_name: string
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          is_current: boolean | null
          location: string | null
          start_date: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          company_name: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          location?: string | null
          start_date: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          company_name?: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          location?: string | null
          start_date?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      master_advance_payment_types: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_user_created: boolean | null
          name: string
          percentage_of_platform_fee: number
          updated_at: string
          version: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name: string
          percentage_of_platform_fee: number
          updated_at?: string
          version?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name?: string
          percentage_of_platform_fee?: number
          updated_at?: string
          version?: number | null
        }
        Relationships: []
      }
      master_analytics_access_types: {
        Row: {
          created_at: string
          created_by: string | null
          dashboard_access: boolean
          description: string | null
          features_included: Json | null
          id: string
          is_active: boolean
          is_user_created: boolean | null
          name: string
          updated_at: string
          version: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dashboard_access?: boolean
          description?: string | null
          features_included?: Json | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dashboard_access?: boolean
          description?: string | null
          features_included?: Json | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: []
      }
      master_billing_frequencies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          months: number | null
          name: string
          updated_at: string
          version: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          months?: number | null
          name: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          months?: number | null
          name?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: []
      }
      master_capability_levels: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_user_created: boolean | null
          max_score: number
          min_score: number
          name: string
          order_index: number
          updated_at: string
          version: number | null
        }
        Insert: {
          color: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          max_score: number
          min_score: number
          name: string
          order_index?: number
          updated_at?: string
          version?: number | null
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          max_score?: number
          min_score?: number
          name?: string
          order_index?: number
          updated_at?: string
          version?: number | null
        }
        Relationships: []
      }
      master_categories: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          domain_group_id: string
          id: string
          is_active: boolean
          is_user_created: boolean | null
          name: string
          updated_at: string
          version: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          domain_group_id: string
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          domain_group_id?: string
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_categories_domain_group"
            columns: ["domain_group_id"]
            isOneToOne: false
            referencedRelation: "master_domain_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      master_challenge_complexity: {
        Row: {
          consulting_fee_multiplier: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_user_created: boolean | null
          level_order: number
          management_fee_multiplier: number
          name: string
          updated_at: string
          version: number | null
        }
        Insert: {
          consulting_fee_multiplier?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          level_order?: number
          management_fee_multiplier?: number
          name: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          consulting_fee_multiplier?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          level_order?: number
          management_fee_multiplier?: number
          name?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: []
      }
      master_challenge_overage_fees: {
        Row: {
          country_id: string
          created_at: string
          created_by: string | null
          currency_id: string
          fee_per_additional_challenge: number
          id: string
          is_active: boolean
          is_user_created: boolean | null
          pricing_tier_id: string
          updated_at: string
          version: number | null
        }
        Insert: {
          country_id: string
          created_at?: string
          created_by?: string | null
          currency_id: string
          fee_per_additional_challenge: number
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          pricing_tier_id: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          country_id?: string
          created_at?: string
          created_by?: string | null
          currency_id?: string
          fee_per_additional_challenge?: number
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          pricing_tier_id?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "master_challenge_overage_fees_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "master_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_challenge_overage_fees_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "organization_context"
            referencedColumns: ["country_id"]
          },
          {
            foreignKeyName: "master_challenge_overage_fees_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "master_currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_challenge_overage_fees_pricing_tier_id_fkey"
            columns: ["pricing_tier_id"]
            isOneToOne: false
            referencedRelation: "master_pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      master_communication_types: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_user_created: boolean | null
          link: string
          name: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_user_created?: boolean | null
          link: string
          name: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_user_created?: boolean | null
          link?: string
          name?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      master_competency_capabilities: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_user_created: boolean | null
          name: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_user_created?: boolean | null
          name: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_user_created?: boolean | null
          name?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      master_countries: {
        Row: {
          code: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_user_created: boolean | null
          name: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_user_created?: boolean | null
          name: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_user_created?: boolean | null
          name?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      master_currencies: {
        Row: {
          code: string | null
          country: string | null
          country_code: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_user_created: boolean | null
          name: string
          symbol: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          code?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_user_created?: boolean | null
          name: string
          symbol?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          code?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_user_created?: boolean | null
          name?: string
          symbol?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_currencies_country"
            columns: ["country"]
            isOneToOne: false
            referencedRelation: "master_countries"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "fk_currencies_country"
            columns: ["country"]
            isOneToOne: false
            referencedRelation: "organization_context"
            referencedColumns: ["country_name"]
          },
          {
            foreignKeyName: "fk_currencies_country"
            columns: ["country"]
            isOneToOne: false
            referencedRelation: "pricing_configurations_detailed"
            referencedColumns: ["country_name"]
          },
          {
            foreignKeyName: "fk_currencies_country"
            columns: ["country"]
            isOneToOne: false
            referencedRelation: "pricing_parameters_management_consulting"
            referencedColumns: ["country_name"]
          },
          {
            foreignKeyName: "fk_currencies_country"
            columns: ["country"]
            isOneToOne: false
            referencedRelation: "solution_seekers_comprehensive_view"
            referencedColumns: ["country"]
          },
          {
            foreignKeyName: "fk_master_currencies_country"
            columns: ["country"]
            isOneToOne: false
            referencedRelation: "master_countries"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "fk_master_currencies_country"
            columns: ["country"]
            isOneToOne: false
            referencedRelation: "organization_context"
            referencedColumns: ["country_name"]
          },
          {
            foreignKeyName: "fk_master_currencies_country"
            columns: ["country"]
            isOneToOne: false
            referencedRelation: "pricing_configurations_detailed"
            referencedColumns: ["country_name"]
          },
          {
            foreignKeyName: "fk_master_currencies_country"
            columns: ["country"]
            isOneToOne: false
            referencedRelation: "pricing_parameters_management_consulting"
            referencedColumns: ["country_name"]
          },
          {
            foreignKeyName: "fk_master_currencies_country"
            columns: ["country"]
            isOneToOne: false
            referencedRelation: "solution_seekers_comprehensive_view"
            referencedColumns: ["country"]
          },
        ]
      }
      master_departments: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_user_created: boolean | null
          name: string
          organization_id: string | null
          organization_name: string | null
          updated_at: string
          version: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name: string
          organization_id?: string | null
          organization_name?: string | null
          updated_at?: string
          version?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name?: string
          organization_id?: string | null
          organization_name?: string | null
          updated_at?: string
          version?: number | null
        }
        Relationships: []
      }
      master_domain_groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          hierarchy: Json | null
          id: string
          industry_segment_id: string | null
          is_active: boolean
          is_user_created: boolean | null
          name: string
          updated_at: string
          version: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          hierarchy?: Json | null
          id?: string
          industry_segment_id?: string | null
          is_active?: boolean
          is_user_created?: boolean | null
          name: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          hierarchy?: Json | null
          id?: string
          industry_segment_id?: string | null
          is_active?: boolean
          is_user_created?: boolean | null
          name?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_domain_groups_industry_segment"
            columns: ["industry_segment_id"]
            isOneToOne: false
            referencedRelation: "master_industry_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_domain_groups_industry_segment"
            columns: ["industry_segment_id"]
            isOneToOne: false
            referencedRelation: "organization_context"
            referencedColumns: ["industry_segment_id"]
          },
          {
            foreignKeyName: "fk_master_domain_groups_industry_segment"
            columns: ["industry_segment_id"]
            isOneToOne: false
            referencedRelation: "master_industry_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_master_domain_groups_industry_segment"
            columns: ["industry_segment_id"]
            isOneToOne: false
            referencedRelation: "organization_context"
            referencedColumns: ["industry_segment_id"]
          },
          {
            foreignKeyName: "master_domain_groups_industry_segment_id_fkey"
            columns: ["industry_segment_id"]
            isOneToOne: false
            referencedRelation: "master_industry_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_domain_groups_industry_segment_id_fkey"
            columns: ["industry_segment_id"]
            isOneToOne: false
            referencedRelation: "organization_context"
            referencedColumns: ["industry_segment_id"]
          },
        ]
      }
      master_engagement_model_subtypes: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          engagement_model_id: string
          id: string
          is_active: boolean
          is_user_created: boolean | null
          name: string
          optional_fields: Json | null
          required_fields: Json | null
          updated_at: string
          version: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          engagement_model_id: string
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name: string
          optional_fields?: Json | null
          required_fields?: Json | null
          updated_at?: string
          version?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          engagement_model_id?: string
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name?: string
          optional_fields?: Json | null
          required_fields?: Json | null
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "master_engagement_model_subtypes_engagement_model_id_fkey"
            columns: ["engagement_model_id"]
            isOneToOne: false
            referencedRelation: "master_engagement_models"
            referencedColumns: ["id"]
          },
        ]
      }
      master_engagement_models: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_user_created: boolean | null
          name: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      master_entity_types: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_user_created: boolean | null
          name: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_user_created?: boolean | null
          name: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_user_created?: boolean | null
          name?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      master_fee_components: {
        Row: {
          component_type: string
          created_at: string
          created_by: string | null
          default_rate_type: string | null
          description: string | null
          id: string
          is_active: boolean
          is_user_created: boolean | null
          name: string
          updated_at: string
          version: number | null
        }
        Insert: {
          component_type: string
          created_at?: string
          created_by?: string | null
          default_rate_type?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          component_type?: string
          created_at?: string
          created_by?: string | null
          default_rate_type?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: []
      }
      master_industry_segments: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_user_created: boolean | null
          name: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_user_created?: boolean | null
          name: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_user_created?: boolean | null
          name?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      master_membership_statuses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          version: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: []
      }
      master_onboarding_types: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_user_created: boolean | null
          name: string
          resources_included: Json | null
          service_type: string
          updated_at: string
          version: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name: string
          resources_included?: Json | null
          service_type: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name?: string
          resources_included?: Json | null
          service_type?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: []
      }
      master_organization_categories: {
        Row: {
          category_type: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_user_created: boolean | null
          name: string
          updated_at: string
          version: number | null
          workflow_config: Json | null
        }
        Insert: {
          category_type: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name: string
          updated_at?: string
          version?: number | null
          workflow_config?: Json | null
        }
        Update: {
          category_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name?: string
          updated_at?: string
          version?: number | null
          workflow_config?: Json | null
        }
        Relationships: []
      }
      master_organization_types: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_user_created: boolean | null
          name: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_user_created?: boolean | null
          name: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_user_created?: boolean | null
          name?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      master_platform_fee_formulas: {
        Row: {
          advance_payment_percentage: number | null
          base_consulting_fee: number | null
          base_management_fee: number | null
          configuration: Json | null
          country_id: string | null
          created_at: string
          created_by: string | null
          currency_id: string | null
          description: string | null
          engagement_model_id: string
          engagement_model_subtype_id: string | null
          formula_expression: string
          formula_name: string
          formula_type: string | null
          id: string
          is_active: boolean
          is_user_created: boolean | null
          membership_discount_percentage: number | null
          platform_usage_fee_percentage: number | null
          updated_at: string
          variables: Json | null
          version: number | null
        }
        Insert: {
          advance_payment_percentage?: number | null
          base_consulting_fee?: number | null
          base_management_fee?: number | null
          configuration?: Json | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_id?: string | null
          description?: string | null
          engagement_model_id: string
          engagement_model_subtype_id?: string | null
          formula_expression: string
          formula_name: string
          formula_type?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          membership_discount_percentage?: number | null
          platform_usage_fee_percentage?: number | null
          updated_at?: string
          variables?: Json | null
          version?: number | null
        }
        Update: {
          advance_payment_percentage?: number | null
          base_consulting_fee?: number | null
          base_management_fee?: number | null
          configuration?: Json | null
          country_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_id?: string | null
          description?: string | null
          engagement_model_id?: string
          engagement_model_subtype_id?: string | null
          formula_expression?: string
          formula_name?: string
          formula_type?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          membership_discount_percentage?: number | null
          platform_usage_fee_percentage?: number | null
          updated_at?: string
          variables?: Json | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "master_platform_fee_formulas_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "master_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_platform_fee_formulas_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "organization_context"
            referencedColumns: ["country_id"]
          },
          {
            foreignKeyName: "master_platform_fee_formulas_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "master_currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_platform_fee_formulas_engagement_model_id_fkey"
            columns: ["engagement_model_id"]
            isOneToOne: false
            referencedRelation: "master_engagement_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_platform_fee_formulas_engagement_model_subtype_id_fkey"
            columns: ["engagement_model_subtype_id"]
            isOneToOne: false
            referencedRelation: "master_engagement_model_subtypes"
            referencedColumns: ["id"]
          },
        ]
      }
      master_pricing_parameters: {
        Row: {
          amount: number
          complexity_applicable: boolean | null
          country_id: string
          created_at: string
          created_by: string | null
          currency_id: string
          effective_from: string | null
          effective_to: string | null
          engagement_model_context: Json | null
          entity_type_id: string
          fee_component_id: string
          id: string
          is_active: boolean
          is_user_created: boolean | null
          organization_type_id: string
          rate_type: string | null
          unit_of_measure_id: string
          updated_at: string
          version: number | null
        }
        Insert: {
          amount: number
          complexity_applicable?: boolean | null
          country_id: string
          created_at?: string
          created_by?: string | null
          currency_id: string
          effective_from?: string | null
          effective_to?: string | null
          engagement_model_context?: Json | null
          entity_type_id: string
          fee_component_id: string
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          organization_type_id: string
          rate_type?: string | null
          unit_of_measure_id: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          amount?: number
          complexity_applicable?: boolean | null
          country_id?: string
          created_at?: string
          created_by?: string | null
          currency_id?: string
          effective_from?: string | null
          effective_to?: string | null
          engagement_model_context?: Json | null
          entity_type_id?: string
          fee_component_id?: string
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          organization_type_id?: string
          rate_type?: string | null
          unit_of_measure_id?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "master_pricing_parameters_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "master_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_pricing_parameters_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "organization_context"
            referencedColumns: ["country_id"]
          },
          {
            foreignKeyName: "master_pricing_parameters_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "master_currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_pricing_parameters_entity_type_id_fkey"
            columns: ["entity_type_id"]
            isOneToOne: false
            referencedRelation: "master_entity_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_pricing_parameters_entity_type_id_fkey"
            columns: ["entity_type_id"]
            isOneToOne: false
            referencedRelation: "organization_context"
            referencedColumns: ["entity_type_id"]
          },
          {
            foreignKeyName: "master_pricing_parameters_fee_component_id_fkey"
            columns: ["fee_component_id"]
            isOneToOne: false
            referencedRelation: "master_fee_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_pricing_parameters_organization_type_id_fkey"
            columns: ["organization_type_id"]
            isOneToOne: false
            referencedRelation: "master_organization_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_pricing_parameters_organization_type_id_fkey"
            columns: ["organization_type_id"]
            isOneToOne: false
            referencedRelation: "organization_context"
            referencedColumns: ["organization_type_id"]
          },
          {
            foreignKeyName: "master_pricing_parameters_unit_of_measure_id_fkey"
            columns: ["unit_of_measure_id"]
            isOneToOne: false
            referencedRelation: "master_units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      master_pricing_tiers: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_user_created: boolean | null
          level_order: number
          name: string
          updated_at: string
          version: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          level_order: number
          name: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          level_order?: number
          name?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: []
      }
      master_reward_types: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_user_created: boolean | null
          name: string
          type: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_user_created?: boolean | null
          name: string
          type?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_user_created?: boolean | null
          name?: string
          type?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      master_seeker_membership_fees: {
        Row: {
          annual_amount: number | null
          annual_currency: string | null
          country: string
          country_id: string
          created_at: string
          created_by: string | null
          description: string | null
          entity_type: string
          entity_type_id: string
          half_yearly_amount: number | null
          half_yearly_currency: string | null
          id: string
          is_user_created: boolean | null
          monthly_amount: number | null
          monthly_currency: string | null
          organization_type: string
          organization_type_id: string
          quarterly_amount: number | null
          quarterly_currency: string | null
          updated_at: string
          version: number | null
        }
        Insert: {
          annual_amount?: number | null
          annual_currency?: string | null
          country: string
          country_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_type: string
          entity_type_id: string
          half_yearly_amount?: number | null
          half_yearly_currency?: string | null
          id?: string
          is_user_created?: boolean | null
          monthly_amount?: number | null
          monthly_currency?: string | null
          organization_type: string
          organization_type_id: string
          quarterly_amount?: number | null
          quarterly_currency?: string | null
          updated_at?: string
          version?: number | null
        }
        Update: {
          annual_amount?: number | null
          annual_currency?: string | null
          country?: string
          country_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_type?: string
          entity_type_id?: string
          half_yearly_amount?: number | null
          half_yearly_currency?: string | null
          id?: string
          is_user_created?: boolean | null
          monthly_amount?: number | null
          monthly_currency?: string | null
          organization_type?: string
          organization_type_id?: string
          quarterly_amount?: number | null
          quarterly_currency?: string | null
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "master_seeker_membership_fees_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "master_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_seeker_membership_fees_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "organization_context"
            referencedColumns: ["country_id"]
          },
          {
            foreignKeyName: "master_seeker_membership_fees_entity_type_id_fkey"
            columns: ["entity_type_id"]
            isOneToOne: false
            referencedRelation: "master_entity_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_seeker_membership_fees_entity_type_id_fkey"
            columns: ["entity_type_id"]
            isOneToOne: false
            referencedRelation: "organization_context"
            referencedColumns: ["entity_type_id"]
          },
          {
            foreignKeyName: "master_seeker_membership_fees_organization_type_id_fkey"
            columns: ["organization_type_id"]
            isOneToOne: false
            referencedRelation: "master_organization_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_seeker_membership_fees_organization_type_id_fkey"
            columns: ["organization_type_id"]
            isOneToOne: false
            referencedRelation: "organization_context"
            referencedColumns: ["organization_type_id"]
          },
        ]
      }
      master_sub_categories: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_user_created: boolean | null
          name: string
          updated_at: string
          version: number | null
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sub_categories_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "master_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      master_sub_departments: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string
          description: string | null
          id: string
          is_active: boolean
          is_user_created: boolean | null
          name: string
          updated_at: string
          version: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "master_sub_departments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "master_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      master_support_types: {
        Row: {
          availability: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_user_created: boolean | null
          name: string
          response_time: string | null
          service_level: string
          updated_at: string
          version: number | null
        }
        Insert: {
          availability?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name: string
          response_time?: string | null
          service_level: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          availability?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name?: string
          response_time?: string | null
          service_level?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: []
      }
      master_system_configurations: {
        Row: {
          category: string | null
          config_key: string
          config_value: string
          created_at: string
          created_by: string | null
          data_type: string
          description: string | null
          id: string
          is_active: boolean
          is_system_config: boolean
          updated_at: string
          version: number | null
        }
        Insert: {
          category?: string | null
          config_key: string
          config_value: string
          created_at?: string
          created_by?: string | null
          data_type: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system_config?: boolean
          updated_at?: string
          version?: number | null
        }
        Update: {
          category?: string | null
          config_key?: string
          config_value?: string
          created_at?: string
          created_by?: string | null
          data_type?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_system_config?: boolean
          updated_at?: string
          version?: number | null
        }
        Relationships: []
      }
      master_system_feature_access: {
        Row: {
          access_level: string
          created_at: string
          created_by: string | null
          feature_config: Json | null
          feature_name: string
          id: string
          is_active: boolean
          is_enabled: boolean
          is_user_created: boolean | null
          pricing_tier_id: string
          updated_at: string
          version: number | null
        }
        Insert: {
          access_level: string
          created_at?: string
          created_by?: string | null
          feature_config?: Json | null
          feature_name: string
          id?: string
          is_active?: boolean
          is_enabled?: boolean
          is_user_created?: boolean | null
          pricing_tier_id: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          access_level?: string
          created_at?: string
          created_by?: string | null
          feature_config?: Json | null
          feature_name?: string
          id?: string
          is_active?: boolean
          is_enabled?: boolean
          is_user_created?: boolean | null
          pricing_tier_id?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "master_system_feature_access_pricing_tier_id_fkey"
            columns: ["pricing_tier_id"]
            isOneToOne: false
            referencedRelation: "master_pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      master_team_units: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_user_created: boolean | null
          name: string
          sub_department_id: string
          updated_at: string
          version: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name: string
          sub_department_id: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name?: string
          sub_department_id?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "master_team_units_sub_department_id_fkey"
            columns: ["sub_department_id"]
            isOneToOne: false
            referencedRelation: "master_sub_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      master_tier_configurations: {
        Row: {
          allows_overage: boolean
          analytics_access_id: string | null
          country_id: string
          created_at: string
          created_by: string | null
          currency_id: string | null
          fixed_charge_per_challenge: number
          id: string
          is_active: boolean
          is_user_created: boolean | null
          monthly_challenge_limit: number | null
          onboarding_type_id: string | null
          pricing_tier_id: string
          solutions_per_challenge: number
          support_type_id: string | null
          updated_at: string
          version: number | null
          workflow_template_id: string | null
        }
        Insert: {
          allows_overage?: boolean
          analytics_access_id?: string | null
          country_id: string
          created_at?: string
          created_by?: string | null
          currency_id?: string | null
          fixed_charge_per_challenge?: number
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          monthly_challenge_limit?: number | null
          onboarding_type_id?: string | null
          pricing_tier_id: string
          solutions_per_challenge?: number
          support_type_id?: string | null
          updated_at?: string
          version?: number | null
          workflow_template_id?: string | null
        }
        Update: {
          allows_overage?: boolean
          analytics_access_id?: string | null
          country_id?: string
          created_at?: string
          created_by?: string | null
          currency_id?: string | null
          fixed_charge_per_challenge?: number
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          monthly_challenge_limit?: number | null
          onboarding_type_id?: string | null
          pricing_tier_id?: string
          solutions_per_challenge?: number
          support_type_id?: string | null
          updated_at?: string
          version?: number | null
          workflow_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "master_tier_configurations_analytics_access_id_fkey"
            columns: ["analytics_access_id"]
            isOneToOne: false
            referencedRelation: "master_analytics_access_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_tier_configurations_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "master_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_tier_configurations_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "organization_context"
            referencedColumns: ["country_id"]
          },
          {
            foreignKeyName: "master_tier_configurations_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "master_currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_tier_configurations_onboarding_type_id_fkey"
            columns: ["onboarding_type_id"]
            isOneToOne: false
            referencedRelation: "master_onboarding_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_tier_configurations_pricing_tier_id_fkey"
            columns: ["pricing_tier_id"]
            isOneToOne: false
            referencedRelation: "master_pricing_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_tier_configurations_support_type_id_fkey"
            columns: ["support_type_id"]
            isOneToOne: false
            referencedRelation: "master_support_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_tier_configurations_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "master_workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      master_tier_engagement_model_access: {
        Row: {
          allows_multiple_challenges: boolean
          business_rules: Json | null
          created_at: string
          created_by: string | null
          engagement_model_id: string
          id: string
          is_active: boolean
          is_allowed: boolean
          is_default: boolean
          is_user_created: boolean | null
          max_concurrent_models: number
          pricing_tier_id: string
          selection_scope: string
          switch_requirements: string
          updated_at: string
          version: number | null
        }
        Insert: {
          allows_multiple_challenges?: boolean
          business_rules?: Json | null
          created_at?: string
          created_by?: string | null
          engagement_model_id: string
          id?: string
          is_active?: boolean
          is_allowed?: boolean
          is_default?: boolean
          is_user_created?: boolean | null
          max_concurrent_models?: number
          pricing_tier_id: string
          selection_scope?: string
          switch_requirements?: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          allows_multiple_challenges?: boolean
          business_rules?: Json | null
          created_at?: string
          created_by?: string | null
          engagement_model_id?: string
          id?: string
          is_active?: boolean
          is_allowed?: boolean
          is_default?: boolean
          is_user_created?: boolean | null
          max_concurrent_models?: number
          pricing_tier_id?: string
          selection_scope?: string
          switch_requirements?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "master_tier_engagement_model_access_engagement_model_id_fkey"
            columns: ["engagement_model_id"]
            isOneToOne: false
            referencedRelation: "master_engagement_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_tier_engagement_model_access_pricing_tier_id_fkey"
            columns: ["pricing_tier_id"]
            isOneToOne: false
            referencedRelation: "master_pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      master_units_of_measure: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_percentage: boolean
          name: string
          symbol: string | null
          updated_at: string
          version: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_percentage?: boolean
          name: string
          symbol?: string | null
          updated_at?: string
          version?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_percentage?: boolean
          name?: string
          symbol?: string | null
          updated_at?: string
          version?: number | null
        }
        Relationships: []
      }
      master_workflow_templates: {
        Row: {
          created_at: string
          created_by: string | null
          customization_level: string
          description: string | null
          fields_config: Json | null
          id: string
          is_active: boolean
          is_user_created: boolean | null
          name: string
          template_count: number | null
          template_type: string
          updated_at: string
          version: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customization_level: string
          description?: string | null
          fields_config?: Json | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name: string
          template_count?: number | null
          template_type: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customization_level?: string
          description?: string | null
          fields_config?: Json | null
          id?: string
          is_active?: boolean
          is_user_created?: boolean | null
          name?: string
          template_count?: number | null
          template_type?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: []
      }
      media_processing: {
        Row: {
          created_at: string | null
          id: string
          media_type: string
          metadata: Json | null
          original_filename: string
          processing_error: string | null
          processing_progress: number | null
          processing_status: string | null
          storage_path: string
          thumbnail_url: string | null
          updated_at: string | null
          user_id: string
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          media_type: string
          metadata?: Json | null
          original_filename: string
          processing_error?: string | null
          processing_progress?: number | null
          processing_status?: string | null
          storage_path: string
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id: string
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          media_type?: string
          metadata?: Json | null
          original_filename?: string
          processing_error?: string | null
          processing_progress?: number | null
          processing_status?: string | null
          storage_path?: string
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_processing_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      member_status_change_alerts: {
        Row: {
          alert_processed: boolean
          change_detected_at: string
          id: string
          metadata: Json | null
          new_status: string
          organization_id: string
          previous_status: string
          processed_at: string | null
        }
        Insert: {
          alert_processed?: boolean
          change_detected_at?: string
          id?: string
          metadata?: Json | null
          new_status: string
          organization_id: string
          previous_status: string
          processed_at?: string | null
        }
        Update: {
          alert_processed?: boolean
          change_detected_at?: string
          id?: string
          metadata?: Json | null
          new_status?: string
          organization_id?: string
          previous_status?: string
          processed_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: string[] | null
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          message_type: string | null
          reply_to_id: string | null
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          attachments?: string[] | null
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          message_type?: string | null
          reply_to_id?: string | null
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          attachments?: string[] | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          message_type?: string | null
          reply_to_id?: string | null
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          metadata: Json | null
          target_id: string | null
          target_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      org_admins: {
        Row: {
          admin_email: string
          admin_name: string
          created_at: string
          id: string
          organization_id: string
          user_id: string | null
        }
        Insert: {
          admin_email: string
          admin_name: string
          created_at?: string
          id?: string
          organization_id: string
          user_id?: string | null
        }
        Update: {
          admin_email?: string
          admin_name?: string
          created_at?: string
          id?: string
          organization_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      organization_documents: {
        Row: {
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          organization_id: string
          uploaded_at: string
        }
        Insert: {
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          organization_id: string
          uploaded_at?: string
        }
        Update: {
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          organization_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_context"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "solution_seekers_comprehensive_view"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string
          contact_person_name: string
          country_code: string | null
          country_id: string | null
          created_at: string
          email: string
          entity_type_id: string | null
          id: string
          industry_segment_id: string | null
          organization_category_id: string | null
          organization_id: string
          organization_name: string
          organization_type_id: string | null
          password_hash: string | null
          phone_number: string
          registration_status: string | null
          updated_at: string
          user_id: string | null
          website: string | null
        }
        Insert: {
          address: string
          contact_person_name: string
          country_code?: string | null
          country_id?: string | null
          created_at?: string
          email: string
          entity_type_id?: string | null
          id?: string
          industry_segment_id?: string | null
          organization_category_id?: string | null
          organization_id: string
          organization_name: string
          organization_type_id?: string | null
          password_hash?: string | null
          phone_number: string
          registration_status?: string | null
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Update: {
          address?: string
          contact_person_name?: string
          country_code?: string | null
          country_id?: string | null
          created_at?: string
          email?: string
          entity_type_id?: string | null
          id?: string
          industry_segment_id?: string | null
          organization_category_id?: string | null
          organization_id?: string
          organization_name?: string
          organization_type_id?: string | null
          password_hash?: string | null
          phone_number?: string
          registration_status?: string | null
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "master_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "organization_context"
            referencedColumns: ["country_id"]
          },
          {
            foreignKeyName: "organizations_entity_type_id_fkey"
            columns: ["entity_type_id"]
            isOneToOne: false
            referencedRelation: "master_entity_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_entity_type_id_fkey"
            columns: ["entity_type_id"]
            isOneToOne: false
            referencedRelation: "organization_context"
            referencedColumns: ["entity_type_id"]
          },
          {
            foreignKeyName: "organizations_industry_segment_id_fkey"
            columns: ["industry_segment_id"]
            isOneToOne: false
            referencedRelation: "master_industry_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_industry_segment_id_fkey"
            columns: ["industry_segment_id"]
            isOneToOne: false
            referencedRelation: "organization_context"
            referencedColumns: ["industry_segment_id"]
          },
          {
            foreignKeyName: "organizations_organization_category_id_fkey"
            columns: ["organization_category_id"]
            isOneToOne: false
            referencedRelation: "master_organization_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_organization_type_id_fkey"
            columns: ["organization_type_id"]
            isOneToOne: false
            referencedRelation: "master_organization_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_organization_type_id_fkey"
            columns: ["organization_type_id"]
            isOneToOne: false
            referencedRelation: "organization_context"
            referencedColumns: ["organization_type_id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number | null
          content: string
          created_at: string | null
          event_data: Json | null
          hashtags: string[] | null
          id: string
          images: string[] | null
          is_archived: boolean | null
          is_pinned: boolean | null
          media_urls: string[] | null
          mentions: string[] | null
          metadata: Json | null
          poll_data: Json | null
          post_type: string | null
          quote_content: string | null
          reactions_count: number | null
          shared_post_id: string | null
          shares_count: number | null
          thumbnail_url: string | null
          updated_at: string | null
          user_id: string
          videos: string[] | null
          visibility: string | null
        }
        Insert: {
          comments_count?: number | null
          content: string
          created_at?: string | null
          event_data?: Json | null
          hashtags?: string[] | null
          id?: string
          images?: string[] | null
          is_archived?: boolean | null
          is_pinned?: boolean | null
          media_urls?: string[] | null
          mentions?: string[] | null
          metadata?: Json | null
          poll_data?: Json | null
          post_type?: string | null
          quote_content?: string | null
          reactions_count?: number | null
          shared_post_id?: string | null
          shares_count?: number | null
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id: string
          videos?: string[] | null
          visibility?: string | null
        }
        Update: {
          comments_count?: number | null
          content?: string
          created_at?: string | null
          event_data?: Json | null
          hashtags?: string[] | null
          id?: string
          images?: string[] | null
          is_archived?: boolean | null
          is_pinned?: boolean | null
          media_urls?: string[] | null
          mentions?: string[] | null
          metadata?: Json | null
          poll_data?: Json | null
          post_type?: string | null
          quote_content?: string | null
          reactions_count?: number | null
          shared_post_id?: string | null
          shares_count?: number | null
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id?: string
          videos?: string[] | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_shared_post_id_fkey"
            columns: ["shared_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_configurations: {
        Row: {
          advance_payment_type_id: string | null
          base_value: number
          billing_frequency_id: string | null
          calculated_advance_payment: number | null
          calculated_platform_fee: number | null
          calculated_value: number | null
          config_name: string | null
          consulting_fee_amount: number | null
          country_id: string
          created_at: string
          created_by: string | null
          currency_id: string | null
          effective_from: string | null
          effective_to: string | null
          engagement_model_id: string
          engagement_model_subtype_id: string | null
          entity_type_id: string
          formula_variables: Json | null
          id: string
          is_active: boolean
          management_fee_amount: number | null
          membership_discount_percentage: number | null
          membership_status_id: string
          organization_type_id: string
          platform_fee_formula_id: string | null
          pricing_tier_id: string | null
          remarks: string | null
          unit_of_measure_id: string
          updated_at: string
          updated_by: string | null
          version: number | null
        }
        Insert: {
          advance_payment_type_id?: string | null
          base_value: number
          billing_frequency_id?: string | null
          calculated_advance_payment?: number | null
          calculated_platform_fee?: number | null
          calculated_value?: number | null
          config_name?: string | null
          consulting_fee_amount?: number | null
          country_id: string
          created_at?: string
          created_by?: string | null
          currency_id?: string | null
          effective_from?: string | null
          effective_to?: string | null
          engagement_model_id: string
          engagement_model_subtype_id?: string | null
          entity_type_id: string
          formula_variables?: Json | null
          id?: string
          is_active?: boolean
          management_fee_amount?: number | null
          membership_discount_percentage?: number | null
          membership_status_id: string
          organization_type_id: string
          platform_fee_formula_id?: string | null
          pricing_tier_id?: string | null
          remarks?: string | null
          unit_of_measure_id: string
          updated_at?: string
          updated_by?: string | null
          version?: number | null
        }
        Update: {
          advance_payment_type_id?: string | null
          base_value?: number
          billing_frequency_id?: string | null
          calculated_advance_payment?: number | null
          calculated_platform_fee?: number | null
          calculated_value?: number | null
          config_name?: string | null
          consulting_fee_amount?: number | null
          country_id?: string
          created_at?: string
          created_by?: string | null
          currency_id?: string | null
          effective_from?: string | null
          effective_to?: string | null
          engagement_model_id?: string
          engagement_model_subtype_id?: string | null
          entity_type_id?: string
          formula_variables?: Json | null
          id?: string
          is_active?: boolean
          management_fee_amount?: number | null
          membership_discount_percentage?: number | null
          membership_status_id?: string
          organization_type_id?: string
          platform_fee_formula_id?: string | null
          pricing_tier_id?: string | null
          remarks?: string | null
          unit_of_measure_id?: string
          updated_at?: string
          updated_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_advance_payment_type"
            columns: ["advance_payment_type_id"]
            isOneToOne: false
            referencedRelation: "master_advance_payment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_engagement_model_subtype"
            columns: ["engagement_model_subtype_id"]
            isOneToOne: false
            referencedRelation: "master_engagement_model_subtypes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_platform_fee_formula"
            columns: ["platform_fee_formula_id"]
            isOneToOne: false
            referencedRelation: "master_platform_fee_formulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pricing_tier"
            columns: ["pricing_tier_id"]
            isOneToOne: false
            referencedRelation: "master_pricing_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_configurations_billing_frequency_fkey"
            columns: ["billing_frequency_id"]
            isOneToOne: false
            referencedRelation: "master_billing_frequencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_configurations_country_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "master_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_configurations_country_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "organization_context"
            referencedColumns: ["country_id"]
          },
          {
            foreignKeyName: "pricing_configurations_currency_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "master_currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_configurations_engagement_model_fkey"
            columns: ["engagement_model_id"]
            isOneToOne: false
            referencedRelation: "master_engagement_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_configurations_entity_type_fkey"
            columns: ["entity_type_id"]
            isOneToOne: false
            referencedRelation: "master_entity_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_configurations_entity_type_fkey"
            columns: ["entity_type_id"]
            isOneToOne: false
            referencedRelation: "organization_context"
            referencedColumns: ["entity_type_id"]
          },
          {
            foreignKeyName: "pricing_configurations_membership_status_fkey"
            columns: ["membership_status_id"]
            isOneToOne: false
            referencedRelation: "master_membership_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_configurations_org_type_fkey"
            columns: ["organization_type_id"]
            isOneToOne: false
            referencedRelation: "master_organization_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_configurations_org_type_fkey"
            columns: ["organization_type_id"]
            isOneToOne: false
            referencedRelation: "organization_context"
            referencedColumns: ["organization_type_id"]
          },
          {
            foreignKeyName: "pricing_configurations_unit_measure_fkey"
            columns: ["unit_of_measure_id"]
            isOneToOne: false
            referencedRelation: "master_units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          company_logo: string[] | null
          company_profile: string[] | null
          contact_person_name: string
          country: string
          country_code: string | null
          created_at: string
          custom_user_id: string
          entity_type: string
          id: string
          industry_segment: string | null
          organization_id: string | null
          organization_name: string
          organization_type: string
          phone_number: string | null
          registration_documents: string[] | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          company_logo?: string[] | null
          company_profile?: string[] | null
          contact_person_name: string
          country: string
          country_code?: string | null
          created_at?: string
          custom_user_id: string
          entity_type: string
          id: string
          industry_segment?: string | null
          organization_id?: string | null
          organization_name: string
          organization_type: string
          phone_number?: string | null
          registration_documents?: string[] | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          company_logo?: string[] | null
          company_profile?: string[] | null
          contact_person_name?: string
          country?: string
          country_code?: string | null
          created_at?: string
          custom_user_id?: string
          entity_type?: string
          id?: string
          industry_segment?: string | null
          organization_id?: string | null
          organization_name?: string
          organization_type?: string
          phone_number?: string | null
          registration_documents?: string[] | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      reactions: {
        Row: {
          created_at: string | null
          id: string
          reaction_type: string | null
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reaction_type?: string | null
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reaction_type?: string | null
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          version: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: []
      }
      seeking_organization_roles: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          domain_group_id: string | null
          email_id: string
          id: string
          is_active: boolean
          mobile_number: string
          password: string
          role_name: string
          sub_department_id: string | null
          subcategory_id: string | null
          team_unit_id: string | null
          updated_at: string
          user_id: string
          version: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          domain_group_id?: string | null
          email_id: string
          id?: string
          is_active?: boolean
          mobile_number: string
          password: string
          role_name: string
          sub_department_id?: string | null
          subcategory_id?: string | null
          team_unit_id?: string | null
          updated_at?: string
          user_id: string
          version?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          domain_group_id?: string | null
          email_id?: string
          id?: string
          is_active?: boolean
          mobile_number?: string
          password?: string
          role_name?: string
          sub_department_id?: string | null
          subcategory_id?: string | null
          team_unit_id?: string | null
          updated_at?: string
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "seeking_organization_roles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "master_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeking_organization_roles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "master_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeking_organization_roles_domain_group_id_fkey"
            columns: ["domain_group_id"]
            isOneToOne: false
            referencedRelation: "master_domain_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeking_organization_roles_sub_department_id_fkey"
            columns: ["sub_department_id"]
            isOneToOne: false
            referencedRelation: "master_sub_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeking_organization_roles_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "master_sub_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seeking_organization_roles_team_unit_id_fkey"
            columns: ["team_unit_id"]
            isOneToOne: false
            referencedRelation: "master_team_units"
            referencedColumns: ["id"]
          },
        ]
      }
      shares: {
        Row: {
          created_at: string | null
          id: string
          quote_content: string | null
          share_type: string
          target_id: string
          target_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          quote_content?: string | null
          share_type: string
          target_id: string
          target_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          quote_content?: string | null
          share_type?: string
          target_id?: string
          target_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_trending: boolean | null
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_trending?: boolean | null
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_trending?: boolean | null
          name?: string
        }
        Relationships: []
      }
      tier_engagement_model_restrictions: {
        Row: {
          created_at: string
          created_by: string | null
          engagement_model_id: string
          engagement_model_subtype_id: string | null
          id: string
          is_allowed: boolean
          pricing_tier_id: string
          updated_at: string
          version: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          engagement_model_id: string
          engagement_model_subtype_id?: string | null
          id?: string
          is_allowed?: boolean
          pricing_tier_id: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          engagement_model_id?: string
          engagement_model_subtype_id?: string | null
          id?: string
          is_allowed?: boolean
          pricing_tier_id?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tier_engagement_model_restrict_engagement_model_subtype_id_fkey"
            columns: ["engagement_model_subtype_id"]
            isOneToOne: false
            referencedRelation: "master_engagement_model_subtypes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_engagement_model_restrictions_engagement_model_id_fkey"
            columns: ["engagement_model_id"]
            isOneToOne: false
            referencedRelation: "master_engagement_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_engagement_model_restrictions_pricing_tier_id_fkey"
            columns: ["pricing_tier_id"]
            isOneToOne: false
            referencedRelation: "master_pricing_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_skill_profiles: {
        Row: {
          created_at: string | null
          id: string
          is_verified: boolean | null
          proficiency_level: string | null
          skill_name: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          proficiency_level?: string | null
          skill_name: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          proficiency_level?: string | null
          skill_name?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_skill_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_skills: {
        Row: {
          created_at: string | null
          id: string
          is_endorsed: boolean | null
          proficiency_level: string | null
          skill_id: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_endorsed?: boolean | null
          proficiency_level?: string | null
          skill_id: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_endorsed?: boolean | null
          proficiency_level?: string | null
          skill_id?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          headline: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          last_seen_at: string | null
          location: string | null
          password_hash: string | null
          updated_at: string | null
          username: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          headline?: string | null
          id: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_seen_at?: string | null
          location?: string | null
          password_hash?: string | null
          updated_at?: string | null
          username: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          headline?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_seen_at?: string | null
          location?: string | null
          password_hash?: string | null
          updated_at?: string | null
          username?: string
          website?: string | null
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      organization_context: {
        Row: {
          address: string | null
          contact_person_name: string | null
          country_id: string | null
          country_name: string | null
          email: string | null
          entity_type_id: string | null
          entity_type_name: string | null
          id: string | null
          industry_segment_id: string | null
          industry_segment_name: string | null
          organization_id: string | null
          organization_name: string | null
          organization_type_id: string | null
          organization_type_name: string | null
          phone_number: string | null
          user_id: string | null
          website: string | null
        }
        Relationships: []
      }
      pricing_configurations_detailed: {
        Row: {
          base_value: number | null
          billing_frequency: string | null
          billing_months: number | null
          calculated_value: number | null
          config_name: string | null
          country_code: string | null
          country_name: string | null
          created_at: string | null
          currency_code: string | null
          currency_name: string | null
          currency_symbol: string | null
          effective_from: string | null
          effective_to: string | null
          engagement_model: string | null
          entity_type: string | null
          id: string | null
          is_active: boolean | null
          is_percentage: boolean | null
          membership_discount_percentage: number | null
          membership_status: string | null
          organization_type: string | null
          remarks: string | null
          unit_of_measure: string | null
          unit_symbol: string | null
          updated_at: string | null
          version: number | null
        }
        Relationships: []
      }
      pricing_parameters_management_consulting: {
        Row: {
          amount: number | null
          complexity_applicable: boolean | null
          component_type: string | null
          country_id: string | null
          country_name: string | null
          created_at: string | null
          created_by: string | null
          currency_id: string | null
          currency_name: string | null
          currency_symbol: string | null
          effective_from: string | null
          effective_to: string | null
          engagement_model_context: Json | null
          entity_type_id: string | null
          entity_type_name: string | null
          fee_component_id: string | null
          fee_component_name: string | null
          id: string | null
          is_active: boolean | null
          is_user_created: boolean | null
          organization_type_id: string | null
          organization_type_name: string | null
          rate_type: string | null
          unit_name: string | null
          unit_of_measure_id: string | null
          unit_symbol: string | null
          updated_at: string | null
          version: number | null
        }
        Relationships: [
          {
            foreignKeyName: "master_pricing_parameters_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "master_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_pricing_parameters_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "organization_context"
            referencedColumns: ["country_id"]
          },
          {
            foreignKeyName: "master_pricing_parameters_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "master_currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_pricing_parameters_entity_type_id_fkey"
            columns: ["entity_type_id"]
            isOneToOne: false
            referencedRelation: "master_entity_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_pricing_parameters_entity_type_id_fkey"
            columns: ["entity_type_id"]
            isOneToOne: false
            referencedRelation: "organization_context"
            referencedColumns: ["entity_type_id"]
          },
          {
            foreignKeyName: "master_pricing_parameters_fee_component_id_fkey"
            columns: ["fee_component_id"]
            isOneToOne: false
            referencedRelation: "master_fee_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_pricing_parameters_organization_type_id_fkey"
            columns: ["organization_type_id"]
            isOneToOne: false
            referencedRelation: "master_organization_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_pricing_parameters_organization_type_id_fkey"
            columns: ["organization_type_id"]
            isOneToOne: false
            referencedRelation: "organization_context"
            referencedColumns: ["organization_type_id"]
          },
          {
            foreignKeyName: "master_pricing_parameters_unit_of_measure_id_fkey"
            columns: ["unit_of_measure_id"]
            isOneToOne: false
            referencedRelation: "master_units_of_measure"
            referencedColumns: ["id"]
          },
        ]
      }
      solution_seekers_comprehensive_view: {
        Row: {
          activation_status: string | null
          address: string | null
          contact_person_name: string | null
          country: string | null
          country_code: string | null
          created_at: string | null
          current_frequency: string | null
          discount_percentage: number | null
          email: string | null
          engagement_locked: boolean | null
          engagement_model: string | null
          engagement_model_details: Json | null
          engagement_model_selected_at: string | null
          enm_terms: boolean | null
          entity_type: string | null
          final_calculated_price: number | null
          frequency_change_history: Json | null
          frequency_payments: Json | null
          has_engagement_record: boolean | null
          has_user_account: boolean | null
          id: string | null
          industry_segment: string | null
          last_activity: string | null
          last_payment_date: string | null
          lock_date: string | null
          mem_payment_amount: number | null
          mem_payment_currency: string | null
          mem_payment_date: string | null
          mem_payment_method: string | null
          mem_payment_status: string | null
          mem_receipt_number: string | null
          mem_terms: boolean | null
          membership_status: string | null
          organization_id: string | null
          organization_name: string | null
          organization_type: string | null
          overall_status: string | null
          payment_simulation_status: string | null
          phone_number: string | null
          platform_fee_percentage: number | null
          pricing_locked: boolean | null
          pricing_tier: string | null
          selected_frequency: string | null
          terms_accepted: boolean | null
          tier_features: Json | null
          tier_selected_at: string | null
          total_payments_made: number | null
          updated_at: string | null
          updated_platform_fee_percentage: number | null
          user_id: string | null
          website: string | null
          workflow_completed: boolean | null
          workflow_step: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      bulk_update_pricing_discount: {
        Args: {
          p_country_name: string
          p_organization_type: string
          p_new_discount: number
        }
        Returns: number
      }
      check_active_challenges_for_user: {
        Args: { user_id_param: string }
        Returns: number
      }
      check_fee_component_dependencies: {
        Args: { component_id: string }
        Returns: Json
      }
      generate_organization_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_comprehensive_organization_data: {
        Args: { org_id: string }
        Returns: Json
      }
      get_membership_workflow_status: {
        Args: { user_id_param: string }
        Returns: Json
      }
      get_pricing_configuration: {
        Args: {
          p_country_name: string
          p_organization_type: string
          p_entity_type: string
          p_engagement_model: string
          p_membership_status?: string
          p_billing_frequency?: string
        }
        Returns: {
          id: string
          config_name: string
          base_value: number
          calculated_value: number
          unit_symbol: string
          currency_code: string
          membership_discount: number
        }[]
      }
      get_table_schema: {
        Args: { table_name: string }
        Returns: {
          column_name: string
          data_type: string
          is_nullable: string
          column_default: string
          ordinal_position: number
        }[]
      }
      get_user_current_global_model: {
        Args: { user_id_param: string }
        Returns: Json
      }
      is_org_admin: {
        Args: { check_user_id?: string }
        Returns: string
      }
      safe_delete_fee_component: {
        Args: { component_id: string; cascade_delete?: boolean }
        Returns: Json
      }
      validate_engagement_model_switch: {
        Args: {
          user_id_param: string
          tier_id_param: string
          new_model_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "user" | "creator" | "business" | "admin"
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
      app_role: ["user", "creator", "business", "admin"],
    },
  },
} as const
