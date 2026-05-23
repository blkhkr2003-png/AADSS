# AADSS — Security Design

---

## Authentication

### Provider

- **Supabase Auth** — Email/Password
- **JWT tokens** — Short-lived access tokens + refresh tokens
- **Cookie-based sessions** — HTTPOnly cookies via `@supabase/ssr`

### Session Management

```typescript
// Server-side session validation (every request via middleware)
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user) redirect("/login");
```

### Role-Based Access Control

```typescript
// Admin check
if (user.user_metadata?.role !== "admin") {
  redirect("/login"); // or '/admin/login'
}
```

**Roles:**

- `student` (default) — no metadata role set
- `admin` — `user_metadata.role = 'admin'`

**Admin account creation:** Only via Supabase dashboard/SQL (no self-registration for admin).

---

## Authorization

### Current State (⚠️ INCOMPLETE)

RLS is NOT yet implemented. All tables are currently accessible to any authenticated user.

### Required RLS Policies

```sql
-- ─── student_profiles ──────────────────────────────────────────
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

-- Students can only read/update their own profile
CREATE POLICY "student_own_profile" ON student_profiles
  FOR ALL USING (user_id = auth.uid());

-- Admins can read all (use service_role key from server)

-- ─── attendance ────────────────────────────────────────────────
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Students can only see/insert their own attendance
CREATE POLICY "student_own_attendance" ON attendance
  FOR ALL USING (
    student_id IN (
      SELECT id FROM student_profiles WHERE user_id = auth.uid()
    )
  );

-- ─── subjects / timetable / class_sessions ─────────────────────
-- These are read-only for students (admin writes via service_role)
CREATE POLICY "students_read_subjects" ON subjects
  FOR SELECT USING (true);  -- any authenticated user can read

CREATE POLICY "students_read_timetable" ON timetable
  FOR SELECT USING (true);

CREATE POLICY "students_read_sessions" ON class_sessions
  FOR SELECT USING (true);

-- ─── notes ─────────────────────────────────────────────────────
CREATE POLICY "student_own_notes" ON notes
  FOR ALL USING (
    student_id IN (
      SELECT id FROM student_profiles WHERE user_id = auth.uid()
    )
  );
```

---

## Attendance Validation Security

### Why server-side validation only?

Client sends: `{ sessionId, status, location? }`
Server validates:

1. Session exists and belongs to student's semester
2. Time window hasn't expired
3. Student is within geo-fence
4. Not already marked as present

**Never trust client-side validation.** The validation functions in `lib/engines/validation/` are called from `markAttendance.ts` (server action), never from client.

### Anti-spoofing Measures

**Time Spoofing:** Server uses `new Date()` — client-provided time is ignored.

```typescript
// validateAttendanceTiming.ts
const now = new Date(); // Server time, not client time
```

**Location Spoofing:** Cannot fully prevent. Mitigations:

- Server logs lat/lon with each present mark
- Accuracy > 100m → soft pass but logged
- Admins can audit suspicious patterns

**Session ID Manipulation:** Session IDs are UUIDs. Even if guessed:

- `validateDuplicateMark` prevents marking twice
- Sessions only valid for student's semester subjects

---

## Data Privacy

### What We Store

- Student email (via Supabase Auth)
- Attendance records with GPS coordinates
- No biometric data, no photos

### GPS Data Policy

- Coordinates stored only when marking `present`
- Only accessible to student and admin (via RLS)
- Used for audit trail, not shared externally

### Sensitive Data Handling

```typescript
// Never log sensitive data
// console.error("Login error:", error)  // ← Good: no user data
```

---

## Input Validation

### Server Actions

All inputs validated before DB operations:

```typescript
// Admin actions
if (!form.subject_id || !form.start_time || !form.end_time) {
  toast.error("All fields required");
  return;
}
```

### Type Safety

TypeScript strict mode catches most type mismatches at compile time.

### SQL Injection

Supabase client uses parameterized queries — no raw SQL in application code.

---

## Environment Security

### Required Env Vars

```env
NEXT_PUBLIC_SUPABASE_URL        # Safe to expose (public)
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Safe to expose (limited permissions)
# SUPABASE_SERVICE_ROLE_KEY     # NEVER expose (bypasses RLS)
```

### Admin Operations

Currently use `anon_key` (same as students).

**TODO:** Admin mutations should use `service_role_key` on server-only routes:

```typescript
// For admin-only mutations
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only
);
```

---

## Security Checklist

| Item                                 | Status                                  |
| ------------------------------------ | --------------------------------------- |
| Auth required for all student routes | ✅ Done (middleware)                    |
| Auth required for all admin routes   | ✅ Done (middleware)                    |
| Role check for admin operations      | ✅ Done                                 |
| Time validation for attendance       | ✅ Done                                 |
| Geo-fence validation                 | ✅ Done                                 |
| Duplicate attendance prevention      | ✅ Done                                 |
| RLS on all tables                    | ❌ Not implemented                      |
| Service role for admin DB ops        | ❌ Not implemented                      |
| CORS configuration                   | ✅ Handled by Supabase                  |
| Rate limiting (attendance marking)   | ❌ Not implemented                      |
| HTTPS enforcement                    | ✅ Vercel/hosting layer                 |
| XSS prevention                       | ✅ React escapes by default             |
| CSRF protection                      | ✅ Server Actions use same-origin check |

---

## Known Vulnerabilities (To Fix)

1. **No RLS** — Any authenticated user can read all attendance data
2. **Admin uses anon key** — Admin mutations should use service role
3. **No rate limiting** — Could spam attendance marks
4. **Middleware file named wrong** — `proxy.ts` instead of `middleware.ts`
