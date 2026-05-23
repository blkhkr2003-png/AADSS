# AADSS — Feature Specification

---

## ENGINE 1: Validation Engine (Reality Layer)

Ensures attendance data is trustworthy before persistence.

### 1.1 Time Window Validation

- **Rule:** Student can only mark `present` within ±10 minutes of class start time
- **File:** `lib/engines/validation/validateAttendanceTiming.ts`
- **Logic:** `now >= classStart AND now <= classStart + 10min`
- **Error:** `TIME_WINDOW_EXPIRED`
- **Bypass:** Admin can override (future feature)

### 1.2 Geo-fence Validation

- **Rule:** Student must be within `allowed_radius` meters of classroom coordinates
- **File:** `lib/engines/validation/validateGeofence.ts`
- **Algorithm:** Haversine formula for curved-earth distance
- **Soft Pass:** If GPS accuracy > 100m → pass with warning log
- **Effective Radius:** `allowed_radius + GPS_accuracy` (buffer)
- **Error:** `OUTSIDE_GEOFENCE`

### 1.3 Duplicate Mark Prevention

- **Rule:** Once `present` is recorded, cannot re-mark
- **File:** `lib/engines/validation/validateDuplicateMark.ts`
- **Absent/Cancelled:** Can override (no duplicate check)
- **Error:** `ALREADY_MARKED`

### 1.4 Session Existence Check

- **Rule:** Class session must exist in DB before marking
- **Error:** `SESSION_NOT_FOUND`

---

## ENGINE 2: Analytics Engine (Current State)

### 2.1 Risk Score Calculator

- **File:** `lib/engines/analytics/calculateRiskScore.ts`
- **Scale:** 0–100 (higher = more risk)
- **Zones:**
  - Safe (0–30): `attendance >= required`
  - Warning (31–69): `65% <= attendance < required`
  - Danger (70–100): `attendance < 65%`

### 2.2 Classes Needed Calculator

- **File:** `lib/engines/analytics/calculateClassesNeeded.ts`
- **Formula:** `ceil((r * total - present) / (1 - r))`
- **Returns:** 0 if already safe

### 2.3 Weekly Trend Calculator

- **File:** `lib/engines/analytics/calculateWeeklyTrend.ts`
- **Window:** Last 4 weeks (Monday–Sunday)
- **Output:** Array of `{ weekLabel, weekStart, attendancePercentage }`
- **Excludes:** Cancelled classes from calculation

### 2.4 Semester Projection

- **File:** `lib/engines/analytics/calculateSemesterProjection.ts`
- **Logic:** Project final % if student maintains current attendance rate
- **Inputs:** `remainingClasses` from timetable × weeks remaining
- **Trend Detection:** Compares recent 2 weeks vs older 2 weeks (±5% threshold)

### 2.5 Danger Threshold Calculator

- **File:** `lib/engines/analytics/calculateDangerThreshold.ts`
- **Purpose:** "How many more classes can I miss before crossing danger line?"
- **Formula:** `ceil((present - r * total) / r)`
- **Only for safe subjects** (already below threshold = returns null)

### 2.6 Main Analytics Summary

- **File:** `lib/engines/analytics/getAnalyticsSummary.ts`
- **Parallel fetches:** subjects, sessions, timetable, academic session dates
- **Output:** `ExtendedAnalyticsSummary` with projections + danger thresholds

---

## ENGINE 3: Simulation Engine (Future Prediction)

### 3.1 Skip Planner

- **File:** `lib/engines/simulation/runSkipPlanner.ts`
- **Question:** "What happens if I skip 1 class?"
- **Output:** `afterSkipPct`, `isSafe`, `wouldDropBelow`

### 3.2 Recovery Planner

- **File:** `lib/engines/simulation/runRecoveryPlanner.ts`
- **Question:** "How many consecutive classes must I attend to reach X%?"
- **Formula:** Algebraic solve for consecutive present count
- **Output:** `classesNeeded`, `isPossible`, `classesShortBy`

### 3.3 Streak Simulator

- **File:** `lib/engines/simulation/runStreakSimulator.ts`
- **Question:** "If I attend next N classes, where will I be?"
- **User Input:** Slider 1–30
- **Output:** `projectedPct`, `willReachTarget`

### 3.4 Worst Case Analyzer

- **File:** `lib/engines/simulation/runWorstCase.ts`
- **Question:** "Maximum classes I can skip and stay above threshold?"
- **Formula:** `floor(present/r - total)`, capped at remaining classes
- **Output:** `maxSkipsAllowed`, `alreadyBreach`

---

## FEATURE: Auto Class Session Generation

- **File:** `lib/attendance/generateClassSessions.ts`
- **Trigger:** When student visits daily attendance for a date
- **Logic:**
  1. Check if sessions already exist for date
  2. Get day_of_week from date
  3. Fetch timetable slots matching that day + semester
  4. Insert class_sessions for each slot
- **Idempotent:** Won't duplicate if called multiple times

---

## FEATURE: Calendar Dashboard

- **Year-view:** All 12 months visible, attendance dots per day
- **Color coding:** Green (≥75%), Yellow (70–74%), Red (<70%)
- **Weekend detection:** Saturday/Sunday shown differently
- **Click to navigate:** Clicking a date goes to daily attendance for that date
- **Semester bounds:** Non-semester days shown as inactive

---

## FEATURE: Admin Class Session Management

- **Cancel class:** Changes status to `cancelled`
- **Restore class:** Reverts `cancelled` → `scheduled`
- **Reschedule:** Change date/time of a session
- **Date filter:** View sessions by any date

---

## UPCOMING FEATURES (Phase 2)

### Notification System

- Trigger: When subject drops below `min_attendance_required - 5%`
- Channel: Browser push notification + in-app badge
- Frequency: Once per day max per subject

### Attendance Correction Flow

1. Student submits correction request with reason
2. Admin reviews in dashboard
3. Admin approves/rejects
4. DB updated + student notified

### Bulk Timetable Import

- CSV format: `subject_name, day, start_time, end_time, room`
- Validation before insert
- Error reporting per row
