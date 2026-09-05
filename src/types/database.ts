// ==============================================================================
// HUZUR BOOKING PLATFORM — SUPABASE GENERATED DATABASE TYPES
// Target: /types/database.ts & /src/types/database.ts
// Format: Exact Supabase TypeScript definitions output
// ==============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BookingStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';

export interface Database {
  public: {
    Tables: {
      divisions: {
        Row: {
          id: number;
          name: string;
          bn_name: string;
          name_en: string;
          name_bn: string;
        };
        Insert: {
          id?: number;
          name: string;
          bn_name: string;
          name_en?: string;
          name_bn?: string;
        };
        Update: {
          id?: number;
          name?: string;
          bn_name?: string;
          name_en?: string;
          name_bn?: string;
        };
        Relationships: [];
      };
      districts: {
        Row: {
          id: number;
          division_id: number;
          name: string;
          bn_name: string;
          name_en: string;
          name_bn: string;
        };
        Insert: {
          id?: number;
          division_id: number;
          name: string;
          bn_name: string;
          name_en?: string;
          name_bn?: string;
        };
        Update: {
          id?: number;
          division_id?: number;
          name?: string;
          bn_name?: string;
          name_en?: string;
          name_bn?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'districts_division_id_fkey';
            columns: ['division_id'];
            isOneToOne: false;
            referencedRelation: 'divisions';
            referencedColumns: ['id'];
          }
        ];
      };
      upazilas: {
        Row: {
          id: number;
          district_id: number;
          name: string;
          bn_name: string;
          name_en: string;
          name_bn: string;
        };
        Insert: {
          id?: number;
          district_id: number;
          name: string;
          bn_name: string;
          name_en?: string;
          name_bn?: string;
        };
        Update: {
          id?: number;
          district_id?: number;
          name?: string;
          bn_name?: string;
          name_en?: string;
          name_bn?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'upazilas_district_id_fkey';
            columns: ['district_id'];
            isOneToOne: false;
            referencedRelation: 'districts';
            referencedColumns: ['id'];
          }
        ];
      };
      huzurs: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          photo_url: string | null;
          institution: string | null;
          bio: string | null;
          specialties: string[];
          phone: string | null;
          home_district_id: number | null;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          photo_url?: string | null;
          institution?: string | null;
          bio?: string | null;
          specialties?: string[];
          phone?: string | null;
          home_district_id?: number | null;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          photo_url?: string | null;
          institution?: string | null;
          bio?: string | null;
          specialties?: string[];
          phone?: string | null;
          home_district_id?: number | null;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'huzurs_home_district_id_fkey';
            columns: ['home_district_id'];
            isOneToOne: false;
            referencedRelation: 'districts';
            referencedColumns: ['id'];
          }
        ];
      };
      managers: {
        Row: {
          id: string;
          huzur_id: string;
          user_id: string;
          name: string;
          phone: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          huzur_id: string;
          user_id: string;
          name: string;
          phone: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          huzur_id?: string;
          user_id?: string;
          name?: string;
          phone?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'managers_huzur_id_fkey';
            columns: ['huzur_id'];
            isOneToOne: false;
            referencedRelation: 'huzurs';
            referencedColumns: ['id'];
          }
        ];
      };
      manager_invites: {
        Row: {
          id: string;
          huzur_id: string;
          invite_code: string;
          phone: string | null;
          manager_name: string | null;
          status: 'pending' | 'accepted' | 'expired' | 'revoked';
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          huzur_id: string;
          invite_code: string;
          phone?: string | null;
          manager_name?: string | null;
          status?: 'pending' | 'accepted' | 'expired' | 'revoked';
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          huzur_id?: string;
          invite_code?: string;
          phone?: string | null;
          manager_name?: string | null;
          status?: 'pending' | 'accepted' | 'expired' | 'revoked';
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'manager_invites_huzur_id_fkey';
            columns: ['huzur_id'];
            isOneToOne: false;
            referencedRelation: 'huzurs';
            referencedColumns: ['id'];
          }
        ];
      };
      organizers: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone: string;
          institution_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          phone: string;
          institution_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          phone?: string;
          institution_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          huzur_id: string;
          organizer_id: string;
          event_date: string;
          division_id: number | null;
          district_id: number | null;
          upazila_id: number | null;
          venue_address: string;
          event_details: string | null;
          status: BookingStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          huzur_id: string;
          organizer_id: string;
          event_date: string;
          division_id?: number | null;
          district_id?: number | null;
          upazila_id?: number | null;
          venue_address: string;
          event_details?: string | null;
          status?: BookingStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          huzur_id?: string;
          organizer_id?: string;
          event_date?: string;
          division_id?: number | null;
          district_id?: number | null;
          upazila_id?: number | null;
          venue_address?: string;
          event_details?: string | null;
          status?: BookingStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_huzur_id_fkey';
            columns: ['huzur_id'];
            isOneToOne: false;
            referencedRelation: 'huzurs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_organizer_id_fkey';
            columns: ['organizer_id'];
            isOneToOne: false;
            referencedRelation: 'organizers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_division_id_fkey';
            columns: ['division_id'];
            isOneToOne: false;
            referencedRelation: 'divisions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_district_id_fkey';
            columns: ['district_id'];
            isOneToOne: false;
            referencedRelation: 'districts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_upazila_id_fkey';
            columns: ['upazila_id'];
            isOneToOne: false;
            referencedRelation: 'upazilas';
            referencedColumns: ['id'];
          }
        ];
      };
      availability_posts: {
        Row: {
          id: string;
          huzur_id: string;
          start_date: string;
          end_date: string;
          division_id: number | null;
          district_id: number | null;
          upazila_id: number | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          huzur_id: string;
          start_date: string;
          end_date: string;
          division_id?: number | null;
          district_id?: number | null;
          upazila_id?: number | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          huzur_id?: string;
          start_date?: string;
          end_date?: string;
          division_id?: number | null;
          district_id?: number | null;
          upazila_id?: number | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'availability_posts_huzur_id_fkey';
            columns: ['huzur_id'];
            isOneToOne: false;
            referencedRelation: 'huzurs';
            referencedColumns: ['id'];
          }
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          message: string;
          is_read: boolean;
          related_booking_id: string | null;
          scheduled_at: string | null;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          message: string;
          is_read?: boolean;
          related_booking_id?: string | null;
          scheduled_at?: string | null;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          message?: string;
          is_read?: boolean;
          related_booking_id?: string | null;
          scheduled_at?: string | null;
          sent_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_related_booking_id_fkey';
            columns: ['related_booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          }
        ];
      };
      specialties: {
        Row: {
          id: number;
          slug: string;
          name_en: string;
          name_bn: string;
          description_en: string | null;
          description_bn: string | null;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          slug: string;
          name_en: string;
          name_bn: string;
          description_en?: string | null;
          description_bn?: string | null;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          slug?: string;
          name_en?: string;
          name_bn?: string;
          description_en?: string | null;
          description_bn?: string | null;
          display_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      public_confirmed_schedules: {
        Row: {
          booking_id: string;
          huzur_id: string;
          event_date: string;
          division_id: number | null;
          district_id: number | null;
          upazila_id: number | null;
          status: string;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: {
      booking_status: BookingStatus;
    };
  };
}

// Convenience Type Helpers for clean type exports
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

export type Division = Tables<'divisions'>;
export type District = Tables<'districts'>;
export type Upazila = Tables<'upazilas'>;
export type Huzur = Tables<'huzurs'>;
export type Manager = Tables<'managers'>;
export type Organizer = Tables<'organizers'>;
export type Booking = Tables<'bookings'>;
export type AvailabilityPost = Tables<'availability_posts'>;
export type Specialty = Tables<'specialties'>;

export function getLocalizedName(
  entity: { name_en?: string; name_bn?: string; name?: string; bn_name?: string } | null | undefined,
  locale: string = 'bn'
): string {
  if (!entity) return '';
  if (locale === 'en') {
    return entity.name_en || entity.name || entity.name_bn || entity.bn_name || '';
  }
  return entity.name_bn || entity.bn_name || entity.name_en || entity.name || '';
}

export interface AppNotification {
  id: string;
  user_id: string;
  type?: string;
  message?: string;
  is_read: boolean;
  related_booking_id?: string | null;
  booking_id?: string | null;
  scheduled_at?: string | null;
  sent_at?: string | null;
  created_at: string;
  title?: string;
  message_bn?: string;
}

export type Notification = AppNotification;

export interface HuzurProfile {
  id: string;
  title: string;
  designation?: string | null;
  madrasa_or_institution?: string | null;
  verified: boolean;
  topics: string[];
  base_hadya_range?: string | null;
  minimum_hadya?: number | null;
  is_available: boolean;
  short_bio_bn?: string | null;
  featured_order: number;
  created_at: string;
  updated_at: string;
}

export interface HuzurWithProfile {
  id: string;
  phone: string;
  role: 'huzur' | 'organizer' | 'admin';
  full_name: string;
  division: string;
  district: string;
  upazila_or_area?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  created_at: string;
  updated_at: string;
  huzur_profile: HuzurProfile;
}

export interface AvailabilityBlock {
  id: string;
  huzur_id: string;
  blocked_date: string;
  reason?: string | null;
  created_at: string;
}

// Joined/Aggregated Types for UI & Queries
export interface HuzurWithDetails extends Huzur {
  home_district?: District | null;
  availability_posts?: AvailabilityPost[];
}

export interface BookingWithDetails extends Omit<Booking, 'district_id' | 'division_id' | 'upazila_id' | 'event_details'> {
  division_id?: number | null;
  district_id?: number | null;
  upazila_id?: number | null;
  event_details?: string | null;
  district?: District | string | null;
  huzur?: Huzur | HuzurWithProfile | any | null;
  organizer?: Organizer | any | null;
  division?: Division | string | null;
  upazila?: Upazila | string | null;
  session_slot?: SessionSlot;
  mahfil_name?: string;
  contact_person_name?: string;
  contact_phone?: string;
  hadya_offered?: number | null;
  notes?: string | null;
  rejection_reason?: string | null;
}


// Bengali UI Display Mappings & Helpers
export type SessionSlot = 
  | 'after_asr'
  | 'after_maghrib'
  | 'after_esha'
  | 'all_night'
  | 'daytime_special';

export const SESSION_SLOT_LABELS_BN: Record<SessionSlot, string> = {
  after_asr: 'বাদ আসর',
  after_maghrib: 'বাদ মাগরিব',
  after_esha: 'বাদ এশা (প্রধান বক্তা)',
  all_night: 'শেষ রাত / সারা রাত',
  daytime_special: 'বিশেষ অধিবেশন / জুমআ',
};

export const BOOKING_STATUS_LABELS_BN: Record<BookingStatus, { label: string; badgeClass: string }> = {
  pending: {
    label: 'অপেক্ষমাণ',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
  },
  confirmed: {
    label: 'নিশ্চিতকৃত',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
  },
  rejected: {
    label: 'প্রত্যাখ্যাত',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800/50',
  },
  cancelled: {
    label: 'বাতিলকৃত',
    badgeClass: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
  },
  completed: {
    label: 'সম্পন্ন',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
  },
};

export const BANGLADESH_DIVISIONS_BN = [
  'ঢাকা',
  'চট্টগ্রাম',
  'রাজশাহী',
  'খুলনা',
  'বরিশাল',
  'সিলেট',
  'রংপুর',
  'ময়মনসিংহ',
] as const;

export const POPULAR_DISTRICTS_BN = [
  'ঢাকা',
  'কুমিল্লা',
  'চট্টগ্রাম',
  'বগুড়া',
  'সিলেট',
  'ব্রাহ্মণবাড়িয়া',
  'ফেনী',
  'কুষ্টিয়া',
  'ময়মনসিংহ',
  'নোয়াখালী',
  'গাজীপুর',
  'নারায়ণগঞ্জ',
] as const;

export const POPULAR_TOPICS_BN = [
  'সিরাতুন্নবী (সা.)',
  'তাফসীরুল কুরআন',
  'পারিবারিক জীবন ও আদর্শ পরিবার',
  'যুব উন্নয়ন ও চরিত্র গঠন',
  'সমাজ সংস্কার ও বিদআত বর্জন',
  'মৃত্যু ও আখিরাতের প্রস্তুতি',
  'সুন্নাহর আলো ও সমকালীন সমাজ',
] as const;

