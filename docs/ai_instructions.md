# AADSS — AI Agent Instructions

> This file is the primary context document for AI coding assistants working on AADSS.
> Read this BEFORE writing any code.

---

## Project Identity

- **Name:** AADSS — Academic Attendance Decision Support System
- **Language:** Hinglish (Hindi + English) — code in English, comments/explanations in Hinglish
- **Stack:** Next.js 16 (App Router) + TypeScript (strict) + Supabase + Tailwind v4
- **Repo:** https://github.com/dipexplorer/AADSS
- **Phase:** MVP built, moving to Phase 2

---

## Core Architecture (Memorize This)

### Three Engines

```
1. Validation Engine  → lib/engines/validation/
   Pure functions. Check timing, geo-fence, duplicates.
   Called from markAttendance.ts ONLY.

2. Analytics Engine   → lib/engines/analytics/
   Pure functions. Calculate risk, trends, projections.
   Called from getAnalyticsSummary.ts (server action).

3. Simulation Engine  → lib/engines/simulation/
   Pure functions. What-if scenarios.
   runSimulation() called client-side (useMemo).
```

### Server vs Client Split

```
Server Components (page.tsx):     Fetch data, no state
Server Actions ("use server"):    DB mutations, validation
Client Components (*Client.tsx):  UI state, user interactions

Rule: NEVER import supabase/server.ts in "use client" components
Rule: NEVER do DB calls in client components — use server actions
```

### Supabase Client Usage

```typescript
// Server context → lib/supabase/server.ts
import { createClient } from "@/lib/supabase/server";

// Client context → lib/supabase/client.ts
import { createClient } from "@/lib/supabase/client";
```

---

## File Structure Rules

```
app/[route]/page.tsx                → Server Component only
app/[route]/components/XClient.tsx  → "use client" only
lib/engines/*/                      → Pure functions (no DB)
lib/attendance/                     → DB operations (server)
lib/admin/actions.ts                → Admin mutations (server)
server/auth/                        → Auth server actions
```

---

## Coding Standards

### TypeScript

```typescript
// ✅ Explicit types always
function calculateRiskScore(
  attendancePercentage: number,
  requiredPercentage: number,
): { riskScore: number; riskLevel: "safe" | "warning" | "danger" };

// ❌ Never use 'any'
// ❌ No non-null assertion (!) unless absolutely certain
```

### Error Handling

```typescript
// ✅ Always return error objects, never throw in server actions
return { data: null, error: error.message }

// ✅ Check errors before using data
const { data, error } = await someServerAction()
if (error) return <ErrorState />
```

### Database Queries

```typescript
// ✅ Parallel queries when possible
const [result1, result2] = await Promise.all([
  supabase.from("table1").select("..."),
  supabase.from("table2").select("..."),
]);

// ✅ Always check error
const { data, error } = await supabase.from("...").select();
if (error) return { data: null, error: error.message };
```

### UI Components

```typescript
// ✅ Use existing color system
className = "text-green-600 bg-green-50 dark:bg-green-950/20"; // safe
className = "text-yellow-600 bg-yellow-50"; // warning
className = "text-red-600 bg-red-50"; // danger

// ✅ Card pattern
className =
  "bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6";

// ✅ Muted label
className =
  "text-xs uppercase tracking-wider font-semibold text-muted-foreground";
```

---

## Known Bugs (Fix Before Adding Features)

### 1. Middleware Not Loaded

**File:** `proxy.ts` (root) must be renamed to `middleware.ts`

```bash
mv proxy.ts middleware.ts
```

### 2. searchParams Async (Next.js 16)

```typescript
// ❌ Current (broken in Next.js 16)
export default async function Page({ searchParams }: { searchParams: { date?: string } }) {
  const date = searchParams.date

// ✅ Fix
export default async function Page({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams
```

**Affected files:** `app/admin/classes/page.tsx`, `app/daily-attendance/page.tsx`

### 3. Missing credit_hours Column

```typescript
// Current workaround in getAnalyticsSummary.ts
creditHours: 3, // Default value since column is missing in schema
```

**Fix:** `ALTER TABLE subjects ADD COLUMN credit_hours INT DEFAULT 3;`

### 4. No RLS Policies

Tables are open to all authenticated users. See `security.md` for policies.

### 5. React.SubmitEvent Type

```typescript
// ❌ Incorrect type (causes TS error)
async function handleLogin(e: React.SubmitEvent);

// ✅ Correct
async function handleLogin(e: React.FormEvent<HTMLFormElement>);
```

**Affected:** `app/login/page.tsx`, `app/register/page.tsx`, `app/onboarding/page.tsx`, `app/admin/login/page.tsx`

---

## Current Project Phase

### ✅ Phase 1 (Complete)

- Auth (login/register/logout)
- Onboarding
- Admin panel (CRUD for sessions/programs/subjects/timetable/classes)
- Daily attendance marking with validation
- Calendar dashboard
- Semester statistics + analytics
- Simulation engine UI

### 🚧 Phase 2 (Current - TODO)

1. Fix all known bugs above
2. Implement RLS policies
3. Subject-wise class history view
4. Push notification system (when attendance drops below threshold)
5. Attendance correction request flow
6. PDF/CSV export for statistics
7. Recharts integration for visual analytics

### 📅 Phase 3 (Future)

- Bulk CSV import for timetable
- Multi-semester history
- Parent view portal
- Biometric/QR attendance option

---

## How to Add a New Feature

### Step 1: Data layer (if DB changes needed)

```sql
-- Add to db/supabase-schema.sql
-- Run in Supabase dashboard
-- Regenerate types: npx supabase gen types typescript...
```

### Step 2: Server action

```typescript
// lib/attendance/newFeature.ts or lib/admin/actions.ts
"use server";
import { createClient } from "@/lib/supabase/server";

export async function newAction(params): Promise<{ data; error }> {
  const supabase = createClient();
  // ... logic
}
```

### Step 3: Page (Server Component)

```typescript
// app/new-route/page.tsx
import { getStudentProfile } from '@/lib/attendance/getStudentProfile'
import { redirect } from 'next/navigation'

export default async function NewPage() {
  // Auth check
  const { data: profile } = await getStudentProfile()
  if (!profile) redirect('/onboarding')

  // Fetch data
  const data = await newAction(profile.semester_id, profile.id)

  // Pass to client
  return <NewPageClient data={data} />
}
```

### Step 4: Client Component

```typescript
// app/new-route/components/NewPageClient.tsx
"use client";
import { useState } from "react";

export default function NewPageClient({ data }) {
  // UI state only
  // Call server actions for mutations
}
```

---

## Do NOT Do These

```typescript
// ❌ Don't call server action in useEffect for data fetching
// Use RSC (Server Component) for initial data fetch

// ❌ Don't put DB logic in "use client" components
// All DB calls → server actions

// ❌ Don't create new routes without auth check
// Always check getStudentProfile() or supabase.auth.getUser()

// ❌ Don't skip error handling
// Every DB call must check for error

// ❌ Don't use inline styles
// Use Tailwind classes

// ❌ Don't break existing patterns
// Follow the established file structure and naming
```

---

## When AI Gets Confused

1. **"Where should I put this logic?"** → Is it a DB query? → `lib/attendance/` or `lib/admin/`. Is it a calculation? → `lib/engines/`. Is it UI? → `app/[route]/components/`.

2. **"Server or client component?"** → Does it need useState/useEffect/event handlers? → Client. Does it just fetch and display? → Server.

3. **"Which Supabase client?"** → Is it in a file with "use server" or in page.tsx? → `lib/supabase/server.ts`. Is it in "use client"? → `lib/supabase/client.ts`.

4. **"How to add to analytics?"** → Pure calculation function in `lib/engines/analytics/calculateXyz.ts`. Call it from `getAnalyticsSummary.ts`. Add to return type.

---

## Response Format for This Project

Always structure responses as:

```
🎯 Goal — what we're achieving
🧠 Concept — short explanation
⚙️ Steps — exact actions
📁 Files — which files to create/edit
💻 Code — production-ready
✅ Validation — how to verify it works
🚀 Next Step — one line preview
```
