// ==============================================================================
// HUZUR BOOKING PLATFORM — DATABASE TYPES & ENUMS
// ==============================================================================

export type UserRole = 'huzur' | 'organizer' | 'admin';

export type BookingStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';

export type SessionSlot = 
  | 'after_asr'        // বাদ আসর
  | 'after_maghrib'    // বাদ মাগরিব
  | 'after_esha'       // বাদ এশা (প্রধান বক্তা / Chief Speaker)
  | 'all_night'        // শেষ রাত / সারা রাত
  | 'daytime_special'; // সকাল / জুমআ / বিশেষ অধিবেশন

export interface Profile {
  id: string;
  phone: string;
  role: UserRole;
  full_name: string;
  division: string;
  district: string;
  upazila_or_area?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HuzurProfile {
  id: string;
  title: string;                 // মাওলানা, মুফতি, শায়খ ইত্যাদি
  designation?: string | null;   // খতিব, শাইখুল হাদিস
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

export interface HuzurWithProfile extends Profile {
  huzur_profile: HuzurProfile;
}

export interface Booking {
  id: string;
  organizer_id: string;
  huzur_id: string;
  event_date: string; // YYYY-MM-DD
  session_slot: SessionSlot;
  mahfil_name: string;
  district: string;
  venue_address: string;
  contact_person_name: string;
  contact_phone: string;
  status: BookingStatus;
  hadya_offered?: number | null;
  notes?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingWithDetails extends Booking {
  organizer?: Profile;
  huzur?: HuzurWithProfile;
}

export interface AvailabilityBlock {
  id: string;
  huzur_id: string;
  blocked_date: string; // YYYY-MM-DD
  reason?: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  booking_id?: string | null;
  title: string;
  message_bn: string;
  is_read: boolean;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

// Bengali Display Mappings
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
  'সিলেট',
  'খুলনা',
  'বরিশাল',
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
