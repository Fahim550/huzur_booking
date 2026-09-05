import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { isRealSupabaseConfigured } from '@/lib/auth';
import type { Database } from '@/types/database';

export interface SearchHuzursParams {
  divisionId?: number;
  districtId?: number;
  upazilaId?: number;
  startDate?: string;
  endDate?: string;
  specialty?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface AvailabilityPostItem {
  id: string;
  huzur_id: string;
  start_date: string;
  end_date: string;
  division_id: number | null;
  district_id: number | null;
  upazila_id: number | null;
  note: string | null;
}

export interface SearchHuzurResult {
  id: string;
  name: string;
  photo_url: string | null;
  institution: string | null;
  bio: string | null;
  specialties: string[];
  phone: string | null;
  home_district_id: number | null;
  home_district: {
    id: number;
    name: string;
    bn_name: string;
    division_id: number;
  } | null;
  is_verified: boolean;
  has_availability_post: boolean;
  matching_availability_post?: AvailabilityPostItem | null;
  all_availability_posts?: AvailabilityPostItem[];
  created_at?: string;
  updated_at?: string;
}

export interface SearchHuzursResponse {
  huzurs: SearchHuzurResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// In-memory fallback availability posts for mock/demo test run
export const IN_MEMORY_AVAILABILITY_POSTS: AvailabilityPostItem[] = [
  {
    id: 'e1111111-1111-1111-1111-111111111111',
    huzur_id: 'a1111111-1111-1111-1111-111111111111',
    start_date: '2026-12-01',
    end_date: '2026-12-07',
    division_id: 2, // Chattogram
    district_id: 10, // Cumilla
    upazila_id: 6, // Laksam
    note: 'বৃহত্তর কুমিল্লা ও নোয়াখালী অঞ্চলে মাহফিলের জন্য উন্মুক্ত সময়সূচি।',
  },
  {
    id: 'e2222222-2222-2222-2222-222222222222',
    huzur_id: 'a2222222-2222-2222-2222-222222222222',
    start_date: '2026-12-10',
    end_date: '2026-12-15',
    division_id: 3, // Rajshahi
    district_id: 17, // Bogura
    upazila_id: 10, // Sherpur
    note: 'উত্তরবঙ্গ (বগুড়া, সিরাজগঞ্জ, রংপুর) সফরের সম্ভাব্য সময়সূচি।',
  },
];

// Fallback seed huzurs in Supabase schema shape
export const FALLBACK_SEARCH_HUZURS: SearchHuzurResult[] = [
  {
    id: 'a1111111-1111-1111-1111-111111111111',
    name: 'শায়খ আহমাদুল্লাহ',
    photo_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop&q=80',
    institution: 'চেয়ারম্যান, আস-সুন্নাহ ফাউন্ডেশন',
    bio: 'বিশিষ্ট ইসলামী চিন্তাবিদ, খতিব এবং সমাজসেবক। সুন্নাহভিত্তিক জীবন গঠন ও সমাজসেবামূলক কার্যক্রমে অনন্য দৃষ্টান্ত স্থাপনকারী প্রখ্যাত আলেম।',
    specialties: ['সিরাতুন্নবী (সা.)', 'সমাজ সংস্কার', 'সুন্নাহর অনুসরণ', 'পারিবারিক জীবন'],
    phone: '+8801711000001',
    home_district_id: 1,
    home_district: { id: 1, name: 'Dhaka', bn_name: 'ঢাকা', division_id: 1 },
    is_verified: true,
    has_availability_post: false,
  },
  {
    id: 'a2222222-2222-2222-2222-222222222222',
    name: 'মাওলানা মিজানুর রহমান আল-আজহারী',
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    institution: 'আল-আজহার বিশ্ববিদ্যালয় গ্র্যাজুয়েট ও গবেষক',
    bio: 'আন্তর্জাতিক খ্যাতিসম্পন্ন ইসলামিক বক্তা ও গবেষক। আধুনিক তথ্য ও যুক্তি নির্ভর প্রাণবন্ত আলোচনায় তরুণ প্রজন্মকে ইসলামের প্রতি আকর্ষিত করেন।',
    specialties: ['তাফসীরুল কুরআন', 'আধুনিক চ্যালেঞ্জ ও ইসলাম', 'যুব উন্নয়ন'],
    phone: '+8801711000002',
    home_district_id: 1,
    home_district: { id: 1, name: 'Dhaka', bn_name: 'ঢাকা', division_id: 1 },
    is_verified: true,
    has_availability_post: false,
  },
  {
    id: 'a3333333-3333-3333-3333-333333333333',
    name: 'মুফতি তারেক মনোয়ার',
    photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    institution: 'মুফাসসিরে কুরআন ও খতিব',
    bio: 'সুপরিচিত মুফাসসিরে কুরআন ও মিষ্টভাষী আলোচক। সহজ-সরল ও সুস্পষ্ট ভাষায় কুরআনের গুরুত্বপূর্ণ আয়াতের বাস্তবমুখী তাফসীর প্রদান করেন।',
    specialties: ['তাফসীরুল কুরআন', 'আখিরাতের প্রস্তুতি', 'বিদআত বর্জন'],
    phone: '+8801711000003',
    home_district_id: 10,
    home_district: { id: 10, name: 'Cumilla', bn_name: 'কুমিল্লা', division_id: 2 },
    is_verified: true,
    has_availability_post: false,
  },
  {
    id: 'a4444444-4444-4444-4444-444444444444',
    name: 'মাওলানা আব্দুল হাই মুহাম্মদ সাইফুল্লাহ',
    photo_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
    institution: 'খতিব, খতমে নবুওয়াত মারকাজ',
    bio: 'খতিব, লেখক ও গবেষক। পরিবার, সমাজ ও যুব উন্নয়নমূলক ইসলামী বয়ানের জন্য সুখ্যাত।',
    specialties: ['পারিবারিক জীবন', 'সন্তান প্রতিপালন', 'আদর্শ সমাজ'],
    phone: '+8801711000004',
    home_district_id: 1,
    home_district: { id: 1, name: 'Dhaka', bn_name: 'ঢাকা', division_id: 1 },
    is_verified: true,
    has_availability_post: false,
  },
  {
    id: 'a5555555-5555-5555-5555-555555555555',
    name: 'মুফতি কাজী ইব্রাহীম',
    photo_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
    institution: 'মুহাদ্দিস ও শাইখুল হাদিস',
    bio: 'মুহাদ্দিস ও ফিকহ শাস্ত্রবিদ। ইসলাম ও সমকালীন বিজ্ঞানের সমন্বয়ে বিশ্লেষণমূলক বয়ান প্রদান করেন।',
    specialties: ['হাদিসের আলোকে জীবন', 'ফিকহি মাসআলা', 'ইসলামী অর্থনীতি'],
    phone: '+8801711000005',
    home_district_id: 30,
    home_district: { id: 30, name: 'Sylhet', bn_name: 'সিলেট', division_id: 6 },
    is_verified: true,
    has_availability_post: false,
  },
  {
    id: 'a6666666-6666-6666-6666-666666666666',
    name: 'হাফেজ মুফতি আমির হামজা',
    photo_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
    institution: 'প্রধান বক্তা ও খতিব, কুষ্টিয়া কেন্দ্রীয় জামে মসজিদ',
    bio: 'জনপ্রিয় তরুণ বক্তা। হৃদয়স্পর্শী তিলাওয়াত ও বিশুদ্ধ তাফসীরুল কুরআনের জন্য সমগ্র দেশে নন্দিত।',
    specialties: ['কুরআনের অলৌকিকতা', 'মুমিনের চরিত্র', 'মৃত্যু ও পরকাল'],
    phone: '+8801711000006',
    home_district_id: 23,
    home_district: { id: 23, name: 'Kushtia', bn_name: 'কুষ্টিয়া', division_id: 4 },
    is_verified: true,
    has_availability_post: false,
  },
];

/**
 * Checks if an availability post matches geographic and date criteria
 */
export function doesPostMatchCriteria(
  post: AvailabilityPostItem,
  params: SearchHuzursParams
): boolean {
  const { divisionId, districtId, upazilaId, startDate, endDate } = params;

  // Geographic match
  if (upazilaId && post.upazila_id && post.upazila_id !== upazilaId) {
    return false;
  }
  if (districtId && post.district_id && post.district_id !== districtId) {
    return false;
  }
  if (divisionId && post.division_id && post.division_id !== divisionId) {
    return false;
  }

  // Date range overlap check: (StartA <= EndB) and (EndA >= StartB)
  if (startDate && endDate) {
    if (post.start_date > endDate || post.end_date < startDate) {
      return false;
    }
  } else if (startDate) {
    if (post.end_date < startDate) {
      return false;
    }
  } else if (endDate) {
    if (post.start_date > endDate) {
      return false;
    }
  }

  return true;
}

/**
 * Primary search query function called directly by Server Components & API handlers
 */
export async function searchHuzurs(
  params: SearchHuzursParams = {},
  client?: SupabaseClient<Database>
): Promise<SearchHuzursResponse> {
  const {
    divisionId,
    districtId,
    specialty,
    q,
    page = 1,
    limit = 12,
  } = params;

  const offset = (page - 1) * limit;

  // Use real Supabase if credentials exist
  if (isRealSupabaseConfigured()) {
    try {
      const supabase = client || (await createServerSupabase());

      let query = supabase
        .from('huzurs')
        .select('*, home_district:districts(*)', { count: 'exact' })
        .eq('is_verified', true);

      if (districtId) {
        query = query.eq('home_district_id', districtId);
      }

      if (specialty) {
        query = query.contains('specialties', [specialty]);
      }

      if (q && q.trim()) {
        const term = q.trim();
        query = query.or(`name.ilike.%${term}%,institution.ilike.%${term}%,bio.ilike.%${term}%`);
      }

      const { data: huzursData, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!error && huzursData) {
        type HuzurWithDistrict = Database['public']['Tables']['huzurs']['Row'] & {
          home_district: Database['public']['Tables']['districts']['Row'] | null;
        };

        const typedHuzurs = huzursData as unknown as HuzurWithDistrict[];

        // Fetch availability posts for these huzurs
        const huzurIds = typedHuzurs.map((h) => h.id);
        const { data: postsData } = await supabase
          .from('availability_posts')
          .select('*')
          .in('huzur_id', huzurIds);

        const allPosts: AvailabilityPostItem[] = (postsData as unknown as AvailabilityPostItem[]) || [];

        // Attach availability post information
        const results: SearchHuzurResult[] = typedHuzurs
          .filter((h) => {
            // If division filter is provided without district filter, ensure district belongs to division
            if (divisionId && !districtId && h.home_district) {
              return h.home_district.division_id === divisionId;
            }
            return true;
          })
          .map((h) => {
            const huzurPosts = allPosts.filter((p) => p.huzur_id === h.id);
            const matchingPost = huzurPosts.find((p) => doesPostMatchCriteria(p, params));
            const hasPost = Boolean(matchingPost || huzurPosts.length > 0);

            return {
              id: h.id,
              name: h.name,
              photo_url: h.photo_url,
              institution: h.institution,
              bio: h.bio,
              specialties: h.specialties || [],
              phone: h.phone,
              home_district_id: h.home_district_id,
              home_district: h.home_district,
              is_verified: h.is_verified,
              has_availability_post: hasPost,
              matching_availability_post: matchingPost || huzurPosts[0] || null,
              all_availability_posts: huzurPosts,
            };
          });

        const totalResults = count ?? results.length;
        return {
          huzurs: results,
          total: totalResults,
          page,
          limit,
          totalPages: Math.ceil(totalResults / limit) || 1,
        };
      }
    } catch (err) {
      console.warn('Supabase search fallback to memory:', err);
    }
  }

  // In-memory fallback (used for automated tests & preview environments)
  let filtered = [...FALLBACK_SEARCH_HUZURS];

  if (districtId) {
    filtered = filtered.filter((h) => {
      if (h.home_district_id === Number(districtId)) {
        return true;
      }
      const huzurPosts = IN_MEMORY_AVAILABILITY_POSTS.filter((p) => p.huzur_id === h.id);
      return huzurPosts.some((p) => doesPostMatchCriteria(p, params));
    });
  } else if (divisionId) {
    filtered = filtered.filter((h) => {
      if (h.home_district?.division_id === Number(divisionId)) {
        return true;
      }
      const huzurPosts = IN_MEMORY_AVAILABILITY_POSTS.filter((p) => p.huzur_id === h.id);
      return huzurPosts.some((p) => doesPostMatchCriteria(p, params));
    });
  }

  if (specialty) {
    filtered = filtered.filter((h) =>
      h.specialties.some(
        (s) => s.toLowerCase().includes(specialty.toLowerCase()) || specialty.toLowerCase().includes(s.toLowerCase())
      )
    );
  }

  if (q && q.trim()) {
    const term = q.trim().toLowerCase();
    filtered = filtered.filter(
      (h) =>
        h.name.toLowerCase().includes(term) ||
        (h.institution && h.institution.toLowerCase().includes(term)) ||
        (h.bio && h.bio.toLowerCase().includes(term)) ||
        h.specialties.some((s) => s.toLowerCase().includes(term))
    );
  }

  // Attach in-memory availability posts
  const mappedResults: SearchHuzurResult[] = filtered.map((h) => {
    const huzurPosts = IN_MEMORY_AVAILABILITY_POSTS.filter((p) => p.huzur_id === h.id);
    const matchingPost = huzurPosts.find((p) => doesPostMatchCriteria(p, params));
    const hasPost = Boolean(matchingPost || (params.startDate || params.districtId ? matchingPost : huzurPosts.length > 0));

    return {
      ...h,
      has_availability_post: hasPost,
      matching_availability_post: matchingPost || (huzurPosts.length > 0 ? huzurPosts[0] : null),
      all_availability_posts: huzurPosts,
    };
  });

  const total = mappedResults.length;
  const paginated = mappedResults.slice(offset, offset + limit);

  return {
    huzurs: paginated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}
