import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Division, District, Upazila } from '@/types/database';
import { isRealSupabaseConfigured } from '@/lib/auth';

export const FALLBACK_DIVISIONS: Division[] = [
  { id: 1, name: 'Dhaka', bn_name: 'ঢাকা', name_en: 'Dhaka', name_bn: 'ঢাকা' },
  { id: 2, name: 'Chattogram', bn_name: 'চট্টগ্রাম', name_en: 'Chattogram', name_bn: 'চট্টগ্রাম' },
  { id: 3, name: 'Rajshahi', bn_name: 'রাজশাহী', name_en: 'Rajshahi', name_bn: 'রাজশাহী' },
  { id: 4, name: 'Khulna', bn_name: 'খুলনা', name_en: 'Khulna', name_bn: 'খুলনা' },
  { id: 5, name: 'Barishal', bn_name: 'বরিশাল', name_en: 'Barishal', name_bn: 'বরিশাল' },
  { id: 6, name: 'Sylhet', bn_name: 'সিলেট', name_en: 'Sylhet', name_bn: 'সিলেট' },
  { id: 7, name: 'Rangpur', bn_name: 'রংপুর', name_en: 'Rangpur', name_bn: 'রংপুর' },
  { id: 8, name: 'Mymensingh', bn_name: 'ময়মনসিংহ', name_en: 'Mymensingh', name_bn: 'ময়মনসিংহ' },
];

export const FALLBACK_DISTRICTS: District[] = [
  { id: 1, division_id: 1, name: 'Dhaka', bn_name: 'ঢাকা', name_en: 'Dhaka', name_bn: 'ঢাকা' },
  { id: 2, division_id: 1, name: 'Gazipur', bn_name: 'গাজীপুর', name_en: 'Gazipur', name_bn: 'গাজীপুর' },
  { id: 3, division_id: 1, name: 'Narayanganj', bn_name: 'নারায়ণগঞ্জ', name_en: 'Narayanganj', name_bn: 'নারায়ণগঞ্জ' },
  { id: 4, division_id: 1, name: 'Tangail', bn_name: 'টাঙ্গাইল', name_en: 'Tangail', name_bn: 'টাঙ্গাইল' },
  { id: 9, division_id: 2, name: 'Chattogram', bn_name: 'চট্টগ্রাম', name_en: 'Chattogram', name_bn: 'চট্টগ্রাম' },
  { id: 10, division_id: 2, name: 'Cumilla', bn_name: 'কুমিল্লা', name_en: 'Cumilla', name_bn: 'কুমিল্লা' },
  { id: 11, division_id: 2, name: 'Brahmanbaria', bn_name: 'ব্রাহ্মণবাড়িয়া', name_en: 'Brahmanbaria', name_bn: 'ব্রাহ্মণবাড়িয়া' },
  { id: 12, division_id: 2, name: 'Feni', bn_name: 'ফেনী', name_en: 'Feni', name_bn: 'ফেনী' },
  { id: 16, division_id: 3, name: 'Rajshahi', bn_name: 'রাজশাহী', name_en: 'Rajshahi', name_bn: 'রাজশাহী' },
  { id: 17, division_id: 3, name: 'Bogura', bn_name: 'বগুড়া', name_en: 'Bogura', name_bn: 'বগুড়া' },
  { id: 21, division_id: 4, name: 'Khulna', bn_name: 'খুলনা', name_en: 'Khulna', name_bn: 'খুলনা' },
  { id: 23, division_id: 4, name: 'Kushtia', bn_name: 'কুষ্টিয়া', name_en: 'Kushtia', name_bn: 'কুষ্টিয়া' },
  { id: 26, division_id: 5, name: 'Barishal', bn_name: 'বরিশাল', name_en: 'Barishal', name_bn: 'বরিশাল' },
  { id: 30, division_id: 6, name: 'Sylhet', bn_name: 'সিলেট', name_en: 'Sylhet', name_bn: 'সিলেট' },
  { id: 34, division_id: 7, name: 'Rangpur', bn_name: 'রংপুর', name_en: 'Rangpur', name_bn: 'রংপুর' },
  { id: 38, division_id: 8, name: 'Mymensingh', bn_name: 'ময়মনসিংহ', name_en: 'Mymensingh', name_bn: 'ময়মনসিংহ' },
];

export const FALLBACK_UPAZILAS: Upazila[] = [
  { id: 1, district_id: 1, name: 'Badda', bn_name: 'বাড্ডা', name_en: 'Badda', name_bn: 'বাড্ডা' },
  { id: 2, district_id: 1, name: 'Uttara', bn_name: 'উত্তরা', name_en: 'Uttara', name_bn: 'উত্তরা' },
  { id: 3, district_id: 1, name: 'Mirpur', bn_name: 'মিরপুর', name_en: 'Mirpur', name_bn: 'মিরপুর' },
  { id: 4, district_id: 1, name: 'Dhanmondi', bn_name: 'ধানমন্ডি', name_en: 'Dhanmondi', name_bn: 'ধানমন্ডি' },
  { id: 6, district_id: 10, name: 'Laksam', bn_name: 'লাকসাম', name_en: 'Laksam', name_bn: 'লাকসাম' },
  { id: 7, district_id: 10, name: 'Chauddagram', bn_name: 'চৌদ্দগ্রাম', name_en: 'Chauddagram', name_bn: 'চৌদ্দগ্রাম' },
  { id: 10, district_id: 17, name: 'Sherpur', bn_name: 'শেরপুর', name_en: 'Sherpur', name_bn: 'শেরপুর' },
  { id: 11, district_id: 17, name: 'Bogra Sadar', bn_name: 'বগুড়া সদর', name_en: 'Bogra Sadar', name_bn: 'বগুড়া সদর' },
];

export async function fetchDivisions(client: SupabaseClient<Database>): Promise<Division[]> {
  if (isRealSupabaseConfigured()) {
    const { data, error } = await client
      .from('divisions')
      .select('*')
      .order('id', { ascending: true });

    if (!error && data && data.length > 0) {
      return data;
    }
  }
  return FALLBACK_DIVISIONS;
}

export async function fetchDistricts(
  client: SupabaseClient<Database>,
  divisionId?: number
): Promise<District[]> {
  if (isRealSupabaseConfigured()) {
    let query = client.from('districts').select('*').order('name', { ascending: true });
    if (divisionId) {
      query = query.eq('division_id', divisionId);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data;
    }
  }

  let districts = [...FALLBACK_DISTRICTS];
  if (divisionId) {
    districts = districts.filter((d) => d.division_id === Number(divisionId));
  }
  return districts;
}

export async function fetchUpazilas(
  client: SupabaseClient<Database>,
  districtId?: number
): Promise<Upazila[]> {
  if (isRealSupabaseConfigured()) {
    let query = client.from('upazilas').select('*').order('name', { ascending: true });
    if (districtId) {
      query = query.eq('district_id', districtId);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data;
    }
  }

  let upazilas = [...FALLBACK_UPAZILAS];
  if (districtId) {
    upazilas = upazilas.filter((u) => u.district_id === Number(districtId));
  }
  return upazilas;
}
