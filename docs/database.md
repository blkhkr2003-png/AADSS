# AADSS — Database Design

---

## Overview

- **Database:** PostgreSQL 14.4 via Supabase
- **Auth:** Supabase Auth (users stored in `auth.users`)
- **ORM:** Supabase JS client (type-safe via generated `types/supabase.ts`)
- **Security:** Row Level Security (RLS) on all tables

---

## Schema

### `academic_sessions`

Represents an academic year (e.g., "2025-2026")

```sql
CREATE TABLE academic_sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,           -- "2025-2026"
  start_date  DATE,
  end_date    DATE
);
```

### `programs`

Degree programs (e.g., "B.Tech CSE")

```sql
CREATE TABLE programs (
  id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name  TEXT NOT NULL
);
```

### `semesters`

Semesters within a program

```sql
CREATE TABLE semesters (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id       UUID REFERENCES programs(id) ON DELETE CASCADE,
  semester_number  INT NOT NULL
);
```

### `student_profiles`

Links auth user to their academic placement

```sql
CREATE TABLE student_profiles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id  UUID NOT NULL REFERENCES academic_sessions(id),
  program_id  UUID NOT NULL REFERENCES programs(id),
  semester_id UUID NOT NULL REFERENCES semesters(id),
  created_at  TIMESTAMP DEFAULT NOW()
);
```

### `subjects`

Subjects under a semester

```sql
CREATE TABLE subjects (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  semester_id             UUID NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  min_attendance_required INT DEFAULT 75,
  created_at              TIMESTAMP DEFAULT NOW()
);
```

### `timetable`

Weekly recurring class schedule (template)

```sql
CREATE TABLE timetable (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id      UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  day_of_week     INT NOT NULL,   -- 0=Sunday, 1=Monday...6=Saturday
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL CHECK (end_time > start_time),
  room            TEXT,
  latitude        DOUBLE PRECISION,   -- classroom GPS
  longitude       DOUBLE PRECISION,
  allowed_radius  INT DEFAULT 50,     -- meters
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### `class_sessions`

Actual instances of classes (generated from timetable)

```sql
CREATE TABLE class_sessions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timetable_id UUID REFERENCES timetable(id) ON DELETE CASCADE,
  subject_id   UUID REFERENCES subjects(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  status       TEXT CHECK (status IN ('scheduled', 'cancelled', 'completed'))
               DEFAULT 'scheduled',
  created_at   TIMESTAMP DEFAULT NOW()
);
```

### `attendance`

Student attendance per class session

```sql
CREATE TABLE attendance (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  class_session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  status           TEXT NOT NULL CHECK (status IN ('present', 'absent', 'cancelled')),
  marked_at        TIMESTAMP DEFAULT NOW(),
  latitude         DOUBLE PRECISION,   -- student's location when marked
  longitude        DOUBLE PRECISION,
  UNIQUE(student_id, class_session_id)   -- prevent duplicates
);
```

### `notes`

Student notes per day (future feature)

```sql
CREATE TABLE notes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  content    JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Indexes

```sql
CREATE INDEX idx_attendance_student   ON attendance(student_id);
CREATE INDEX idx_attendance_session   ON attendance(class_session_id);
CREATE INDEX idx_class_sessions_date  ON class_sessions(date);
-- Recommended to add:
CREATE INDEX idx_subjects_semester    ON subjects(semester_id);
CREATE INDEX idx_timetable_subject    ON timetable(subject_id);
CREATE INDEX idx_timetable_day        ON timetable(day_of_week);
```

---

## Entity Relationships

```
academic_sessions
    ↑
student_profiles → programs → semesters → subjects → timetable
                                                          ↓
                                                    class_sessions
                                                          ↓
                                                      attendance
                                                    ↑
                                              student_profiles
```

---

## Key Query Patterns

### 1. Get student's daily schedule

```sql
SELECT cs.*, s.name as subject_name, t.room
FROM class_sessions cs
JOIN subjects s ON cs.subject_id = s.id
JOIN timetable t ON cs.timetable_id = t.id
WHERE cs.date = $1
AND cs.subject_id IN (
  SELECT id FROM subjects WHERE semester_id = $2
)
ORDER BY cs.start_time;
```

### 2. Get attendance for a student across sessions

```sql
SELECT a.class_session_id, a.status
FROM attendance a
WHERE a.student_id = $1
AND a.class_session_id = ANY($2::uuid[]);
```

### 3. Calculate attendance percentage (application-side)

```
present_count / non_cancelled_sessions * 100
```

### 4. Get remaining classes estimate

```
weeks_remaining = (end_date - today) / 7
weekly_frequency = COUNT(timetable WHERE subject_id = X)
remaining = FLOOR(weeks_remaining * weekly_frequency)
```

---

## Row Level Security Policies (To Implement)

```sql
-- Students can only see their own profiles
CREATE POLICY "student_own_profile"
ON student_profiles FOR ALL
USING (user_id = auth.uid());

-- Students can only see/insert their own attendance
CREATE POLICY "student_own_attendance"
ON attendance FOR ALL
USING (student_id IN (
  SELECT id FROM student_profiles WHERE user_id = auth.uid()
));

-- Admins bypass all RLS (use service role key)
```

---

---

## Supabase Type Generation

Types are auto-generated in `types/supabase.ts`. To regenerate:

```bash
npx supabase gen types typescript --project-id [YOUR_PROJECT_ID] > types/supabase.ts
```
