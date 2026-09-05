-- ==============================================================================
-- HUZUR BOOKING PLATFORM — SEED DATA
-- Migration: Seed data for Bangladesh Administrative Hierarchy & Initial Entities
-- ==============================================================================

-- 1. Seed Bangladesh 8 Administrative Divisions
INSERT INTO public.divisions (id, name, bn_name) VALUES
    (1, 'Dhaka', 'ঢাকা'),
    (2, 'Chattogram', 'চট্টগ্রাম'),
    (3, 'Rajshahi', 'রাজশাহী'),
    (4, 'Khulna', 'খুলনা'),
    (5, 'Barishal', 'বরিশাল'),
    (6, 'Sylhet', 'সিলেট'),
    (7, 'Rangpur', 'রংপুর'),
    (8, 'Mymensingh', 'ময়মনসিংহ')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    bn_name = EXCLUDED.bn_name;

-- Reset sequence for divisions
SELECT setval(pg_get_serial_sequence('public.divisions', 'id'), (SELECT MAX(id) FROM public.divisions));

-- 2. Seed Bangladesh Districts (Key representation across all 8 divisions)
INSERT INTO public.districts (id, division_id, name, bn_name) VALUES
    -- Dhaka Division
    (1, 1, 'Dhaka', 'ঢাকা'),
    (2, 1, 'Gazipur', 'গাজীপুর'),
    (3, 1, 'Narayanganj', 'নারায়ণগঞ্জ'),
    (4, 1, 'Tangail', 'টাঙ্গাইল'),
    (5, 1, 'Faridpur', 'ফরিদপুর'),
    (6, 1, 'Narsingdi', 'নরসিংদী'),
    (7, 1, 'Manikganj', 'মানিকগঞ্জ'),
    (8, 1, 'Munshiganj', 'মুন্সীগঞ্জ'),
    -- Chattogram Division
    (9, 2, 'Chattogram', 'চট্টগ্রাম'),
    (10, 2, 'Cumilla', 'কুমিল্লা'),
    (11, 2, 'Brahmanbaria', 'ব্রাহ্মণবাড়িয়া'),
    (12, 2, 'Feni', 'ফেনী'),
    (13, 2, 'Noakhali', 'নোয়াখালী'),
    (14, 2, 'Chandpur', 'চাঁদপুর'),
    (15, 2, 'Coxs Bazar', 'কক্সবাজার'),
    -- Rajshahi Division
    (16, 3, 'Rajshahi', 'রাজশাহী'),
    (17, 3, 'Bogura', 'বগুড়া'),
    (18, 3, 'Pabna', 'পাবনা'),
    (19, 3, 'Sirajganj', 'সিরাজগঞ্জ'),
    (20, 3, 'Naogaon', 'নওগাঁ'),
    -- Khulna Division
    (21, 4, 'Khulna', 'খুলনা'),
    (22, 4, 'Jashore', 'যশোর'),
    (23, 4, 'Kushtia', 'কুষ্টিয়া'),
    (24, 4, 'Satkhira', 'সাতক্ষীরা'),
    (25, 4, 'Bagerhat', 'বাগেরহাট'),
    -- Barishal Division
    (26, 5, 'Barishal', 'বরিশাল'),
    (27, 5, 'Bhola', 'ভোলা'),
    (28, 5, 'Patuakhali', 'পটুয়াখালী'),
    (29, 5, 'Pirojpur', 'পিরোজপুর'),
    -- Sylhet Division
    (30, 6, 'Sylhet', 'সিলেট'),
    (31, 6, 'Moulvibazar', 'মৌলভীবাজার'),
    (32, 6, 'Habiganj', 'হবিগঞ্জ'),
    (33, 6, 'Sunamganj', 'সুনামগঞ্জ'),
    -- Rangpur Division
    (34, 7, 'Rangpur', 'রংপুর'),
    (35, 7, 'Dinajpur', 'দিনাজপুর'),
    (36, 7, 'Kurigram', 'কুড়িগ্রাম'),
    (37, 7, 'Gaibandha', 'গাইবান্ধা'),
    -- Mymensingh Division
    (38, 8, 'Mymensingh', 'ময়মনসিংহ'),
    (39, 8, 'Jamalpur', 'জামালপুর'),
    (40, 8, 'Netrokona', 'নেত্রকোণা'),
    (41, 8, 'Sherpur', 'শেরপুর')
ON CONFLICT (id) DO UPDATE SET
    division_id = EXCLUDED.division_id,
    name = EXCLUDED.name,
    bn_name = EXCLUDED.bn_name;

SELECT setval(pg_get_serial_sequence('public.districts', 'id'), (SELECT MAX(id) FROM public.districts));

-- 3. Seed Key Upazilas
INSERT INTO public.upazilas (id, district_id, name, bn_name) VALUES
    -- Dhaka District
    (1, 1, 'Badda', 'বাড্ডা'),
    (2, 1, 'Uttara', 'উত্তরা'),
    (3, 1, 'Mirpur', 'মিরপুর'),
    (4, 1, 'Dhanmondi', 'ধানমন্ডি'),
    (5, 1, 'Mohammadpur', 'মোহাম্মদপুর'),
    -- Cumilla District
    (6, 10, 'Laksam', 'লাকসাম'),
    (7, 10, 'Chauddagram', 'চৌদ্দগ্রাম'),
    (8, 10, 'Debidwar', 'দেবীদ্বার'),
    (9, 10, 'Burichang', 'বুড়িচং'),
    -- Bogura District
    (10, 17, 'Sherpur', 'শেরপুর'),
    (11, 17, 'Bogra Sadar', 'বগুড়া সদর'),
    (12, 17, 'Shibganj', 'শিবগঞ্জ'),
    -- Kushtia District
    (13, 23, 'Kumarkhali', 'কুমারখালী'),
    (14, 23, 'Kushtia Sadar', 'কুষ্টিয়া সদর'),
    -- Sylhet District
    (15, 30, 'Sylhet Sadar', 'সিলেট সদর'),
    (16, 30, 'Golapganj', 'গোলাপগঞ্জ'),
    (17, 30, 'Beanibazar', 'বিয়ানীবাজার'),
    -- Feni District
    (18, 12, 'Daganbhuiyan', 'দাগনভূঞা'),
    (19, 12, 'Feni Sadar', 'ফেনী সদর'),
    -- Brahmanbaria District
    (20, 11, 'Kasba', 'কসবা'),
    (21, 11, 'Brahmanbaria Sadar', 'ব্রাহ্মণবাড়িয়া সদর')
ON CONFLICT (id) DO UPDATE SET
    district_id = EXCLUDED.district_id,
    name = EXCLUDED.name,
    bn_name = EXCLUDED.bn_name;

SELECT setval(pg_get_serial_sequence('public.upazilas', 'id'), (SELECT MAX(id) FROM public.upazilas));

-- 4. Seed Huzurs (Islamic Speakers)
INSERT INTO public.huzurs (id, name, photo_url, institution, bio, specialties, phone, home_district_id, is_verified)
VALUES
    (
        'a1111111-1111-1111-1111-111111111111',
        'শায়খ আহমাদুল্লাহ',
        'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop&q=80',
        'চেয়ারম্যান, আস-সুন্নাহ ফাউন্ডেশন',
        'বিশিষ্ট ইসলামী চিন্তাবিদ, খতিব এবং সমাজসেবক। সুন্নাহভিত্তিক জীবন গঠন ও সমাজসেবামূলক কার্যক্রমে অনন্য দৃষ্টান্ত স্থাপনকারী প্রখ্যাত আলেম।',
        ARRAY['সিরাতুন্নবী (সা.)', 'সমাজ সংস্কার', 'সুন্নাহর অনুসরণ', 'পারিবারিক জীবন'],
        '+8801711000001',
        1, -- Dhaka
        true
    ),
    (
        'a2222222-2222-2222-2222-222222222222',
        'মাওলানা মিজানুর রহমান আল-আজহারী',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
        'আল-আজহার বিশ্ববিদ্যালয় গ্র্যাজুয়েট ও গবেষক',
        'আন্তর্জাতিক খ্যাতিসম্পন্ন ইসলামিক বক্তা ও গবেষক। আধুনিক তথ্য ও যুক্তি নির্ভর প্রাণবন্ত আলোচনায় তরুণ প্রজন্মকে ইসলামের প্রতি আকর্ষিত করেন।',
        ARRAY['তাফসীরুল কুরআন', 'আধুনিক চ্যালেঞ্জ ও ইসলাম', 'যুব উন্নয়ন'],
        '+8801711000002',
        1, -- Dhaka
        true
    ),
    (
        'a3333333-3333-3333-3333-333333333333',
        'মুফতি তারেক মনোয়ার',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
        'মুফাসসিরে কুরআন ও খতিব',
        'সুপরিচিত মুফাসসিরে কুরআন ও মিষ্টভাষী আলোচক। সহজ-সরল ও সুস্পষ্ট ভাষায় কুরআনের গুরুত্বপূর্ণ আয়াতের বাস্তবমুখী তাফসীর প্রদান করেন।',
        ARRAY['তাফসীরুল কুরআন', 'আখিরাতের প্রস্তুতি', 'বিদআত বর্জন'],
        '+8801711000003',
        10, -- Cumilla
        true
    ),
    (
        'a4444444-4444-4444-4444-444444444444',
        'মাওলানা আব্দুল হাই মুহাম্মদ সাইফুল্লাহ',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
        'খতিব, খতমে নবুওয়াত মারকাজ',
        'খতিব, লেখক ও গবেষক। পরিবার, সমাজ ও যুব উন্নয়নমূলক ইসলামী বয়ানের জন্য সুখ্যাত।',
        ARRAY['পারিবারিক জীবন', 'সন্তান প্রতিপালন', 'আদর্শ সমাজ'],
        '+8801711000004',
        1, -- Dhaka
        true
    ),
    (
        'a5555555-5555-5555-5555-555555555555',
        'মুফতি কাজী ইব্রাহীম',
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&auto=format&fit=crop&q=80',
        'মুহাদ্দিস ও শাইখুল হাদিস',
        'মুহাদ্দিস ও ফিকহ শাস্ত্রবিদ। ইসলাম ও সমকালীন বিজ্ঞানের সমন্বয়ে বিশ্লেষণমূলক বয়ান প্রদান করেন।',
        ARRAY['হাদিসের আলোকে জীবন', 'ফিকহি মাসআলা', 'ইসলামী অর্থনীতি'],
        '+8801711000005',
        30, -- Sylhet
        true
    ),
    (
        'a6666666-6666-6666-6666-666666666666',
        'হাফেজ মুফতি আমির হামজা',
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
        'প্রধান বক্তা ও খতিব, কুষ্টিয়া কেন্দ্রীয় জামে মসজিদ',
        'জনপ্রিয় তরুণ বক্তা। হৃদয়স্পর্শী তিলাওয়াত ও বিশুদ্ধ তাফসীরুল কুরআনের জন্য সমগ্র দেশে নন্দিত।',
        ARRAY['কুরআনের অলৌকিকতা', 'মুমিনের চরিত্র', 'মৃত্যু ও পরকাল'],
        '+8801711000006',
        23, -- Kushtia
        true
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    photo_url = EXCLUDED.photo_url,
    institution = EXCLUDED.institution,
    bio = EXCLUDED.bio,
    specialties = EXCLUDED.specialties,
    phone = EXCLUDED.phone,
    home_district_id = EXCLUDED.home_district_id,
    is_verified = EXCLUDED.is_verified;

-- 5. Seed Organizers
INSERT INTO public.organizers (id, user_id, name, phone, institution_name)
VALUES
    (
        'b1111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000001',
        'হাজী মো: রফিকুল ইসলাম',
        '+8801811000001',
        'বায়তুস সালাম জামে মসজিদ ও যুব সংঘ কমিটি, লাকসাম'
    ),
    (
        'b2222222-2222-2222-2222-222222222222',
        '00000000-0000-0000-0000-000000000002',
        'ইঞ্জিনিয়ার সাইফুল করিম',
        '+8801811000002',
        'আল-হেরা ইসলামী যুব কাফেলা, শেরপুর'
    ),
    (
        'b3333333-3333-3333-3333-333333333333',
        '00000000-0000-0000-0000-000000000003',
        'মাওলানা নুরুল হক',
        '+8801811000003',
        'দারুল উলুম মাদরাসা মাহফিল পরিচালনা কমিটি, দাগনভূঞা'
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    institution_name = EXCLUDED.institution_name;

-- 6. Seed Delegate Managers
INSERT INTO public.managers (id, huzur_id, user_id, name, phone, role)
VALUES
    (
        'd1111111-1111-1111-1111-111111111111',
        'a1111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000011',
        'মাওলানা তানভীর আহমেদ',
        '+8801799000001',
        'chief_manager'
    ),
    (
        'd2222222-2222-2222-2222-222222222222',
        'a2222222-2222-2222-2222-222222222222',
        '00000000-0000-0000-0000-000000000012',
        'হাফেজ জুবায়ের হোসেন',
        '+8801799000002',
        'schedule_coordinator'
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role;

-- 7. Seed Sample Bookings
INSERT INTO public.bookings (id, huzur_id, organizer_id, event_date, division_id, district_id, upazila_id, venue_address, event_details, status)
VALUES
    (
        'c1111111-1111-1111-1111-111111111111',
        'a1111111-1111-1111-1111-111111111111',
        'b1111111-1111-1111-1111-111111111111',
        '2026-11-15',
        2,  -- Chattogram
        10, -- Cumilla
        6,  -- Laksam
        'লাকসাম পাইলট হাই স্কুল মাঠ, লাকসাম বাজার',
        'ঐতিহাসিক লাকসাম কেন্দ্রীয় সীরাতুন্নবী সম্মেলন। প্রধান বক্তা হিসেবে রাত্রি ৯:৩০ মিনিটে বয়ান শুরু করবেন ইনশাআল্লাহ।',
        'confirmed'
    ),
    (
        'c2222222-2222-2222-2222-222222222222',
        'a2222222-2222-2222-2222-222222222222',
        'b2222222-2222-2222-2222-222222222222',
        '2026-11-20',
        3,  -- Rajshahi
        17, -- Bogura
        10, -- Sherpur
        'শেরপুর কেন্দ্রীয় ঈদগাহ ময়দান, শেরপুর',
        'বার্ষিক তাফসীরুল কুরআন মাহফিল। স্থানীয় প্রশাসনের অনুমতি ও সার্বিক নিরাপত্তা ব্যবস্থা সম্পন্ন।',
        'confirmed'
    ),
    (
        'c3333333-3333-3333-3333-333333333333',
        'a3333333-3333-3333-3333-333333333333',
        'b3333333-3333-3333-3333-333333333333',
        '2026-11-25',
        2,  -- Chattogram
        12, -- Feni
        18, -- Daganbhuiyan
        'দাগনভূঞা মাদ্রাসা প্রাঙ্গণ, দাগনভূঞা বাজার',
        'দাগনভূঞা ইসলামিয়া যুব কাফেলা মাহফিল। বাদ মাগরিব বিশেষ বয়ান ও আলোচনা।',
        'pending'
    )
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    event_details = EXCLUDED.event_details,
    venue_address = EXCLUDED.venue_address;

-- 8. Seed Availability Posts
INSERT INTO public.availability_posts (id, huzur_id, start_date, end_date, division_id, district_id, upazila_id, note)
VALUES
    (
        'e1111111-1111-1111-1111-111111111111',
        'a1111111-1111-1111-1111-111111111111',
        '2026-12-01',
        '2026-12-07',
        2,  -- Chattogram
        10, -- Cumilla
        6,  -- Laksam
        'বৃহত্তর কুমিল্লা ও নোয়াখালী অঞ্চলে মাহফিলের জন্য উন্মুক্ত সময়সূচি।'
    ),
    (
        'e2222222-2222-2222-2222-222222222222',
        'a2222222-2222-2222-2222-222222222222',
        '2026-12-10',
        '2026-12-15',
        3,  -- Rajshahi
        17, -- Bogura
        10, -- Sherpur
        'উত্তরবঙ্গ (বগুড়া, সিরাজগঞ্জ, রংপুর) সফরের সম্ভাব্য সময়সূচি।'
    )
ON CONFLICT (id) DO UPDATE SET
    note = EXCLUDED.note;

-- 9. Seed Notifications
INSERT INTO public.notifications (id, user_id, type, message, related_booking_id, is_read)
VALUES
    (
        'f1111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000001',
        'booking_confirmed',
        'আপনার প্রস্তাবিত লাকসাম কেন্দ্রীয় মাহফিলের বুকিং আগামী ১৫ নভেম্বর ২০২৬ তারিখের জন্য নিশ্চিত হয়েছে।',
        'c1111111-1111-1111-1111-111111111111',
        false
    ),
    (
        'f2222222-2222-2222-2222-222222222222',
        '00000000-0000-0000-0000-000000000003',
        'booking_submitted',
        'দাগনভূঞা মাহফিলের বুকিং আবেদনটি মুফতি তারেক মনোয়ার সাহেবের পর্যালোচনার জন্য জমা হয়েছে।',
        'c3333333-3333-3333-3333-333333333333',
        false
    )
ON CONFLICT (id) DO NOTHING;
