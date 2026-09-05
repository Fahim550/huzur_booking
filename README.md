# হুজুর বুকিং প্ল্যাটফর্ম (Huzur Booking Platform)

A production web application designed specifically for organizing Islamic Waz Mahfil speaker (Huzur) bookings across Bangladesh.

---

## 🌟 Tech Stack

- **Frontend**: Next.js 15 (App Router, TypeScript, React 19, Tailwind CSS v4)
- **Backend / Database**: Supabase (PostgreSQL, Supavisor Connection Pooling, Auth via phone/OTP, Row Level Security)
- **Client Data Layer**: TanStack Query (React Query) for client-side caching, background refetch, and optimistic UI mutations
- **Hosting Target**: Vercel (Next.js frontend & serverless API routes) + Supabase (managed Postgres)
- **Localization**: 100% Bengali (বাংলা) user interface copy; clean English code and comments.

---

## 📐 Non-Negotiable Architectural Rules

1. **Mobile-First Responsive Design**:
   - Built and tested at **375px width** first, scaling seamlessly to tablet (`768px`) and desktop (`1024px`+).
   - Minimum touch target strictly $\ge 44 \times 44\text{px}$ (`.touch-target`).
   - Fixed bottom navigation bar on mobile for the 4 primary actions:
     - **অনুসন্ধান** (`/search`)
     - **বুকিং সমূহ** (`/my-bookings`)
     - **প্রাপ্যতা** (`/availability`)
     - **প্রোফাইল** (`/profile`)
2. **Server-Side Rendering (ISR) for Public Reads**:
   - Huzur profile pages and directory search pages use Server Components with `revalidate: 3600` (ISR) — no client-side fetch waterfalls.
3. **TanStack Query for Personalized Dashboards**:
   - Personalized/dashboard views (speaker's booking requests, organizer's submissions) are routed through Route Handlers and cached via TanStack Query on the client.
4. **Database-Level Race Condition Prevention**:
   - Postgres `btree_gist` extension with an `EXCLUDE` constraint on `(huzur_id WITH =, event_date WITH =)` WHERE `status IN ('pending', 'confirmed')`. No application-level check race conditions.
5. **Connection Pooling**:
   - Supabase connection pooling (Supavisor, transaction mode on port `6543`) for all serverless/edge Next.js database operations.
6. **Backend Portability (Future Django Migration)**:
   - All booking conflict logic and notification triggers reside in PostgreSQL constraints/functions or the Next.js API layer. No proprietary Supabase UI webhooks.
7. **Pagination**:
   - All listing and search queries enforce bounded pagination.
8. **Optimistic UI & Loading Skeletons**:
   - Immediate feedback on booking actions (approve/reject/request) via TanStack Query optimistic mutations.

---

## ⚡ Scaling & Load Balancing

### 1. Supavisor Connection Pooling (Transaction Mode)
In serverless environments such as Vercel Edge and Node.js serverless functions, database connections are created ephemerally across distributed containers. Connecting directly to PostgreSQL via standard session mode (port `5432`) causes connection storms and rapidly exceeds Postgres's `max_connections` limit.

To prevent connection starvation:
- **Transaction Mode Pooler (`port 6543`)**: All Next.js Server Components, Server Actions, and Route Handlers must connect to Supabase via Supavisor in **transaction mode**:
  ```env
  DATABASE_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
  DIRECT_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
  ```
- **Connection Release**: In transaction mode, a Postgres connection is checked out from the pool only for the duration of an individual transaction/query and returned immediately, allowing tens of thousands of concurrent organizers to interact with the platform without exhausting pool limits.
- Direct connections (port `5432`) are reserved exclusively for running schema migrations via the Supabase CLI (`DIRECT_URL`).

### 2. Peak Mahfil Season Concurrency
In Bangladesh, the Waz Mahfil season peaks between **November and March**, creating massive spikes in traffic as thousands of mosque committees simultaneously seek speakers for Friday evenings and winter weekends.

- **Edge Caching with Incremental Static Regeneration (ISR)**: Public Huzur directory pages (`/`, `/search`, `/huzur/[id]`) are cached at the Vercel Edge Network with a 1-hour revalidation window (`revalidate = 3600`). Reads never touch the database during traffic bursts.
- **On-Demand Tag Revalidation**: When a Huzur confirms a booking or updates their bio, Next.js `revalidateTag()` purges only the relevant speaker's cache instantly.

### 3. Concurrency Protection at the Engine Level
Application-level "check availability then insert" checks have a classic **Time-of-Check to Time-of-Use (TOCTOU)** race condition. Two organizers booking the same speaker for the same date at the exact same millisecond could both see the date as "available".

We eliminate this by utilizing Postgres's `btree_gist` index to enforce an `EXCLUDE` constraint at the database storage engine:
```sql
ALTER TABLE bookings
ADD CONSTRAINT prevent_huzur_double_booking
EXCLUDE USING gist (
    huzur_id WITH =,
    event_date WITH =
) WHERE (status IN ('pending', 'confirmed'));
```
Even if thousands of concurrent requests arrive simultaneously, Postgres serializes the index check and guarantees that only one transaction succeeds, immediately returning SQL error code `23P01` (exclusion_violation) to subsequent requests.

### 4. Portability for Future Django Backend Migration
To ensure effortless migration to Django/Python in future phases:
- Schema definitions use standard PostgreSQL types (`UUID`, `DATE`, `TIMESTAMPTZ`, `NUMERIC`, `ENUM`).
- Business logic is encapsulated in standard SQL constraints and Next.js REST Route Handlers.
- No proprietary cloud-native dependencies or closed-source extensions are used.

---

## 🛠️ Local Development & Setup

### Prerequisites
- Node.js $\ge 20$ (tested on Node v22)
- npm $\ge 10$

### 1. Installation
```bash
npm install
```

### 2. Environment Configuration
Copy the example environment file:
```bash
cp .env.example .env.local
```
Fill in your Supabase project credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]
DATABASE_URL=postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

### 3. Database Migration & Seed
Run migrations and seed data in your Supabase SQL Editor or via CLI:
```bash
# Schema migration (includes btree_gist extension and EXCLUDE constraint)
supabase/migrations/20260905000001_init_schema.sql

# Seed data (Bengali Islamic speakers & bookings)
supabase/seed.sql
```

### 4. Running the Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. Inspect in mobile view at **375px width**.

### 5. Building for Production
```bash
npm run build
npm run start
```
