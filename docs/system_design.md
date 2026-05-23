# AADSS — System Design

---

## Core Design Principles

1. **Correctness over speed** — Attendance data must be trustworthy; validation never shortcuts
2. **Server-first** — Sensitive logic (validation, DB writes) always server-side
3. **Optimistic UI** — Mark attendance shows instantly, reverts on failure
4. **Pure functions for engines** — Analytics/simulation logic is stateless and testable
5. **Fail loud** — Validation errors surface to user with actionable messages

---

## Attendance Marking State Machine

```
Class Session States:
  scheduled → completed (auto on day end, future feature)
  scheduled → cancelled (admin action)
  cancelled → scheduled (admin restore)

Student Attendance States (per session):
  null → present   (validation required)
  null → absent    (no validation)
  null → cancelled (sync with session status)
  present → null   (clearAttendance)
  absent → null    (clearAttendance)
```

---

## Concurrency & Race Conditions

### Duplicate Mark Prevention

```sql
UNIQUE(student_id, class_session_id)  -- DB level
```

Plus `validateDuplicateMark()` at application level.

### Upsert Pattern

```typescript
supabase
  .from("attendance")
  .upsert(
    { student_id, class_session_id, status },
    { onConflict: "student_id,class_session_id" },
  );
```

**Why upsert not insert:** Allows student to change absent → present if within time window.

---

## Class Session Generation Design

**Problem:** We need class sessions in DB before attendance can be recorded, but creating all sessions upfront (for entire semester) would create ~500+ rows per student on onboarding.

**Solution:** Lazy generation — sessions created on first access of a date.

```typescript
// getDailySchedule.ts
await generateClassSessionsForDate(date, semesterId);
// Then fetch sessions for that date
```

**Idempotency check:**

```typescript
const { data: existing } = await supabase
  .from("class_sessions")
  .select("id")
  .eq("date", date)
  .limit(1);

if (existing?.length > 0) return { generated: 0, error: null };
```

---

## Analytics Calculation Design

### Why calculate on server, not store in DB?

**Option A (stored):** Pre-calculate and cache in DB

- Pros: Fast reads
- Cons: Stale data, complex cache invalidation, extra storage

**Option B (calculated, current approach):** Calculate fresh on each request

- Pros: Always accurate, no sync issues
- Cons: Slightly slower (multiple DB queries)

**Decision:** Option B for now. With proper indexes, queries are fast. Can add Redis caching in Phase 3 if needed.

### Parallel Query Pattern

```typescript
const [
  { data: sessionData },
  { data: timetableData },
  { data: sessions, error: sessionsError },
] = await Promise.all([
  supabase
    .from("academic_sessions")
    .select("end_date")
    .eq("id", sessionId)
    .single(),
  supabase
    .from("timetable")
    .select("subject_id, day_of_week")
    .in("subject_id", subjectIds),
  supabase
    .from("class_sessions")
    .select("id, subject_id, status, date")
    .in("subject_id", subjectIds)
    .neq("status", "scheduled"),
]);
```

**Result:** 3 queries run in parallel instead of sequential (~3x faster).

---

## Simulation Engine Design

**Key insight:** Simulation runs entirely on client (no DB calls).

```typescript
// SimulateClient.tsx
const simulation = useMemo(
  () => runSimulation(subjects, streakN, recoveryTarget),
  [subjects, streakN, recoveryTarget],
);
```

**Why:**

- Instant response to slider/input changes
- No server round-trip for "what-if" calculations
- `subjects` data is fetched once from server (SSR)

---

## Risk Scoring Design

```
Risk Score 0-100:

SAFE ZONE (0-30)
  attendance >= required
  Score = 30 * (1 - margin/maxMargin)
  → More buffer = lower score

WARNING ZONE (31-69)
  65% <= attendance < required
  Score = 31 + 38 * (gap / range)
  → Closer to danger = higher score

DANGER ZONE (70-100)
  attendance < 65%
  Score = 70 + 30 * (1 - attendance/65)
  → Lower attendance = higher score
```

**Why 65% as danger threshold (not required%)?**

- Provides a secondary warning layer
- Even if required% is 75%, dropping to 65% = danger regardless
- Gives students time to act before reaching the hard threshold

---

## Remaining Classes Calculation Design

```typescript
// From timetable frequency × weeks remaining
const daysRemaining = Math.max(
  0,
  Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
);
const weeksRemaining = daysRemaining / 7;

const weeklyClasses = timetableData.filter(
  (t) => t.subject_id === subjectId,
).length;
const remaining = Math.floor(weeksRemaining * weeklyClasses);
```

**Caveat:** Assumes no holidays/cancellations. This is intentional — worse case estimate.

---

## Calendar Attendance Dots Design

```
For each day in calendar:
  1. Fetch attendance records for all dates in month (single query)
  2. Group by date
  3. Calculate: attended / (attended + missed) for each date
  4. Color: green (≥75%), yellow (70-74%), red (<70%)
  5. Dot shows for non-weekend, in-semester days only
```

**Optimization:** Fetch entire month in one query, not per-day.

---

## Authentication Design

### Role-Based Access

```typescript
user.user_metadata.role === "admin"; // Set during user creation
```

**Admin creation:** Manual via Supabase dashboard or SQL:

```sql
UPDATE auth.users
SET raw_user_meta_data = '{"role": "admin"}'
WHERE email = 'admin@college.edu';
```

### Session Handling

- Supabase handles JWT refresh automatically via `@supabase/ssr`
- Cookie-based sessions (not localStorage) — works with SSR
- `proxy.ts` (middleware) validates session on every request

---

## Geofence Design

### Haversine Formula

```
a = sin²(Δlat/2) + cos(lat1)·cos(lat2)·sin²(Δlon/2)
distance = 2R · atan2(√a, √(1-a))
```

### GPS Accuracy Buffer

```typescript
const effectiveRadius = allowedRadius + studentLocation.accuracy;
// If accuracy = 20m and allowedRadius = 100m
// Student must be within 120m (generous for GPS drift)
```

### Soft Pass for Poor GPS

```typescript
if (studentLocation.accuracy > 100) {
  // GPS too inaccurate to enforce — pass but log
  console.warn(`Poor GPS accuracy: ${accuracy}m — soft pass`);
  return { valid: true };
}
```

---

## Data Flow for Semester Statistics Page

```
SSR (page.tsx):
  1. getStudentProfile() → profile with session/program/semester
  2. getAnalyticsSummary(semesterId, profileId, sessionId)
     → subjects[], overall, projections[], dangerThresholds[]
  3. Pass to SemesterStatisticsClient as props

CSR (SemesterStatisticsClient.tsx):
  4. Filter by riskLevel (all/safe/warning/danger)
  5. Sort by percentage/name/attended/missed
  6. Render SubjectCard grid
  7. IntelligencePanel shows projection/trajectory/recovery tabs
```

**All computation happens at step 2 on server.** Client only handles UI state (filter/sort).
