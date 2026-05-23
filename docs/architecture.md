# AADSS — System Architecture

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
│  Next.js App Router (RSC + Client Components)           │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────────┐ │
│  │ Calendar     │ │ Daily Attend │ │ Semester Stats  │ │
│  │ Dashboard    │ │ Page         │ │ + Simulation    │ │
│  └──────────────┘ └──────────────┘ └─────────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │ Server Actions ("use server")
┌────────────────────────▼────────────────────────────────┐
│                   SERVER LAYER                          │
│  ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐  │
│  │ Auth        │ │ Attendance   │ │ Admin Actions   │  │
│  │ Service     │ │ Service      │ │                 │  │
│  └─────────────┘ └──────────────┘ └─────────────────┘  │
│  ┌──────────────────────────────────────────────────┐   │
│  │            INTELLIGENCE ENGINES                  │   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────────┐  │   │
│  │  │Validation │ │Analytics  │ │  Simulation   │  │   │
│  │  │Engine     │ │Engine     │ │  Engine       │  │   │
│  │  └───────────┘ └───────────┘ └───────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │ Supabase Client
┌────────────────────────▼────────────────────────────────┐
│                  DATA LAYER                             │
│  Supabase (PostgreSQL + Auth + Realtime)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │auth.users│ │ students │ │ subjects │ │attendance│  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Request Flow: Mark Attendance

```
1. Student opens Daily Attendance page (date=today)
   └── Server Component fetches profile
   └── Redirects if no profile

2. DailyAttendanceClient.tsx loads
   └── useEffect → getDailySchedule(date, semesterId, profileId)
        └── generateClassSessionsForDate() called first (idempotent)
        └── Fetch class_sessions for date
        └── Fetch existing attendance records
        └── Return ClassPeriod[] with status

3. Student taps "Present" button
   └── handleStatusChange() called
   └── Optimistic UI update (immediate)
   └── navigator.geolocation.getCurrentPosition()
   └── markAttendance(sessionId, profileId, 'present', location)
        └── Validation Pipeline:
             ├── validateDuplicateMark()     → ALREADY_MARKED?
             ├── validateAttendanceTiming()  → TIME_WINDOW_EXPIRED?
             └── validateGeofence()          → OUTSIDE_GEOFENCE?
        └── If all pass → supabase.from('attendance').upsert()
   └── If error → revert optimistic update + toast error
```

---

## Request Flow: Analytics Summary

```
getAnalyticsSummary(semesterId, studentProfileId, sessionId)
│
├── 1. Fetch subjects for semester
├── 2. PARALLEL:
│    ├── academic_sessions (end_date)
│    ├── timetable (weekly frequency per subject)
│    └── class_sessions (all non-scheduled)
│
├── 3. Calculate remainingClasses per subject:
│    weeks_remaining × weekly_frequency
│
├── 4. Fetch attendance records for student
│
├── 5. Per subject:
│    ├── calculateRiskScore()
│    ├── calculateClassesNeeded()
│    ├── calculateWeeklyTrend()
│    └── Build SubjectAnalytics object
│
├── 6. calculateSemesterProjection() per subject
├── 7. calculateDangerThreshold() per subject
├── 8. Calculate overall stats
└── 9. Return ExtendedAnalyticsSummary
```

---

## Module Dependency Map

```
app/[page]/page.tsx (Server Component)
    └── imports lib/attendance/*.ts (server actions)
              └── imports lib/supabase/server.ts
              └── imports lib/engines/**/*.ts (pure functions)

app/[page]/components/*Client.tsx ("use client")
    └── calls server actions directly (Server Actions transport)
    └── imports lib/supabase/client.ts (browser client)
```

---

## Supabase Client Usage Rules

```
lib/supabase/server.ts  → ONLY in:
  - Server Components (page.tsx, layout.tsx)
  - Server Actions ("use server" functions)
  - Never in "use client" components

lib/supabase/client.ts  → ONLY in:
  - "use client" components
  - Client-side event handlers
```

---

## Engine Architecture (Pure Functions)

All 3 engines use **pure functions** — no side effects, no DB calls:

```typescript
// Validation Engine
validateAttendanceTiming(date, time, window): ValidationResult
validateGeofence(studentLoc, classLoc, radius): ValidationResult
validateDuplicateMark(existingStatus): ValidationResult

// Analytics Engine
calculateRiskScore(attendance%, required%): { riskScore, riskLevel }
calculateClassesNeeded(total, present, required): number
calculateWeeklyTrend(records[]): WeeklyTrendPoint[]
calculateSemesterProjection(params): SemesterProjection
calculateDangerThreshold(subjectId, ...): DangerThreshold | null

// Simulation Engine
runSkipPlanner(sub): SkipPlannerResult
runRecoveryPlanner(sub, targetPct): RecoveryPlannerResult
runStreakSimulator(sub, streakN): StreakSimulatorResult
runWorstCase(sub): WorstCaseResult
runSimulation(subjects[], streakN, recoveryTarget): SimulationOutput
```

**Benefits of pure functions:**

- Easily unit testable
- No unexpected side effects
- Can run client-side for instant simulation
- Composable and reusable

---

## Admin vs Student Architecture

```
/admin/* routes
  └── app/admin/layout.tsx
       └── Checks user.user_metadata.role === 'admin'
       └── Shows AdminSidebar
       └── All admin data mutations via lib/admin/actions.ts

/app/* routes (student)
  └── middleware (proxy.ts) → checks student_profiles existence
  └── Redirects to /onboarding if no profile
  └── Student can only access their own data (future RLS)
```

---

## Middleware Flow (proxy.ts)

```
Request comes in
│
├── Admin routes (/admin/*)
│    ├── Not logged in → /admin/login
│    └── Not admin role → /login
│
├── Student routes
│    ├── Not logged in → /login
│    ├── Logged in + public route → /calendar-dashboard
│    └── Logged in + protected + no profile → /onboarding

Note: File is named proxy.ts but should be middleware.ts
```

---

## Known Architecture Issues

1. **`proxy.ts` naming** — Should be `middleware.ts` for Next.js to auto-detect
2. **No RLS policies** — Tables are open; RLS needs implementation
3. **Missing `credit_hours`** — Hardcoded to 3 in analytics
4. **No caching** — `getAnalyticsSummary` re-fetches on every page load
5. **`searchParams` async** — Next.js 16+ requires `await searchParams`
