# Acadence — AADSS Complete Project Report
## Academic Attendance Decision Support System

> **Purpose of this document:** A complete, from-scratch guide explaining the problem, the solution, tech stack decisions, folder structure, every file, every algorithm, and every phase of building this project. Written so that if you ever need to build something similar, this document is your blueprint.

---

## Table of Contents

1. [The Problem — Why This Exists](#1-the-problem--why-this-exists)
2. [The Vision — What We're Building](#2-the-vision--what-were-building)
3. [Tech Stack — Why Each Tool Was Chosen](#3-tech-stack--why-each-tool-was-chosen)
4. [Project Setup — From Scratch](#4-project-setup--from-scratch)
5. [Complete Folder Structure](#5-complete-folder-structure)
6. [Database Design — Every Table Explained](#6-database-design--every-table-explained)
7. [Implementation Phases — Step by Step](#7-implementation-phases--step-by-step)
8. [Core Logic Deep Dives](#8-core-logic-deep-dives)
9. [Security Architecture — RLS & Role System](#9-security-architecture--rls--role-system)
10. [Key Algorithms With Full Code](#10-key-algorithms-with-full-code)
11. [Design System & UI Architecture](#11-design-system--ui-architecture)
12. [What's Next — Future Roadmap](#12-whats-next--future-roadmap)

---

## 1. The Problem — Why This Exists

### The Real-World Pain Point

In Indian colleges (B.Tech, BCA, BSc), attendance eligibility is **non-negotiable**. A student with less than 75% attendance cannot sit for their semester exams. The consequence: they lose the **entire year's effort**.

The tragedy? Students realize they've fallen below the threshold **only when it's too late** to recover. The existing solutions — college portals, Excel sheets, WhatsApp updates — only show **historical data**. They tell you where you've been, not where you're going.

### What's Missing Today

| Existing System Problem | What Students Actually Need |
|---|---|
| Shows total % but not trend | "Am I improving or declining?" |
| No future prediction | "Where will I end up if I keep this up?" |
| No skip analysis | "Can I safely bunk today's class?" |
| No recovery guidance | "How many classes must I attend to recover?" |
| No geo-verification | "Anyone can mark attendance from anywhere" |
| Manual attendance marking | Auto-absent for students who forget = no data gaps |

### Problem Statement (From PRD)

> "Students lose exam eligibility due to attendance shortfall — often realising too late. Existing systems only show historical data. AADSS provides **real-time intelligence**: current state, future prediction, and actionable recovery paths."

---

## 2. The Vision — What We're Building

**Acadence** (Academic + Attendance) is a full-stack web application that gives every student the answer to one critical question at any moment:

> _"At any moment, a student should know exactly where they stand, what will happen if they skip, and what they must do to stay eligible."_

### Core User Goals

**For Students:**
- Mark attendance in < 30 seconds (GPS-verified, time-windowed)
- See their attendance % per subject in real-time
- Know their risk level (safe/warning/danger)
- Run simulations: "What if I skip the next 3 days?"
- Get recovery plans: "How many consecutive classes to attend?"

**For Admins (Faculty/HOD):**
- Set up academic sessions, programs, semesters
- Configure subjects and timetables
- Generate class sessions automatically
- Manage holidays (auto-cascade cancellation)
- View defaulters report
- Override attendance when needed

---

## 3. Tech Stack — Why Each Tool Was Chosen

### Decision-Making Framework
Each tool was chosen against these criteria:
1. **Developer Velocity** — How fast can we build?
2. **Production Readiness** — Will it hold at scale?
3. **Zero Infrastructure Overhead** — No servers to manage
4. **Type Safety** — Catch bugs at compile time, not runtime

---

### 3.1 Next.js 16 (App Router) — The Framework

**Why Next.js over plain React?**

| Feature | Plain React | Next.js App Router |
|---|---|---|
| Routing | Manual (React Router) | File-system based (zero config) |
| API Calls | Client-side only | Server Components + Server Actions |
| Security | Secrets leak to client | Server-only execution possible |
| Performance | Manual optimization | Automatic streaming, caching |
| Auth | Complex setup | Middleware-based route protection |

**The App Router specifically** was chosen because of **Server Actions** — functions that run on the server but can be called directly from React components without any API boilerplate:

```typescript
// Without Server Actions (old way):
// 1. Create /api/mark-attendance endpoint
// 2. Fetch from client with useEffect or fetch()
// 3. Handle loading/error states manually
// 4. Manage CORS, JWT headers, etc.

// With Server Actions (our way):
"use server";
export async function markAttendance(sessionId: string) {
  const supabase = createClient(); // runs on server only
  // directly write to DB — no API layer needed
}
// Called from React component like a regular function
```

This eliminates an entire API layer — less code, less attack surface, less complexity.

---

### 3.2 Supabase — The Backend

**Why Supabase over custom Express backend?**

Supabase gives us for **free**:
- ✅ PostgreSQL database (full ACID transactions)
- ✅ Authentication (email/password, JWT sessions)
- ✅ Row Level Security (RLS) — database-level access control
- ✅ Auto-generated REST API
- ✅ Real-time subscriptions
- ✅ Database functions & triggers

The alternative would be: Express.js + PostgreSQL + Passport.js + JWT management + CORS + connection pooling = weeks of boilerplate. Supabase = setup in 30 minutes.

**Key Supabase features used:**
- `auth.users` — Built-in user management
- `app_metadata.role` — Admin vs Student role distinction
- RLS Policies — Row-level security so users can only see their own data
- `upsert()` with `onConflict` — Atomic insert-or-update for attendance
- Database cron function — Auto-complete sessions and mark absences

---

### 3.3 TypeScript — The Language

**Why TypeScript over JavaScript?**

This project has complex data shapes. Without TypeScript:
```javascript
// You'd write this and have no idea what's inside:
const analytics = await getAnalyticsSummary(semId, profileId, sessionId);
analytics.subjects.map(s => s.riskLvel); // typo → runtime crash
```

With TypeScript:
```typescript
// You get full autocomplete + compile-time errors:
const { data } = await getAnalyticsSummary(semId, profileId, sessionId);
data.subjects.map(s => s.riskLevel); // ✅ IDE shows the exact shape
```

The database types are generated directly from Supabase schema into `types/supabase.ts`, making every database query fully type-safe.

---

### 3.4 Tailwind CSS v4 + shadcn/ui — The UI Layer

**Why Tailwind v4?**
- New CSS-first config (`@import "tailwindcss"` instead of config files)
- OKLCH color space support (perceptually uniform, better dark mode)
- Better performance via Vite/PostCSS pipeline

**Why shadcn/ui over a full component library like MUI/Chakra?**

shadcn/ui is not a dependency — it **copies component source code into your project**. This means:
- Zero bundle overhead from unused components
- Full customization — you own the code
- No "component library API" to learn — just React + Tailwind

Components used:
- `Button`, `Card`, `Input` — base primitives
- Radix UI under the hood for accessibility (Dialog, Dropdown, etc.)

---

### 3.5 FingerprintJS — Device Lock

**Why FingerprintJS?**

To prevent proxy attendance (Student A marking for Student B remotely). FingerprintJS generates a unique browser/device signature based on:
- Browser version, screen resolution, timezone
- Hardware concurrency, WebGL renderer
- Audio context fingerprint

This ID is stored in the user's auth metadata during onboarding. On every attendance mark, the current device fingerprint is compared against the stored one.

```typescript
// lib/fingerprint.ts
import FingerprintJS from "@fingerprintjs/fingerprintjs";

let cachedVisitorId: string | null = null;

export async function getDeviceFingerprint(): Promise<string> {
  if (cachedVisitorId) return cachedVisitorId;
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  cachedVisitorId = result.visitorId;
  return cachedVisitorId as string;
}
```

---

## 4. Project Setup — From Scratch

### Step 1: Initialize Next.js App

```bash
npx create-next-app@latest acadence \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"
```

### Step 2: Install Core Dependencies

```bash
npm install @supabase/ssr @supabase/supabase-js
npm install @fingerprintjs/fingerprintjs
npm install lucide-react react-hot-toast
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder
npm install class-variance-authority clsx tailwind-merge
npm install lodash.debounce
```

### Step 3: Setup shadcn/ui

```bash
npx shadcn@latest init
# Chose: Dark/Light mode, oklch colors, Tailwind v4
```

### Step 4: Configure Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_DEVICE_LOCK_ENABLED=true
```

### Step 5: Setup Supabase Clients

Two clients are needed — one for server-side, one for client-side:

**Server Client** (`lib/supabase/server.ts`):
Uses cookies for session management (SSR-compatible):
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";

export function createClient() {
  const cookieStore = cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() { return (await cookieStore).getAll(); },
        async setAll(cookiesToSet) {
          const store = await cookieStore;
          cookiesToSet.forEach(({ name, value, options }) =>
            store.set(name, value, options)
          );
        },
      },
    }
  );
}
```

**Client Client** (`lib/supabase/client.ts`):
Browser-side, for real-time listeners and client components:
```typescript
import { createBrowserClient } from "@supabase/ssr";
export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
```

---

## 5. Complete Folder Structure

```
acadence/
│
├── 📁 app/                          # Next.js App Router
│   ├── 📄 layout.tsx                # Root HTML wrapper (font, toast provider)
│   ├── 📄 globals.css               # Design tokens (OKLCH colors, dark mode)
│   ├── 📄 page.tsx                  # Landing page (public, no auth)
│   ├── 📄 error.tsx                 # Global error boundary
│   │
│   ├── 📁 login/                    # /login — Auth page
│   │   └── page.tsx                 # Email/password login form
│   │
│   ├── 📁 register/                 # /register — Registration page
│   │   └── page.tsx                 # Email/password signup form
│   │
│   ├── 📁 onboarding/              # /onboarding — First-time setup
│   │   └── page.tsx                 # Select session/program/semester
│   │
│   ├── 📁 dashboard/               # /dashboard — Student home
│   │   ├── page.tsx                 # Quick stats + today's schedule
│   │   └── components/             # Dashboard-specific components
│   │
│   ├── 📁 calendar-dashboard/      # /calendar-dashboard
│   │   └── page.tsx                 # Year-view attendance calendar
│   │
│   ├── 📁 daily-attendance/        # /daily-attendance — Today's classes
│   │   └── page.tsx                 # Mark present + see today's schedule
│   │
│   ├── 📁 semester-statistics/     # /semester-statistics — Analytics
│   │   └── page.tsx                 # Per-subject stats, risk scores, trends
│   │
│   ├── 📁 simulate/                # /simulate — What-if simulations
│   │   └── page.tsx                 # Skip/attend/recovery simulators
│   │
│   ├── 📁 timetable/              # /timetable — Student's schedule view
│   │   └── page.tsx                 # Weekly timetable display
│   │
│   ├── 📁 profile/                 # /profile — User profile management
│   │   └── page.tsx                 # Edit profile, view device info
│   │
│   └── 📁 admin/                   # /admin — Admin panel (role-gated)
│       ├── layout.tsx               # Admin layout wrapper
│       ├── login/                   # Admin-specific login
│       └── (dashboard)/            # Route group — admin dashboard pages
│           ├── sessions/           # Manage academic sessions
│           ├── subjects/           # Manage subjects
│           ├── timetable/          # Configure timetables
│           ├── classes/            # Manage class sessions
│           ├── students/           # View student roster
│           ├── defaulters/         # Defaulters report
│           ├── holidays/           # Academic holidays management
│           └── promotions/         # Bulk semester promotion
│
├── 📁 components/                   # Reusable React components
│   ├── 📁 ui/                      # Base primitives (shadcn)
│   │   ├── button.tsx              # Button with variants (CVA)
│   │   ├── card.tsx                # Card container
│   │   └── input.tsx               # Form input
│   │
│   ├── 📁 common/                  # Site-wide shared components
│   │   └── Header.tsx              # Top nav bar + mobile bottom nav
│   │
│   └── 📁 admin/                   # Admin-specific UI components
│       ├── EntityCard.tsx          # Generic card for sessions/programs
│       ├── SubjectFormModal.tsx    # Create/edit subject modal
│       ├── SubjectsDataTable.tsx   # Subjects table with actions
│       └── DangerZoneModal.tsx     # Confirm-before-delete modal
│
├── 📁 lib/                         # Business logic (NOT UI)
│   │
│   ├── 📄 fingerprint.ts           # Device fingerprint utility
│   ├── 📄 utils.ts                 # cn() utility (clsx + tailwind-merge)
│   │
│   ├── 📁 supabase/
│   │   ├── client.ts               # Browser Supabase client
│   │   └── server.ts               # Server Supabase client (SSR)
│   │
│   ├── 📁 attendance/              # Attendance-related server actions
│   │   ├── markAttendance.ts       # Core attendance marking + validation pipeline
│   │   ├── markAbsentees.ts        # Mark absent for students who didn't attend
│   │   ├── autoMarkAbsent.ts       # Batch auto-absent for completed sessions
│   │   ├── autoCompleteSession.ts  # Auto-complete past sessions
│   │   ├── generateClassSessions.ts # Generate sessions from timetable
│   │   ├── getDailySchedule.ts     # Get today's class schedule
│   │   ├── getAttendanceByDates.ts # Calendar data — attendance by date range
│   │   └── getStudentProfile.ts   # Fetch current user's student profile
│   │
│   ├── 📁 admin/                   # Admin-only server actions
│   │   ├── actions.ts              # CRUD for all entities (sessions/programs/semesters/subjects/timetable/attendance override)
│   │   ├── bulk-actions.ts         # Bulk operations
│   │   ├── bulkGenerateSessions.ts # Generate sessions for date range
│   │   ├── defaulters.ts           # Defaulters report generation
│   │   ├── deviceActions.ts        # Device reset request management
│   │   ├── holidays.ts             # Holiday CRUD + cascade cancel
│   │   └── promotionActions.ts     # Bulk semester promotion
│   │
│   ├── 📁 engines/                 # Pure computational engines (no DB calls)
│   │   │
│   │   ├── 📁 analytics/           # Analytics computation
│   │   │   ├── types.ts            # Analytics type definitions
│   │   │   ├── getAnalyticsSummary.ts  # Main analytics orchestrator
│   │   │   ├── calculateRiskScore.ts   # 0-100 risk score algorithm
│   │   │   ├── calculateClassesNeeded.ts  # Classes needed to recover
│   │   │   ├── calculateWeeklyTrend.ts    # Week-by-week trend computation
│   │   │   ├── calculateSemesterProjection.ts  # End-of-semester projection
│   │   │   └── calculateDangerThreshold.ts    # Max skippable classes
│   │   │
│   │   ├── 📁 simulation/          # What-if simulation engine
│   │   │   ├── types.ts            # Simulation type definitions
│   │   │   ├── getSimulationData.ts  # Fetch data for simulation
│   │   │   ├── runSimulation.ts    # Core simulation runner
│   │   │   ├── runSkipPlanner.ts   # "How many can I skip?"
│   │   │   ├── runRecoveryPlanner.ts  # "How many to attend to recover?"
│   │   │   ├── runStreakSimulator.ts  # "What if I attend X consecutively?"
│   │   │   └── runWorstCase.ts     # "What's the worst that can happen?"
│   │   │
│   │   └── 📁 validation/          # Attendance validation guards
│   │       ├── types.ts            # Validation result types
│   │       ├── validateAttendanceTiming.ts  # 10-minute window check
│   │       ├── validateDuplicateMark.ts     # Already marked check
│   │       └── validateGeofence.ts          # GPS radius check (Haversine)
│   │
│   ├── 📁 notes/                   # (future) TipTap notes feature
│   └── 📁 utils/
│       └── dateUtils.ts            # Date formatting helpers
│
├── 📁 server/                      # Server-only operations (not lib)
│   ├── 📁 auth/
│   │   ├── login.ts                # signInWithPassword action
│   │   ├── register.ts             # signUp action
│   │   └── completeProfile.ts      # Onboarding profile completion
│   └── 📁 profile/
│
├── 📁 db/                          # Database definitions
│   ├── supabase-schema.sql         # Full schema (all CREATE TABLE statements)
│   └── 📁 seed/                    # Seed data scripts
│
├── 📁 supabase/                    # Supabase CLI config
│   ├── 📁 migrations/             # Incremental schema changes
│   │   ├── 20260407162500_auto_complete_and_mark_absent.sql  # Cron function
│   │   ├── 20260410182231_admin_rls_policies.sql             # Admin RLS
│   │   └── 20260410185344_admin_attendance_rls.sql           # Attendance RLS
│   └── 📁 functions/              # Edge Functions (currently empty)
│
├── 📁 types/
│   └── supabase.ts                 # Auto-generated Supabase TypeScript types
│
├── 📁 docs/                        # Project documentation
│   ├── PRD.md                      # Product Requirements Document
│   ├── architecture.md             # System design
│   ├── database.md                 # Database documentation
│   ├── features.md                 # Feature list
│   ├── techstack.md                # Tech stack decisions
│   ├── security.md                 # Security model
│   ├── api.md                      # API/Server Action docs
│   ├── uiux.md                     # UI/UX guidelines
│   ├── deployment.md               # Deployment guide
│   ├── ai_instructions.md          # AI assistant context
│   └── repository-analysis.md     # Full codebase analysis
│
├── 📄 package.json                 # Dependencies + scripts
├── 📄 next.config.ts               # Next.js configuration
├── 📄 tsconfig.json                # TypeScript config
├── 📄 components.json              # shadcn/ui config
├── 📄 eslint.config.mjs            # ESLint rules
├── 📄 Dockerfile                   # Docker image definition
├── 📄 docker-compose.yml           # Docker compose config
├── 📄 .env.local                   # Local environment variables
├── 📄 .env.example                 # Environment template
├── 📄 proxy.ts                     # (utility script)
└── 📄 create-admin.js              # Script to create admin user
```

---

## 6. Database Design — Every Table Explained

### Design Philosophy
The database follows a **hierarchical relational model**:

```
academic_sessions
  └── programs
        └── semesters
              └── subjects
                    └── timetable
                          └── class_sessions
                                └── attendance
```

This mirrors real college structure: A session (year) has programs (B.Tech CSE), programs have semesters (Sem 5), semesters have subjects (DSA), subjects have timetable slots (Monday 9AM), slots generate class sessions (actual dates), sessions hold attendance records.

### Complete Schema

```sql
-- ═══════════════════════════════════════════════════════
-- LAYER 1: Academic Organization
-- ═══════════════════════════════════════════════════════

-- academic_sessions: The top-level container for a year
-- e.g., "2025-2026", "Odd Semester 2026"
CREATE TABLE academic_sessions (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text NOT NULL,              -- "2025-2026"
  start_date  date,                       -- Semester start
  end_date    date,                       -- Semester end (for projections)
  status      text CHECK (status IN ('active', 'inactive', 'archived'))
              DEFAULT 'active'
);

-- programs: Degree programs within a session
-- e.g., "B.Tech CSE", "BCA"
CREATE TABLE programs (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  uuid REFERENCES academic_sessions(id) ON DELETE RESTRICT,
  name        text NOT NULL,
  status      text CHECK (status IN ('active', 'inactive', 'archived'))
              DEFAULT 'active'
);

-- semesters: Specific semester within a program
-- e.g., Sem 5 of B.Tech CSE 2025-2026
CREATE TABLE semesters (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id       uuid REFERENCES programs(id) ON DELETE RESTRICT,
  semester_number  int NOT NULL,     -- 1, 2, 3...8
  status           text CHECK (status IN ('active', 'inactive', 'archived'))
                   DEFAULT 'active'
);

-- ═══════════════════════════════════════════════════════
-- LAYER 2: Student Identity
-- ═══════════════════════════════════════════════════════

-- student_profiles: Links auth.users to academic structure
-- WHY SEPARATE TABLE: auth.users is managed by Supabase auth.
-- We can't add custom columns there. student_profiles stores
-- the academic linkage (which semester, which session)
CREATE TABLE student_profiles (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  session_id  uuid NOT NULL REFERENCES academic_sessions(id),
  program_id  uuid NOT NULL REFERENCES programs(id),
  semester_id uuid NOT NULL REFERENCES semesters(id),
  created_at  timestamp DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════
-- LAYER 3: Academic Content
-- ═══════════════════════════════════════════════════════

-- subjects: Courses within a semester
-- Key: min_attendance_required (default 75, can be 60-100 per subject)
CREATE TABLE subjects (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  semester_id             uuid NOT NULL REFERENCES semesters(id),
  name                    text NOT NULL,      -- "Data Structures & Algorithms"
  code                    text,               -- "CS301"
  credits                 int DEFAULT 3,
  min_attendance_required int DEFAULT 75,    -- The eligibility threshold
  status                  text CHECK (status IN ('active', 'inactive', 'archived'))
                          DEFAULT 'active',
  created_at              timestamp DEFAULT NOW()
);

-- timetable: Weekly schedule for each subject
-- day_of_week: 0=Sunday, 1=Monday...6=Saturday
-- lat/lon: Classroom GPS coordinates (for geo-fence)
-- allowed_radius: How many meters from classroom center (default 50m)
CREATE TABLE timetable (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id     uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  day_of_week    int NOT NULL,
  start_time     time NOT NULL,
  end_time       time NOT NULL CHECK (end_time > start_time),
  room           text,
  latitude       double precision,
  longitude      double precision,
  allowed_radius int DEFAULT 50,      -- meters
  created_at     timestamp DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════
-- LAYER 4: Class Events (Generated)
-- ═══════════════════════════════════════════════════════

-- class_sessions: Actual dated class instances
-- WHY GENERATED: Timetable is the TEMPLATE. class_sessions are the INSTANCES.
-- "Monday at 9AM" (timetable) → "2026-01-06 at 9AM" (class_session)
-- This allows cancellations, rescheduling per-date
-- status: scheduled → completed (by cron) or cancelled (by admin)
CREATE TABLE class_sessions (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  timetable_id  uuid REFERENCES timetable(id) ON DELETE CASCADE,
  subject_id    uuid REFERENCES subjects(id) ON DELETE CASCADE,
  date          date NOT NULL,
  start_time    time NOT NULL,
  end_time      time NOT NULL,
  status        text CHECK (status IN ('scheduled','cancelled','completed'))
                DEFAULT 'scheduled',
  created_at    timestamp DEFAULT NOW(),
  cancelled_by  uuid REFERENCES auth.users(id),  -- Audit: who cancelled
  cancelled_at  timestamp WITH TIME ZONE          -- Audit: when
);

-- ═══════════════════════════════════════════════════════
-- LAYER 5: Attendance Records
-- ═══════════════════════════════════════════════════════

-- attendance: The core data — who attended which class
-- UNIQUE constraint: One record per (student, session) — no duplicates
-- overridden_by: Admin override audit trail
CREATE TABLE attendance (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       uuid NOT NULL REFERENCES student_profiles(id),
  class_session_id uuid NOT NULL REFERENCES class_sessions(id),
  status           text NOT NULL CHECK (status IN ('present', 'absent', 'cancelled')),
  marked_at        timestamp DEFAULT NOW(),
  latitude         double precision,  -- Where student was when marked
  longitude        double precision,
  overridden_by    uuid REFERENCES auth.users(id),  -- Admin override trail
  override_reason  text,
  UNIQUE(student_id, class_session_id)   -- ← CRITICAL: Prevents double-marking
);

-- Indexes for common query patterns
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_session ON attendance(class_session_id);
CREATE INDEX idx_class_sessions_date ON class_sessions(date);

-- ═══════════════════════════════════════════════════════
-- LAYER 6: Supporting Tables
-- ═══════════════════════════════════════════════════════

-- notes: Student personal notes per day (TipTap rich text)
CREATE TABLE notes (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid REFERENCES student_profiles(id) ON DELETE CASCADE,
  date       date NOT NULL,
  content    jsonb,  -- TipTap's JSON format
  created_at timestamp DEFAULT NOW()
);

-- risk_scores: Cached analytics to avoid recomputing
CREATE TABLE risk_scores (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id               uuid REFERENCES student_profiles(id),
  subject_id               uuid REFERENCES subjects(id),
  risk_score               int NOT NULL DEFAULT 0,
  risk_level               text NOT NULL DEFAULT 'safe',
  classes_needed_to_recover int NOT NULL DEFAULT 0,
  computed_at              timestamp WITH TIME ZONE DEFAULT NOW()
);

-- device_reset_requests: When student changes device
-- Flow: Student requests → Admin approves → Old fingerprint cleared
CREATE TABLE device_reset_requests (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_profile_id   uuid NOT NULL REFERENCES student_profiles(id),
  user_id              uuid NOT NULL REFERENCES auth.users(id),
  reason               text NOT NULL,
  status               text NOT NULL CHECK (status IN ('pending','approved','rejected','completed'))
                       DEFAULT 'pending',
  admin_notes          text,
  approved_by          uuid REFERENCES auth.users(id),
  requested_at         timestamp WITH TIME ZONE DEFAULT NOW(),
  reviewed_at          timestamp WITH TIME ZONE,
  activates_at         timestamp WITH TIME ZONE,
  completed_at         timestamp WITH TIME ZONE
);

-- academic_holidays: College holidays (cancels all sessions that day)
CREATE TABLE academic_holidays (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES academic_sessions(id) ON DELETE CASCADE,
  date       date NOT NULL,
  title      text NOT NULL,
  created_at timestamp WITH TIME ZONE DEFAULT NOW()
);
```

### Entity Relationship Summary

```
academic_sessions ──┬── programs ──── semesters ──┬── subjects ──── timetable ──── class_sessions ──── attendance
                    │                              │                                                       │
                    └── academic_holidays          └── student_profiles ─────────────────────────────────┘
                                                         │
                                                   device_reset_requests
```

---

## 7. Implementation Phases — Step by Step

### Phase 1: Foundation & Auth (Week 1)

**Goal:** Get users registered, logged in, and profiled.

**What We Built:**
1. Supabase project + Schema setup
2. Next.js project with TypeScript + Tailwind
3. Two Supabase clients (server + browser)
4. Auth pages: `/login`, `/register`, `/onboarding`
5. Server actions for auth

**The Auth Flow:**
```
User hits /login
  → enters email + password
  → server action: supabase.auth.signInWithPassword()
  → Supabase sets HTTP-only cookie (JWT session)
  → Check user_metadata for onboarding completion
  → if needsOnboarding → redirect to /onboarding
  → else → redirect to /dashboard
```

**Why Cookie-based Auth?**
- HTTP-only cookies cannot be stolen by JavaScript (XSS-safe)
- Works with Next.js server-side rendering
- Supabase SSR package handles cookie sync automatically

**Onboarding Flow:**
After registration, users must:
1. Set their full name
2. Select their academic session → program → semester
3. Device fingerprint is captured and stored in `user_metadata.device_id`

This creates their `student_profiles` row, linking the auth user to the academic structure.

```typescript
// server/auth/completeProfile.ts
"use server";
export async function completeProfile(data: {
  fullName: string;
  sessionId: string;
  programId: string;
  semesterId: string;
  deviceFingerprint: string;
}) {
  const supabase = createClient();
  
  // 1. Update user metadata with name + device ID
  await supabase.auth.updateUser({
    data: {
      full_name: data.fullName,
      device_id: data.deviceFingerprint,
    },
  });
  
  // 2. Create student_profiles row
  await supabase.from("student_profiles").insert({
    session_id: data.sessionId,
    program_id: data.programId,
    semester_id: data.semesterId,
  });
}
```

---

### Phase 2: Admin Panel (Week 2)

**Goal:** Admins can set up the entire academic structure.

**Admin Role Detection:**
Admin role is stored in `app_metadata.role = "admin"`. 
Unlike `user_metadata` (which users can edit), `app_metadata` is server-side only — only service role key can write to it.

```typescript
// Every admin server action starts with this guard:
async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") {
    throw new Error("Unauthorized");  // Server throws, never reaches client
  }
  return supabase;
}
```

**Admin CRUD Operations (`lib/admin/actions.ts`):**

The file implements full CRUD for:
- Academic Sessions: `createSession`, `updateSession`, `deleteSession`
- Programs: `createProgram`, `updateProgram`, `deleteProgram`
- Semesters: `createSemester`, `updateSemester`, `deleteSemester`
- Subjects: `createSubject`, `updateSubject`, `deleteSubject`
- Timetable: `createTimetableSlot`, `updateTimetableSlot`, `deleteTimetableSlot`
- Class Sessions: `updateClassSessionStatus`, `rescheduleClassSession`
- Attendance: `cancelClassAndCascade`, `restoreClassAndCascade`, `overrideStudentAttendance`

**Key Insight — Cascade Operations:**

When admin cancels a class:
```typescript
export async function cancelClassAndCascade(classSessionId: string) {
  // 1. Mark class_session as cancelled
  await supabase.from("class_sessions")
    .update({ status: "cancelled", cancelled_by: user.id, cancelled_at: now })
    .eq("id", classSessionId);
  
  // 2. Find ALL students in that semester
  const students = await supabase.from("student_profiles")
    .select("id").eq("semester_id", semesterId);
  
  // 3. Insert "cancelled" attendance for all of them
  // (Upsert in chunks of 500 to avoid payload limits)
  const attendanceRows = students.map(s => ({
    student_id: s.id,
    class_session_id: classSessionId,
    status: "cancelled",
  }));
  
  // Chunked upsert
  for (let i = 0; i < attendanceRows.length; i += 500) {
    await supabase.from("attendance")
      .upsert(chunk, { onConflict: "student_id,class_session_id" });
  }
}
```

This ensures when a class is cancelled, no student's attendance count is affected — the "cancelled" status is excluded from % calculations.

---

### Phase 3: Class Session Generation (Week 2-3)

**The Problem:** Timetable says "Math every Monday at 9AM". But you need actual dated sessions to mark attendance against.

**The Solution:** `generateClassSessionsForDate()` — takes a date, looks up what classes are scheduled on that day of the week, and creates `class_sessions` rows.

```typescript
// lib/attendance/generateClassSessions.ts
export async function generateClassSessionsForDate(
  date: string,  // YYYY-MM-DD
  semesterId: string
) {
  // 1. What day of week is this date?
  const dayOfWeek = new Date(date + "T00:00:00").getDay();
  
  // 2. Find timetable slots for this day + semester
  const timetableSlots = await supabase.from("timetable")
    .select("id, subject_id, start_time, end_time, created_at, subjects!inner(semester_id)")
    .eq("day_of_week", dayOfWeek)
    .eq("subjects.semester_id", semesterId);
  
  // 3. Filter out already-generated sessions
  const existing = await supabase.from("class_sessions")
    .select("timetable_id").eq("date", date);
  const existingIds = new Set(existing.map(s => s.timetable_id));
  
  // 4. CRITICAL: Back-fill protection!
  // If admin creates a timetable slot TODAY for MONDAY,
  // don't generate sessions for past Mondays before today.
  const toGenerate = timetableSlots.filter(slot => {
    if (existingIds.has(slot.id)) return false;
    const slotCreated = new Date(slot.created_at).toLocaleDateString("en-CA");
    return date >= slotCreated;  // Only generate forward from creation date
  });
  
  // 5. Insert the new sessions
  await supabase.from("class_sessions").insert(
    toGenerate.map(slot => ({
      timetable_id: slot.id,
      subject_id: slot.subject_id,
      date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      status: "scheduled"
    }))
  );
}
```

---

### Phase 4: Attendance Marking Pipeline (Week 3)

**This is the most security-critical part of the system.**

The `markAttendance()` function implements a 7-step validation pipeline. Every step is a guard — if any fails, the mark is rejected with a specific error code.

**The 7-Step Pipeline:**

```
Step 0: Auth check — is user logged in?
Step 1: Device fingerprint check — is this their registered device?
Step 2: Status guard — student can ONLY mark "present"
Step 3: Session fetch — get class details
Step 4: Session status check — is class cancelled/completed?
Step 5: Duplicate check — already marked?
Step 6: Time window check — within 10 minutes of class start?
Step 7: Geo-fence check — within classroom radius?
Step 8: Upsert attendance record
```

Full code:

```typescript
// lib/attendance/markAttendance.ts
"use server";

export async function markAttendance(
  sessionId: string,
  studentProfileId: string,
  status: "present",
  location?: GeoLocation,
  deviceFingerprint?: string,
): Promise<{ error: string | null; validationError?: string }> {
  const supabase = createClient();

  // STEP 0: Auth verification
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Authentication failed.", validationError: "AUTH_ERROR" };
  }

  // STEP 1: Device fingerprint verification (if enabled)
  const deviceLockEnabled = process.env.NEXT_PUBLIC_DEVICE_LOCK_ENABLED === "true";
  if (deviceLockEnabled && user.user_metadata?.device_id
      && user.user_metadata.device_id !== deviceFingerprint) {
    return {
      error: "Proxy Detected: You must use your registered device.",
      validationError: "PROXY_DETECTED"
    };
  }

  // STEP 2: Status guard
  if (status !== "present") {
    return { error: "You can only mark yourself as present.", validationError: "INVALID_STATUS" };
  }

  // STEP 3: Session details fetch
  const { data: session } = await supabase
    .from("class_sessions")
    .select("id, date, start_time, status, timetable(latitude, longitude, allowed_radius)")
    .eq("id", sessionId).single();

  // STEP 4: Session status check
  if (session.status === "cancelled") {
    return { error: "This class has been cancelled.", validationError: "SESSION_CANCELLED" };
  }
  if (session.status === "completed") {
    return { error: "Attendance window is closed.", validationError: "SESSION_COMPLETED" };
  }

  // STEP 5: Duplicate check
  const existing = await supabase.from("attendance")
    .select("status").eq("class_session_id", sessionId)
    .eq("student_id", studentProfileId).single();
  
  const duplicateCheck = validateDuplicateMark(existing?.status);
  if (!duplicateCheck.valid) {
    return { error: "Already marked attendance.", validationError: duplicateCheck.error };
  }

  // STEP 6: Time window validation (10-minute rule)
  const timingCheck = validateAttendanceTiming(session.date, session.start_time, 10);
  if (!timingCheck.valid) {
    return {
      error: timingCheck.error === "TOO_EARLY"
        ? "Class hasn't started yet."
        : "Attendance window expired (10 min rule).",
      validationError: timingCheck.error
    };
  }

  // STEP 7: Geo-fence validation
  // CRITICAL GOTCHA: Supabase PostgREST returns FK joins as ARRAYS, not objects!
  // Must safely extract the first element:
  const rawTimetable = session.timetable as unknown;
  const timetableRow = Array.isArray(rawTimetable) ? rawTimetable[0] : rawTimetable;
  
  const classLat = timetableRow?.latitude != null ? Number(timetableRow.latitude) : null;
  const classLon = timetableRow?.longitude != null ? Number(timetableRow.longitude) : null;
  const classRadius = timetableRow?.allowed_radius != null ? Number(timetableRow.allowed_radius) : null;

  if (classLat !== null && classLon !== null && classRadius !== null) {
    if (!location) {
      return { error: "Location required for this class.", validationError: "LOCATION_UNAVAILABLE" };
    }
    const geoCheck = validateGeofence(location, classLat, classLon, classRadius);
    if (!geoCheck.valid) {
      return { error: `You are outside the classroom (${classRadius}m radius).`, validationError: geoCheck.error };
    }
  }

  // STEP 8: All checks passed — write to DB
  const { error } = await supabase.from("attendance").upsert(
    {
      class_session_id: sessionId,
      student_id: studentProfileId,
      status: "present",
      marked_at: new Date().toISOString(),
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
    },
    { onConflict: "student_id,class_session_id" }  // Atomic upsert
  );

  return { error: error?.message ?? null };
}
```

---

### Phase 5: Analytics Engine (Week 4)

**Goal:** Given a student's attendance history, compute actionable intelligence.

**The Analytics Pipeline (`getAnalyticsSummary`):**

```
Input: semesterId + studentProfileId + sessionId
  ↓
1. Fetch all subjects for the semester
  ↓
2. Parallel fetch:
   a. Academic session (for start/end dates)
   b. Timetable (for weekly class frequency)
   c. All class_sessions up to today
  ↓
3. Calculate remaining classes per subject
   (days remaining × weekly frequency)
  ↓
4. Fetch attendance records for the student
  ↓
5. Per-subject compute:
   - totalClasses, presentClasses, absentClasses
   - attendancePercentage
   - riskScore (0-100), riskLevel (safe/warning/danger)
   - classesNeededToRecover
   - weeklyTrend (last 4 weeks)
  ↓
6. Compute projections (what % will I end semester with?)
  ↓
7. Compute danger thresholds (how many more can I miss?)
  ↓
8. Overall aggregate stats
Output: ExtendedAnalyticsSummary
```

---

### Phase 6: Simulation Engine (Week 4-5)

**Goal:** Answer "what if?" questions.

The simulation engine is a **pure function** — it takes input data and returns computed results with zero side effects. No database calls inside `runSimulation()`.

**The Four Simulators:**

1. **Skip Planner** (`runSkipPlanner.ts`): "How many classes can I safely miss from today?"
   - Binary search: find max skips where all subjects stay above threshold

2. **Recovery Planner** (`runRecoveryPlanner.ts`): "How many consecutive classes must I attend to reach 75%?"
   - Math: solve for n in `(present + n) / (total + n) >= 0.75`

3. **Streak Simulator** (`runStreakSimulator.ts`): "What happens if I attend X classes straight?"
   - Forward simulation: assume present for next N sessions

4. **Worst Case** (`runWorstCase.ts`): "What if I miss everything remaining?"
   - Set future attendance to 0, compute final %

```typescript
// Core simulation logic:
export function runSimulation(subjects: SubjectSimInput[], action: SimAction): SimulationOutput {
  const results = subjects.map(sub => {
    const currentPct = sub.totalClasses > 0
      ? (sub.present / sub.totalClasses) * 100 : 100;

    let newPresent = sub.present;
    let newTotal = sub.totalClasses;

    if (action.mode === "skip") {
      newTotal += action.count;  // Miss N classes
    } else {
      newPresent += action.count;  // Attend N classes
      newTotal += action.count;
    }

    const simulatedPct = newTotal > 0 ? (newPresent / newTotal) * 100 : 100;
    const minAtt = sub.minAttendanceRequired;

    // Classes needed to recover after this action
    let classesNeededToRecover = 0;
    if (simulatedPct < minAtt) {
      const r = minAtt / 100;
      classesNeededToRecover = Math.ceil((r * newTotal - newPresent) / (1 - r));
    }

    // Can recovery happen within remaining classes?
    const remainingAfterAction = Math.max(0, sub.remainingClasses - action.count);
    const isRecoveryPossible = classesNeededToRecover <= remainingAfterAction;

    // Is it mathematically impossible to recover?
    const maxPossiblePct = ((newPresent + remainingAfterAction) / (newTotal + remainingAfterAction)) * 100;
    const isMathematicallyUnrecoverable = maxPossiblePct < minAtt;

    return {
      currentPct, simulatedPct,
      isSafeAfterAction: simulatedPct >= minAtt,
      wouldDropBelowThreshold: currentPct >= minAtt && simulatedPct < minAtt,
      classesNeededToRecover,
      isRecoveryPossible,
      isMathematicallyUnrecoverable,
      bufferPct: simulatedPct - minAtt,  // How much "buffer" remains
    };
  });

  // Overall decision
  const anyDanger = results.some(r => r.wouldDropBelowThreshold || r.isMathematicallyUnrecoverable);
  const overallDecision = action.mode === "skip"
    ? (anyDanger ? "Do Not Skip" : "Safe")
    : "Keep Attending";

  return { summary: { overallDecision, ...stats }, subjects: results };
}
```

---

### Phase 7: Automated Background Tasks (Week 5)

**Problem:** Who marks students absent if they don't mark themselves? Who completes sessions that have ended?

**Solution:** A PostgreSQL cron function (via `pg_cron`):

```sql
-- supabase/migrations/20260407162500_auto_complete_and_mark_absent.sql
CREATE OR REPLACE FUNCTION cron_auto_complete_and_mark_absent()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Step 1: Auto-complete past sessions
  UPDATE class_sessions
  SET status = 'completed'
  WHERE status = 'scheduled'
    AND (
      date < CURRENT_DATE  -- Yesterday or earlier
      OR (date = CURRENT_DATE AND end_time < CURRENT_TIME::time)  -- Today but ended
    );

  -- Step 2: Mark absentees for completed sessions
  INSERT INTO attendance (class_session_id, student_id, status, marked_at)
  SELECT cs.id, sp.id, 'absent', CURRENT_TIMESTAMP
  FROM class_sessions cs
  JOIN subjects sub ON cs.subject_id = sub.id
  JOIN student_profiles sp ON sp.semester_id = sub.semester_id
  WHERE cs.status = 'completed'
    AND NOT EXISTS (
      SELECT 1 FROM attendance a
      WHERE a.class_session_id = cs.id AND a.student_id = sp.id
    )
  ON CONFLICT (student_id, class_session_id) DO NOTHING;
END;
$$;
```

**How it's triggered:** This function is registered as a `pg_cron` job in Supabase (runs every few hours). It uses `SECURITY DEFINER` meaning it runs with admin-level DB permissions regardless of who calls it.

**The same logic exists in TypeScript** (`autoMarkAbsent.ts`, `autoCompleteSession.ts`) for cases where the client triggers it (e.g., when student opens the attendance page, it triggers a sync).

---

### Phase 8: Holidays System (Week 5)

**Cascade pattern:** When admin adds a holiday, every class session on that date is automatically cancelled:

```typescript
// lib/admin/holidays.ts
export async function addHoliday(prevState, formData) {
  // 1. Insert holiday record
  await supabase.from("academic_holidays").insert([{ title, date, session_id }]);
  
  // 2. Cascade cancel all class_sessions on that date
  await supabase.from("class_sessions")
    .update({ status: "cancelled" })
    .eq("date", date);
}

// When holiday is deleted, reverse the cascade:
export async function deleteHoliday(holidayId) {
  // 1. Get the holiday's date
  const { data } = await supabase.from("academic_holidays")
    .select("date").eq("id", holidayId).single();
  
  // 2. Restore cancelled sessions for that date
  await supabase.from("class_sessions")
    .update({ status: "scheduled" })
    .eq("date", targetDate).eq("status", "cancelled");
  
  // 3. Delete the holiday
  await supabase.from("academic_holidays").delete().eq("id", holidayId);
}
```

---

### Phase 9: Defaulters Report (Week 6)

**The most complex admin feature.** Calculates which students are below minimum attendance for each subject.

**Algorithm:**
```typescript
// lib/admin/defaulters.ts
// 1. Fetch all students in semester
// 2. Fetch all subjects in semester
// 3. Fetch all class_sessions up to today (non-cancelled)
// 4. Fetch all attendance records for those sessions

// 5. Build aggregation matrix:
// aggMatrix[studentId_subjectId] = presentCount

// Initialize matrix to 0 for all (student × subject) pairs
students.forEach(student => {
  subjects.forEach(subject => {
    aggMatrix[`${student.id}_${subject.id}`] = 0;
  });
});

// Fill in present counts
attendance.forEach(att => {
  if (att.status === "present") {
    aggMatrix[`${att.student_id}_${att.subject_id}`]++;
  }
});

// 6. For each (student, subject): calculate % and check against min_required
// Return records where actual_percent < min_required_percent

// 7. Sort by biggest deficit first (worst defaulters appear at top)
records.sort((a, b) => (b.min - b.actual) - (a.min - a.actual));
```

---

### Phase 10: Student Promotion (Week 6)

**Admin can move all students from Sem 5 to Sem 6 in one click:**

```typescript
// lib/admin/promotionActions.ts
export async function promoteStudents(programId, fromSemesterId, nextSemNumber) {
  // 1. Check if Sem 6 already exists
  let { data: existingSem } = await supabase.from("semesters")
    .select("id").eq("program_id", programId).eq("semester_number", nextSemNumber)
    .maybeSingle();
  
  // 2. If not, auto-create Sem 6 (auto-provisioning pattern)
  if (!existingSem) {
    const { data: newSem } = await supabase.from("semesters")
      .insert({ program_id: programId, semester_number: nextSemNumber })
      .select("id").single();
    targetSemesterId = newSem.id;
  }
  
  // 3. Bulk update: Move ALL students in one SQL UPDATE
  // No loops! Pure efficiency.
  await supabase.from("student_profiles")
    .update({ semester_id: targetSemesterId })
    .eq("semester_id", fromSemesterId);
}
```

---

## 8. Core Logic Deep Dives

### 8.1 Geo-fence: Haversine Formula

Earth is a sphere, not flat. So we can't use simple Euclidean distance to compute if two GPS points are close. We use the **Haversine formula**:

```typescript
// lib/engines/validation/validateGeofence.ts
function haversineDistance(lat1, lon1, lat2, lon2): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

export function validateGeofence(studentLocation, classLat, classLon, allowedRadius) {
  // STRICT RULE 1: GPS accuracy must be < 80m (deny spoofed/poor GPS)
  if (studentLocation.accuracy > 80) {
    return { valid: false, error: "OUTSIDE_GEOFENCE" };
  }

  const distance = haversineDistance(
    studentLocation.latitude, studentLocation.longitude,
    classLat, classLon
  );

  // STRICT RULE 2: Effective radius = allowed + min(GPS accuracy, 40m buffer)
  const effectiveRadius = allowedRadius + Math.min(studentLocation.accuracy, 40);
  
  if (distance > effectiveRadius) {
    return { valid: false, error: "OUTSIDE_GEOFENCE" };
  }

  return { valid: true };
}
```

**Why 80m accuracy cutoff?** GPS accuracy varies by device, environment. On a clear outdoor day, accuracy is 5-20m. Inside a building, it degrades to 50-100m. If accuracy > 80m, the GPS data is too unreliable to trust (could be anywhere in a 80m radius).

**Why 40m buffer on effective radius?** Student is inside a 50m allowed zone. Their GPS says accuracy = 30m. Effective radius = 50 + min(30, 40) = 80m. This prevents false rejections for students with slightly imprecise GPS while still blocking anyone clearly outside.

---

### 8.2 Risk Score Algorithm (0-100 Scale)

```typescript
// lib/engines/analytics/calculateRiskScore.ts

/**
 * Three zones:
 * SAFE    (0-30):  attendance >= required%
 * WARNING (31-69): attendance < required% but > (required% - 10)
 * DANGER  (70-100): attendance < (required% - 10)
 *
 * Example with 75% required:
 * 75%+    → SAFE (score 0-30)
 * 65-74%  → WARNING (score 31-69)
 * <65%    → DANGER (score 70-100)
 */
export function calculateRiskScore(attendancePercentage, requiredPercentage) {
  const dangerLine = Math.max(0, requiredPercentage - 10);

  if (attendancePercentage >= requiredPercentage) {
    // SAFE: Scale 0-30 based on how much above required
    const margin = attendancePercentage - requiredPercentage;
    const maxMargin = 100 - requiredPercentage;
    const riskScore = maxMargin > 0 ? Math.round(30 * (1 - margin / maxMargin)) : 0;
    return { riskScore: Math.max(0, riskScore), riskLevel: "safe" };
  }

  if (attendancePercentage >= dangerLine) {
    // WARNING: Scale 31-69 based on gap from required
    const range = requiredPercentage - dangerLine;  // = 10
    const gap = requiredPercentage - attendancePercentage;
    const riskScore = range > 0 ? 31 + Math.round(38 * (gap / range)) : 50;
    return { riskScore: Math.min(69, riskScore), riskLevel: "warning" };
  }

  // DANGER: Scale 70-100 based on how far below danger line
  const riskScore = dangerLine > 0
    ? 70 + Math.round(30 * (1 - attendancePercentage / dangerLine))
    : 100;
  return { riskScore: Math.min(100, riskScore), riskLevel: "danger" };
}
```

---

### 8.3 Semester End Projection

```typescript
// lib/engines/analytics/calculateSemesterProjection.ts

export function calculateSemesterProjection(params) {
  const { presentClasses, totalClasses, remainingClasses, requiredPercentage, weeklyTrend } = params;
  
  // Current attendance rate
  const currentRate = totalClasses > 0 ? presentClasses / totalClasses : 0;
  
  // Projected final: assume student maintains same rate
  const projectedPresent = presentClasses + Math.round(remainingClasses * currentRate);
  const projectedTotal = totalClasses + remainingClasses;
  const projectedFinalPercentage = projectedTotal > 0
    ? Math.round((projectedPresent / projectedTotal) * 100) : 0;

  // Trend detection (last 2 weeks vs older 2 weeks)
  let trend = "stable";
  if (weeklyTrend.length >= 4) {
    const olderAvg = (weeklyTrend[0].attendancePercentage + weeklyTrend[1].attendancePercentage) / 2;
    const recentAvg = (weeklyTrend[2].attendancePercentage + weeklyTrend[3].attendancePercentage) / 2;
    if (recentAvg > olderAvg + 5) trend = "improving";
    else if (recentAvg < olderAvg - 5) trend = "declining";
  }

  return { projectedFinalPercentage, trend, projectedStatus };
}
```

---

## 9. Security Architecture — RLS & Role System

### Row Level Security (RLS) Philosophy

Every Supabase table has RLS enabled. This means:
- Without a policy, no one can read or write a table
- Policies are enforced at the **database level**, not application level
- Even if a bug in application code tries to read another student's data, the database will block it

### Student Data Access Pattern

```sql
-- Student can only see their own student_profile
CREATE POLICY "Students see own profile" ON student_profiles
FOR SELECT USING (user_id = auth.uid());

-- Student can only see their own attendance
CREATE POLICY "Students see own attendance" ON attendance
FOR SELECT USING (
  student_id IN (
    SELECT id FROM student_profiles WHERE user_id = auth.uid()
  )
);

-- Student can only INSERT (mark) their own attendance
CREATE POLICY "Students insert own attendance" ON attendance
FOR INSERT WITH CHECK (
  student_id IN (
    SELECT id FROM student_profiles WHERE user_id = auth.uid()
  )
);
```

### Admin Access Pattern

```sql
-- Helper function: is current user an admin?
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
$$ LANGUAGE SQL SECURITY DEFINER;

-- Admins can see everything
CREATE POLICY "Admin view all" ON student_profiles
FOR SELECT USING (is_admin());

CREATE POLICY "Admin update all student profiles" ON student_profiles
FOR UPDATE USING (is_admin());

CREATE POLICY "Admin view all device requests" ON device_reset_requests
FOR SELECT USING (is_admin());
```

### Why `app_metadata` for Admin Role?

- `user_metadata`: User-editable. A student could set `user_metadata.role = "admin"` themselves.
- `app_metadata`: Server-only. Only Supabase service role key can write to it. This is what makes role-based access truly secure.

---

## 10. Key Algorithms With Full Code

### 10.1 Classes Needed to Recover

**Formula:** Given that student has `present` classes out of `total`, and needs to reach `minPercent`, solve for `n` (consecutive classes to attend):

```
(present + n) / (total + n) >= minPercent/100

Cross-multiply:
present + n >= minPercent * (total + n) / 100

Rearrange:
present + n >= (minPercent * total + minPercent * n) / 100
100*present + 100*n >= minPercent * total + minPercent * n
100*n - minPercent*n >= minPercent * total - 100 * present
n * (100 - minPercent) >= minPercent * total - 100 * present
n >= (minPercent * total - 100 * present) / (100 - minPercent)

Equivalent to:
n >= (r * total - present) / (1 - r)   where r = minPercent/100
```

```typescript
// lib/engines/analytics/calculateClassesNeeded.ts
export function calculateClassesNeeded(
  totalClasses: number,
  presentClasses: number,
  requiredPercentage: number
): number {
  const r = requiredPercentage / 100;
  const currentPct = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;
  
  if (currentPct >= requiredPercentage) return 0;  // Already safe
  if (r >= 1) return Infinity;  // 100% required — mathematically impossible to recover if any absent
  
  const needed = Math.ceil((r * totalClasses - presentClasses) / (1 - r));
  return Math.max(0, needed);
}
```

### 10.2 Weekly Trend Computation

Groups attendance records into 4-week buckets, calculates % per week:

```typescript
// lib/engines/analytics/calculateWeeklyTrend.ts
export function calculateWeeklyTrend(records) {
  // Get last 28 days
  const today = new Date();
  const weeks = [3, 2, 1, 0].map(weeksAgo => {
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() - weeksAgo * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);
    return { weekStart, weekEnd };
  });

  return weeks.map((week, i) => {
    const weekRecords = records.filter(r => {
      const d = new Date(r.scheduledDate);
      return d >= week.weekStart && d <= week.weekEnd;
    });
    
    const total = weekRecords.filter(r => r.status !== "cancelled").length;
    const present = weekRecords.filter(r => r.status === "present").length;
    const attendancePercentage = total > 0 ? Math.round((present / total) * 100) : 0;
    
    return {
      weekLabel: `Week ${i + 1}`,
      weekStart: week.weekStart.toLocaleDateString("en-CA"),
      attendancePercentage
    };
  });
}
```

---

## 11. Design System & UI Architecture

### CSS Design Tokens (globals.css)

Uses OKLCH color space — perceptually uniform, gives consistent contrast:

```css
:root {
  --background: oklch(1 0 0);          /* Pure white */
  --foreground: oklch(0.145 0 0);      /* Near-black text */
  --primary: oklch(0.205 0 0);         /* Dark primary */
  --muted: oklch(0.97 0 0);            /* Light gray backgrounds */
  --border: oklch(0.922 0 0);          /* Subtle borders */
  --radius: 0.625rem;                  /* Base border-radius (10px) */
}

.dark {
  --background: oklch(0.145 0 0);     /* Dark background */
  --foreground: oklch(0.985 0 0);     /* Near-white text */
  --primary: oklch(0.922 0 0);        /* Light primary in dark mode */
}
```

### Component Architecture

**3-tier component hierarchy:**

```
ui/          → Primitives (Button, Card, Input) — no business logic
common/      → Site-wide (Header) — navigation and layout
admin/       → Feature-specific (SubjectFormModal) — contains business logic
```

**Header Component Design:**
- Desktop: Fixed top bar with logo + nav links + date badge + settings dropdown
- Mobile: Bottom tab bar (5 tabs) + settings dropdown above the bar
- Responsive: Same component handles both with Tailwind `md:` prefix

```typescript
// Responsive nav — same component:
<>
  {/* Desktop top nav */}
  <header className="hidden md:block fixed top-0 ...">
    {NAV_ITEMS.map(item => <Link ...>{item.label}</Link>)}
  </header>
  
  {/* Mobile bottom nav */}
  <nav className="md:hidden fixed bottom-0 ...">
    {NAV_ITEMS.map(item => <Link ...>{item.label}</Link>)}
  </nav>
</>
```

### Page-Level Data Flow Pattern

Every page follows this consistent pattern:

```typescript
// Server Component (default in App Router)
// Data is fetched on the server, no useEffect, no loading states for initial data

export default async function SemesterStatisticsPage() {
  const supabase = createClient();
  
  // 1. Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  
  // 2. Get student profile
  const profile = await getStudentProfile();
  if (!profile) redirect("/onboarding");
  
  // 3. Fetch data (server-side, fast)
  const { data: analytics } = await getAnalyticsSummary(
    profile.semester_id,
    profile.id,
    profile.session_id
  );
  
  // 4. Render with pre-loaded data (no skeleton states for primary content)
  return <SemesterStatisticsView analytics={analytics} />;
}
```

---

## 12. What's Next — Future Roadmap

### P1 (Next Semester)

| Feature | Why Important |
|---|---|
| Push Notifications | Alert when subject drops below 75% |
| Attendance Correction Request | Student → Admin correction flow |
| Admin Bulk CSV Import | Excel → timetable/student data |
| PDF Export | Students print their attendance report |
| Dark Mode Toggle | (CSS variables already ready!) |

### P2 (Future)

| Feature | Technical Approach |
|---|---|
| Multi-device sync | Supabase Realtime subscriptions |
| QR Code attendance | Admin generates QR → students scan |
| Offline Support | Service Worker + IndexedDB cache |
| AI Attendance Predictions | ML model on attendance history |
| Parent Portal | View-only RLS policy per parent link |

---

## Appendix: Environment Variables Reference

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL        # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Public anon key (safe to expose)
SUPABASE_SERVICE_ROLE_KEY       # Service role key (NEVER expose to client!)

# Optional
NEXT_PUBLIC_DEVICE_LOCK_ENABLED # "true" or "false" — enables device fingerprint check
```

## Appendix: Docker Setup

```yaml
# docker-compose.yml
version: "3.8"
services:
  web:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.local
    volumes:
      - .:/app             # Hot module reload
      - /app/node_modules  # Don't override node_modules in container
    environment:
      - WATCHPACK_POLLING=true  # For HMR in containers (Windows/Mac)
```

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

---

*Report generated: May 2026 | Acadence v0.1.0 | AADSS — Academic Attendance Decision Support System*
