// Supabase Database Types
// 이 파일은 `npx supabase gen types typescript` 명령으로 자동 생성할 수 있습니다.

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
      admin_users: {
        Row: {
          id: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      challenges: {
        Row: {
          id: string;
          short_id: string | null;
          platform: string;
          title: string;
          option: string | null;
          original_price: number;
          payback_rate: number;
          payback_amount: number;
          final_price: number;
          product_image: string | null;
          product_link: string | null;
          detail_images: Json;
          status: "draft" | "published" | "deleted";
          created_by: string | null;
          created_at: string;
          updated_at: string;
          purchase_deadline: string | null;
          review_deadline: string | null;
        };
        Insert: {
          id?: string;
          short_id?: string | null;
          platform: string;
          title: string;
          option?: string | null;
          original_price?: number;
          payback_rate?: number;
          payback_amount?: number;
          final_price?: number;
          product_image?: string | null;
          product_link?: string | null;
          detail_images?: Json;
          status?: "draft" | "published" | "deleted";
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          purchase_deadline?: string | null;
          review_deadline?: string | null;
        };
        Update: {
          id?: string;
          short_id?: string | null;
          platform?: string;
          title?: string;
          option?: string | null;
          original_price?: number;
          payback_rate?: number;
          payback_amount?: number;
          final_price?: number;
          product_image?: string | null;
          product_link?: string | null;
          detail_images?: Json;
          status?: "draft" | "published" | "deleted";
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          purchase_deadline?: string | null;
          review_deadline?: string | null;
        };
        Relationships: [];
      };
      mission_steps: {
        Row: {
          id: string;
          challenge_id: string | null;
          step_order: number;
          title: string;
          description: string | null;
          example_images: Json;
          deadline: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          challenge_id?: string | null;
          step_order: number;
          title: string;
          description?: string | null;
          example_images?: Json;
          deadline?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string | null;
          step_order?: number;
          title?: string;
          description?: string | null;
          example_images?: Json;
          deadline?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mission_steps_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "challenges";
            referencedColumns: ["id"];
          }
        ];
      };
      participations: {
        Row: {
          id: string;
          challenge_id: string | null;
          qanda_user_id: string;
          phone_number: string | null;
          tester_email: string | null;
          status: "pending" | "approved" | "rejected";
          reviewed_at: string | null;
          reviewed_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          challenge_id?: string | null;
          qanda_user_id: string;
          phone_number?: string | null;
          tester_email?: string | null;
          status?: "pending" | "approved" | "rejected";
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string | null;
          qanda_user_id?: string;
          phone_number?: string | null;
          tester_email?: string | null;
          status?: "pending" | "approved" | "rejected";
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "participations_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "challenges";
            referencedColumns: ["id"];
          }
        ];
      };
      participation_images: {
        Row: {
          id: string;
          participation_id: string | null;
          step_order: number;
          image_url: string;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          participation_id?: string | null;
          step_order: number;
          image_url: string;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          participation_id?: string | null;
          step_order?: number;
          image_url?: string;
          uploaded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "participation_images_participation_id_fkey";
            columns: ["participation_id"];
            isOneToOne: false;
            referencedRelation: "participations";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
