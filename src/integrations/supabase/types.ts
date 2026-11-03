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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      brand_applications: {
        Row: {
          audience: string[]
          audience_categories: Json
          brand_description: string
          brand_name: string
          category: string
          commission_agreed_at: string | null
          commission_rate: number
          contact_name: string
          cover_path: string
          created_at: string
          email: string
          id: string
          logo_path: string
          proof_path: string | null
          public_handle: string | null
          social_handle: string | null
          status: string
          updated_at: string
          user_id: string
          website_url: string
        }
        Insert: {
          audience?: string[]
          audience_categories?: Json
          brand_description: string
          brand_name: string
          category: string
          commission_agreed_at?: string | null
          commission_rate?: number
          contact_name: string
          cover_path: string
          created_at?: string
          email: string
          id?: string
          logo_path: string
          proof_path?: string | null
          public_handle?: string | null
          social_handle?: string | null
          status?: string
          updated_at?: string
          user_id: string
          website_url: string
        }
        Update: {
          audience?: string[]
          audience_categories?: Json
          brand_description?: string
          brand_name?: string
          category?: string
          commission_agreed_at?: string | null
          commission_rate?: number
          contact_name?: string
          cover_path?: string
          created_at?: string
          email?: string
          id?: string
          logo_path?: string
          proof_path?: string | null
          public_handle?: string | null
          social_handle?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          website_url?: string
        }
        Relationships: []
      }
      brand_orders: {
        Row: {
          brand_application_id: string
          brand_user_id: string
          created_at: string
          currency: string
          customer_email: string
          customer_name: string
          customer_phone: string
          customer_user_id: string | null
          delivered_at: string | null
          delivery_address: Json
          destination_pin_code: string
          dispatched_at: string | null
          estimated_delivery_end: string | null
          estimated_delivery_start: string | null
          id: string
          order_number: string
          product_id: string | null
          product_name: string
          quantity: number
          selected_color: string
          selected_size: string
          status: string
          tracking_number: string
          tracking_provider: string
          tracking_url: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          brand_application_id: string
          brand_user_id: string
          created_at?: string
          currency?: string
          customer_email: string
          customer_name: string
          customer_phone?: string
          customer_user_id?: string | null
          delivered_at?: string | null
          delivery_address?: Json
          destination_pin_code: string
          dispatched_at?: string | null
          estimated_delivery_end?: string | null
          estimated_delivery_start?: string | null
          id?: string
          order_number: string
          product_id?: string | null
          product_name: string
          quantity?: number
          selected_color?: string
          selected_size?: string
          status?: string
          tracking_number?: string
          tracking_provider?: string
          tracking_url?: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          brand_application_id?: string
          brand_user_id?: string
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          customer_user_id?: string | null
          delivered_at?: string | null
          delivery_address?: Json
          destination_pin_code?: string
          dispatched_at?: string | null
          estimated_delivery_end?: string | null
          estimated_delivery_start?: string | null
          id?: string
          order_number?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          selected_color?: string
          selected_size?: string
          status?: string
          tracking_number?: string
          tracking_provider?: string
          tracking_url?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_orders_brand_application_id_fkey"
            columns: ["brand_application_id"]
            isOneToOne: false
            referencedRelation: "brand_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "brand_products"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_products: {
        Row: {
          audience: string[]
          brand_application_id: string
          brand_approved: boolean
          category: string
          colors: string[]
          created_at: string
          currency: string
          description: string
          id: string
          image_path: string | null
          price: number
          product_name: string
          product_url: string | null
          sizes: string[]
          size_chart: Json | null
          source: string
          status: string
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          audience: string[]
          brand_application_id: string
          brand_approved?: boolean
          category: string
          colors?: string[]
          created_at?: string
          currency?: string
          description: string
          id?: string
          image_path?: string | null
          price: number
          product_name: string
          product_url?: string | null
          sizes?: string[]
          size_chart?: Json | null
          source?: string
          status?: string
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          audience?: string[]
          brand_application_id?: string
          brand_approved?: boolean
          category?: string
          colors?: string[]
          created_at?: string
          currency?: string
          description?: string
          id?: string
          image_path?: string | null
          price?: number
          product_name?: string
          product_url?: string | null
          sizes?: string[]
          size_chart?: Json | null
          source?: string
          status?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_products_brand_application_id_fkey"
            columns: ["brand_application_id"]
            isOneToOne: false
            referencedRelation: "brand_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_size_guides: {
        Row: {
          id: string
          brand_application_id: string
          user_id: string
          category: string
          size_chart: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_application_id: string
          user_id: string
          category: string
          size_chart: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_application_id?: string
          user_id?: string
          category?: string
          size_chart?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_size_guides_brand_application_id_fkey"
            columns: ["brand_application_id"]
            isOneToOne: false
            referencedRelation: "brand_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_shipping_profiles: {
        Row: {
          brand_application_id: string
          gstin: string | null
          origin_pin_code: string
          parcel_height_cm: number
          parcel_length_cm: number
          parcel_weight_grams: number
          parcel_width_cm: number
          pickup_address: string
          pickup_contact_name: string
          pickup_phone: string
          processing_days_max: number
          processing_days_min: number
          return_address: string | null
          shipping_note: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_application_id: string
          gstin?: string | null
          origin_pin_code: string
          parcel_height_cm?: number
          parcel_length_cm?: number
          parcel_weight_grams?: number
          parcel_width_cm?: number
          pickup_address?: string
          pickup_contact_name?: string
          pickup_phone?: string
          processing_days_max?: number
          processing_days_min?: number
          return_address?: string | null
          shipping_note?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_application_id?: string
          gstin?: string | null
          origin_pin_code?: string
          parcel_height_cm?: number
          parcel_length_cm?: number
          parcel_weight_grams?: number
          parcel_width_cm?: number
          pickup_address?: string
          pickup_contact_name?: string
          pickup_phone?: string
          processing_days_max?: number
          processing_days_min?: number
          return_address?: string | null
          shipping_note?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_shipping_profiles_brand_application_id_fkey"
            columns: ["brand_application_id"]
            isOneToOne: true
            referencedRelation: "brand_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          city: string
          created_at: string
          id: string
          is_default: boolean
          label: string
          landmark: string | null
          line1: string
          line2: string | null
          pin_code: string
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          landmark?: string | null
          line1: string
          line2?: string | null
          pin_code: string
          state: string
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          landmark?: string | null
          line1?: string
          line2?: string | null
          pin_code?: string
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_wishlist_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      dispatch_evidence: {
        Row: {
          ai_report: Json | null
          brand_user_id: string
          created_at: string
          id: string
          order_id: string
          packing_note: string
          photos: Json
          status: string
          updated_at: string
          video_path: string
        }
        Insert: {
          ai_report?: Json | null
          brand_user_id: string
          created_at?: string
          id?: string
          order_id: string
          packing_note?: string
          photos?: Json
          status?: string
          updated_at?: string
          video_path?: string
        }
        Update: {
          ai_report?: Json | null
          brand_user_id?: string
          created_at?: string
          id?: string
          order_id?: string
          packing_note?: string
          photos?: Json
          status?: string
          updated_at?: string
          video_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_evidence_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "brand_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_returns: {
        Row: {
          brand_response: string
          brand_user_id: string
          commission_amount: number
          commission_decision: string | null
          created_at: string
          customer_details: string
          customer_user_id: string | null
          evidence_url: string
          id: string
          order_id: string
          reason: string
          refund_amount: number
          refund_reference: string
          refund_status: string
          return_tracking_number: string
          return_tracking_provider: string
          return_tracking_url: string
          status: string
          updated_at: string
        }
        Insert: {
          brand_response?: string
          brand_user_id: string
          commission_amount?: number
          commission_decision?: string | null
          created_at?: string
          customer_details?: string
          customer_user_id?: string | null
          evidence_url?: string
          id?: string
          order_id: string
          reason: string
          refund_amount?: number
          refund_reference?: string
          refund_status?: string
          return_tracking_number?: string
          return_tracking_provider?: string
          return_tracking_url?: string
          status?: string
          updated_at?: string
        }
        Update: {
          brand_response?: string
          brand_user_id?: string
          commission_amount?: number
          commission_decision?: string | null
          created_at?: string
          customer_details?: string
          customer_user_id?: string | null
          evidence_url?: string
          id?: string
          order_id?: string
          reason?: string
          refund_amount?: number
          refund_reference?: string
          refund_status?: string
          return_tracking_number?: string
          return_tracking_provider?: string
          return_tracking_url?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "brand_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      return_evidence: {
        Row: {
          ai_report: Json | null
          created_at: string
          customer_user_id: string
          id: string
          notes: string
          order_id: string
          photos: Json
          return_id: string
          status: string
          trust_score: number
          updated_at: string
        }
        Insert: {
          ai_report?: Json | null
          created_at?: string
          customer_user_id: string
          id?: string
          notes?: string
          order_id: string
          photos?: Json
          return_id: string
          status?: string
          trust_score?: number
          updated_at?: string
        }
        Update: {
          ai_report?: Json | null
          created_at?: string
          customer_user_id?: string
          id?: string
          notes?: string
          order_id?: string
          photos?: Json
          return_id?: string
          status?: string
          trust_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_evidence_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "brand_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_evidence_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "order_returns"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_offfeed_cod_orders: {
        Args: {
          p_customer_email: string
          p_customer_name: string
          p_customer_phone: string
          p_delivery_address: Json
          p_destination_pin_code: string
          p_items: Json
        }
        Returns: {
          brand_name: string
          line_total: number
          order_id: string
          order_number: string
          product_name: string
          quantity: number
        }[]
      }
      request_offfeed_return: {
        Args: {
          p_details?: string
          p_evidence_url?: string
          p_order_id: string
          p_reason: string
        }
        Returns: string
      }
      review_offfeed_return: {
        Args: { p_decision: string; p_response?: string; p_return_id: string }
        Returns: undefined
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
    Enums: {},
  },
} as const
