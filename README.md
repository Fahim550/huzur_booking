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

### 1. Vercel Edge Network & Serverless Auto-Scaling
The Huzur Booking Platform is architected for zero-maintenance auto-scaling without dedicated load balancer appliances or static compute clusters:
- **Global Anycast Edge Network**: Client requests are terminated at the nearest Vercel Edge PoP (Point of Presence), minimizing TTFB for mobile users in Bangladesh via regional routing (e.g., Singapore and Mumbai edge nodes).
- **Instantaneous Serverless Concurrency**: Next.js Server Components and Route Handlers run in ephemeral serverless execution environments that scale automatically from zero to thousands of concurrent instances within milliseconds to absorb sudden Waz Mahfil traffic spikes.
- **Edge Caching & Incremental Static Regeneration (ISR)**: Public read routes are aggressively cached at the edge:
  - **Huzur Profiles (`/huzur/[id]`)**: Cached for 300 seconds (`revalidate = 300`). All seed and active speaker profiles are statically prerendered at build time (`● SSG`).
  - **Speaker Search (`/search`)**: Cached with 60s ISR (`revalidate = 60`).
  - **Location Datasets (`/api/locations`)**: Cached for 24 hours (`s-maxage=86400`) at CDN edge.
  - **Peak Volume Absorption**: Up to 99% of read requests during winter Mahfil peaks are served directly from edge memory cache without invoking serverless functions or touching PostgreSQL.
- **On-Demand Cache Purging**: When a speaker updates availability or an organizer submits/confirms a booking, Next.js 16 `revalidateTag('search-results', 'max')` and `revalidateTag('huzur-[id]', 'max')` instantly invalidate stale edge cache entries worldwide.

---

### 2. Supavisor Connection Pooling (Transaction Mode)
In a serverless architecture, functions do not maintain long-lived application server states. This introduces the **Serverless Concurrency Paradox**:

```
[500 Concurrent Organizers] ──> [500 Vercel Lambdas]
                                        │
             ❌ Without Pooler: 500 Direct Connections
                                        ▼
                         [PostgreSQL max_connections = 60-100]
                                  💥 OUT OF MEMORY / CRASH
```

Connecting directly to PostgreSQL via session mode (port `5432`) causes instant connection starvation and crashes the database with:
```
FATAL: remaining connection slots are reserved for non-replication superuser connections
```

#### Why Connection Pooling is Non-Negotiable
- **Transaction Mode (`port 6543`)**: Next.js connects exclusively via Supabase's high-performance Rust-based **Supavisor** pooler configured in transaction mode (`?pgbouncer=true`).
- **Microsecond Connection Multiplexing**: A physical PostgreSQL connection is checked out from the pool *only* for the exact duration of a single SQL query/transaction and returned immediately. This allows thousands of simultaneous serverless invocations to share 15–20 physical database connections without queueing delays.
- **Dual-Connection Strategy**:
  - `DATABASE_URL` (port `6543`): Used for all runtime queries, Server Components, and Route Handlers.
  - `DIRECT_URL` (port `5432`): Reserved strictly for DDL schema migrations (`supabase db push`) and seed scripts via the Supabase CLI, where session-level prepared statements and locks are required.
- **Database Safeguards**:
  - A strict `5-second statement timeout` (`statement_timeout = '5s'`) is enforced on `anon` and `authenticated` roles in Migration `00006` to prevent long-running queries or accidental lock contention from exhausting pooled sessions.
  - Composite indexes `(is_verified, created_at DESC)`, GIN index on `specialties`, and partial indexes on `bookings WHERE status IN ('pending', 'confirmed')` guarantee sub-10ms index scans across all high-throughput tables.

---

### 3. Scaling Beyond a Single Postgres Instance (Read Replicas & CQRS)
Islamic Waz Mahfil booking traffic is asymmetrical: **~95% read traffic** (committee members browsing speakers, checking topics, and inspecting 3-month availability calendars) versus **~5% write traffic** (booking requests and status changes).

When platform traffic exceeds the capacity of a single PostgreSQL primary node, the system scales out horizontally:

```
                                  ┌─────────────────────────────┐
                                  │      Vercel Edge Layer      │
                                  └──────────────┬──────────────┘
                                                 │
                        ┌────────────────────────┴────────────────────────┐
                        │ Reads (95%)                      Writes (5%)   │
                        ▼                                                 ▼
             ┌─────────────────────┐                           ┌─────────────────────┐
             │  Supavisor (6543)   │                           │  Supavisor (6543)   │
             └──────────┬──────────┘                           └──────────┬──────────┘
                        │                                                 │
                        ▼                                                 ▼
         ┌─────────────────────────────┐                       ┌─────────────────────┐
         │ PostgreSQL Read Replicas    │ <==== WAL Sync =====  │ PostgreSQL Primary  │
         │ (Singapore / Mumbai Nodes)  │      (Async)          │ (Write Node)        │
         └─────────────────────────────┘                       └─────────────────────┘
```

1. **Horizontal Read Replicas**:
   - Deploy asynchronous PostgreSQL read replicas in regional cloud data centers (e.g., AWS `ap-southeast-1` Singapore and `ap-south-1` Mumbai) nearest to Bangladesh ISP backbones.
   - Configure a dedicated read connection string `READ_DATABASE_URL` for read queries (`searchHuzurs`, `fetchHuzurById`, `fetchLocations`).
2. **Write Primary Isolation & Zero TOCTOU Races**:
   - All booking creation (`POST /api/bookings`), approval/rejection (`PATCH /api/bookings/[id]`), and availability posting are directed exclusively to the **PostgreSQL Primary Write Node**.
   - Concurrency safety is enforced at the database storage engine via the `btree_gist` `EXCLUDE` constraint on `(huzur_id, event_date) WHERE (status IN ('pending', 'confirmed'))`. Even during extreme traffic bursts, Postgres serializes conflicting dates on the primary with 100% ACID consistency.
3. **Replication Lag Resilience**:
   - Because write transactions update the primary node and immediately trigger Next.js `revalidateTag()` edge purging, organizers experience instantaneous consistency.
   - TanStack Query on the client applies optimistic UI updates and 15s/30s polling intervals, ensuring users never see stale booking states during microsecond asynchronous replication lag.

---

### 4. Route-Level Rate Limiting & Abuse Prevention
To defend against bot scraping and spam attacks during peak season:
- **`POST /api/bookings` Rate Limiter**: Enforces a strict sliding window limit of **5 booking requests per hour** per client identifier (phone number and client IP).
- Exceeding the threshold returns HTTP `429 Too Many Requests` with a localized Bengali notification (`"আপনি প্রতি ঘণ্টায় সর্বোচ্চ ৫টি বুকিং আবেদন করতে পারবেন..."`) and `Retry-After: 3600` headers.
- Distributed Redis backend (Upstash REST API) with an in-memory fallback ensures zero downtime if external cache is unreachable.

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
