# AADSS — Server Actions & Data Layer API

> Note: AADSS uses Next.js Server Actions instead of REST API routes.
> All "API calls" are direct TypeScript function imports with `"use server"` directive.

---

## Auth Actions

### `login(email, password)`

**File:** `server/auth/login.ts`

```typescript
login(email: string, password: string): Promise<{ success?: true, error?: string }>
```

### `register(email, password)`

**File:** `server/auth/register.ts`

```typescript
register(email: string, password: string): Promise<{ success?: true, error?: string }>
```

### `logout()`

**File:** `server/auth/logout.ts`

```typescript
logout(): Promise<void>
```

### `createProfile(sessionId, programId, semesterId)`

**File:** `server/auth/completeProfile.ts`

```typescript
createProfile(
  sessionId: string,
  programId: string,
  semesterId: string
): Promise<{ success?: true, error?: string }>
```

---

## Student Profile

### `getStudentProfile()`

**File:** `lib/attendance/getStudentProfile.ts`

```typescript
getStudentProfile(): Promise<{
  data: {
    id: string
    user_id: string
    session_id: string
    program_id: string
    semester_id: string
    academic_sessions: { id, name, start_date, end_date } | null
    programs: { id, name } | null
    semesters: { id, semester_number } | null
  } | null
  error: string | null
}>
```

---

## Attendance

### `getDailySchedule(date, semesterId, studentProfileId)`

**File:** `lib/attendance/getDailySchedule.ts`

```typescript
getDailySchedule(
  date: string,          // YYYY-MM-DD
  semesterId: string,
  studentProfileId: string
): Promise<{
  data: ClassPeriod[] | null
  error: string | null
}>

interface ClassPeriod {
  sessionId: string
  subjectId: string | null
  subjectName: string
  startTime: string     // "HH:MM:SS"
  endTime: string
  room: string | null
  status: 'scheduled' | 'completed' | 'cancelled'
  attendanceStatus: 'present' | 'absent' | 'cancelled' | null
}
```

### `markAttendance(sessionId, studentProfileId, status, location?)`

**File:** `lib/attendance/markAttendance.ts`

```typescript
markAttendance(
  sessionId: string,
  studentProfileId: string,
  status: 'present' | 'absent' | 'cancelled',
  location?: GeoLocation
): Promise<{
  error: string | null
  validationError?: 'TIME_WINDOW_EXPIRED' | 'OUTSIDE_GEOFENCE' |
                    'ALREADY_MARKED' | 'LOCATION_UNAVAILABLE' | 'SESSION_NOT_FOUND'
}>

interface GeoLocation {
  latitude: number
  longitude: number
  accuracy: number  // meters
}
```

**Validation flow (present only):**

1. Fetch session + timetable details
2. `validateDuplicateMark()` → `ALREADY_MARKED`?
3. `validateAttendanceTiming()` → `TIME_WINDOW_EXPIRED`?
4. `validateGeofence()` (if classroom coords exist) → `OUTSIDE_GEOFENCE`?
5. Upsert to `attendance` table

### `clearAttendance(sessionId, studentProfileId)`

**File:** `lib/attendance/markAttendance.ts`

```typescript
clearAttendance(
  sessionId: string,
  studentProfileId: string
): Promise<{ error: string | null }>
```

### `getSubjectsWithStats(semesterId, studentProfileId)`

**File:** `lib/attendance/getSubjectsWithStats.ts`

```typescript
getSubjectsWithStats(
  semesterId: string,
  studentProfileId: string
): Promise<{
  data: SubjectWithStats[] | null
  error: string | null
}>

interface SubjectWithStats {
  id: string
  name: string
  minAttendanceRequired: number
  totalClasses: number
  attendedClasses: number
  missedClasses: number
  attendancePercentage: number
  status: 'safe' | 'warning' | 'danger'
  requiredClasses: number  // 0 if already safe
}
```

### `getAttendanceByDates(studentProfileId, semesterId, dates[])`

**File:** `lib/attendance/getAttendanceByDates.ts`

```typescript
getAttendanceByDates(
  studentProfileId: string,
  semesterId: string,
  dates: string[]    // YYYY-MM-DD[]
): Promise<Record<string, { attended: number, missed: number, cancelled: number }>>
```

### `getOverallAttendanceStats(semesterId, studentProfileId)`

**File:** `lib/attendance/getOverallStats.ts`

```typescript
getOverallAttendanceStats(
  semesterId: string,
  studentProfileId: string
): Promise<{
  percentage: number
  attended: number
  total: number
  error: string | null
}>
```

---

## Analytics Engine

### `getAnalyticsSummary(semesterId, studentProfileId, sessionId)`

**File:** `lib/engines/analytics/getAnalyticsSummary.ts`

```typescript
getAnalyticsSummary(
  semesterId: string,
  studentProfileId: string,
  sessionId: string
): Promise<{
  data: ExtendedAnalyticsSummary | null
  error: string | null
}>

interface ExtendedAnalyticsSummary {
  subjects: SubjectAnalytics[]
  overall: OverallAnalytics
  projections: SemesterProjection[]
  dangerThresholds: DangerThreshold[]
  computedAt: string   // ISO timestamp
}
```

---

## Simulation Engine

### `getSimulationData(semesterId, studentProfileId, sessionId)`

**File:** `lib/engines/simulation/getSimulationData.ts`

```typescript
getSimulationData(
  semesterId: string,
  studentProfileId: string,
  sessionId: string
): Promise<SubjectSimInput[]>

interface SubjectSimInput {
  subjectId: string
  name: string
  present: number
  absent: number
  cancelled: number
  totalClasses: number        // present + absent
  remainingClasses: number    // estimated
  minAttendanceRequired: number
}
```

### `runSimulation(subjects, streakN, recoveryTargetPct)` (Client-side)

**File:** `lib/engines/simulation/runSimulation.ts`

```typescript
runSimulation(
  subjects: SubjectSimInput[],
  streakN: number,           // for streak simulator
  recoveryTargetPct: number  // for recovery planner
): SimulationOutput

interface SimulationOutput {
  subjects: SubjectSimulationResult[]
  streakN: number
  recoveryTargetPct: number
}
```

---

## Admin Actions

### Session Management

```typescript
createSession(data: { name, start_date, end_date }): Promise<Result>
updateSession(id, data): Promise<Result>
deleteSession(id): Promise<Result>
```

### Program & Semester

```typescript
createProgram(name: string): Promise<Result>
deleteProgram(id: string): Promise<Result>
createSemester(program_id, semester_number): Promise<Result>
deleteSemester(id: string): Promise<Result>
```

### Subjects

```typescript
createSubject(data: { semester_id, name, min_attendance_required? }): Promise<Result>
updateSubject(id, data: { name?, min_attendance_required? }): Promise<Result>
deleteSubject(id: string): Promise<Result>
```

### Timetable

```typescript
createTimetableSlot(data: {
  subject_id, day_of_week, start_time, end_time,
  room?, latitude?, longitude?, allowed_radius?
}): Promise<Result>
updateTimetableSlot(id, data): Promise<Result>
deleteTimetableSlot(id: string): Promise<Result>
```

### Class Sessions

```typescript
updateClassSessionStatus(id, status: 'scheduled'|'cancelled'|'completed'): Promise<Result>
rescheduleClassSession(id, data: { date, start_time, end_time }): Promise<Result>
```

```typescript
// Common result type
type Result = { success: true } | { error: string };
```

---

## Error Handling Pattern

```typescript
// Server actions return { error } or { data }
const { data, error } = await getAnalyticsSummary(...)
if (error) return <ErrorState message={error} />

// In client components
const result = await markAttendance(...)
if (result.error) {
  toast.error(result.error)
  // revert optimistic update
}
```
