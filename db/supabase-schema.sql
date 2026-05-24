-- ACADEMIC STRUCTURE
create table academic_sessions (
  id uuid primary key default uuid_generate_v4(),
  name text not null, -- "2025-2026"
  start_date date,
  end_date date,
  status text check (status in ('active', 'inactive', 'archived')) default 'active'
);

-- Program table
create table programs (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references academic_sessions(id) on delete restrict,
  name text not null, -- "B.Tech CSE"
  status text check (status in ('active', 'inactive', 'archived')) default 'active'
);

-- Semester table
create table semesters (
  id uuid primary key default uuid_generate_v4(),
  program_id uuid references programs(id) on delete restrict,
  semester_number int not null,
  status text check (status in ('active', 'inactive', 'archived')) default 'active'
);

-- STUDENT PROFILE
create table student_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete restrict,
  session_id uuid not null references academic_sessions(id) on delete restrict,
  program_id uuid not null references programs(id) on delete restrict,
  semester_id uuid not null references semesters(id) on delete restrict,
  created_at timestamp default now()
);

-- SUBJECTS
create table subjects (
  id uuid primary key default uuid_generate_v4(),
  semester_id uuid not null references semesters(id) on delete restrict,
  name text not null,
  code text,
  credits int default 3,
  min_attendance_required int default 75,
  status text check (status in ('active', 'inactive', 'archived')) default 'active',
  created_at timestamp default now()
);

-- TIMETABLE
create table timetable (
  id uuid primary key default uuid_generate_v4(),
  subject_id uuid not null references subjects(id) on delete cascade,
  day_of_week int not null, -- 0=Sunday
  start_time time not null,
  end_time time not null check (end_time > start_time),
  room text,
  latitude double precision,
  longitude double precision,
  allowed_radius int default 50,
  created_at timestamp default now()
);

-- CLASS SESSIONS (GENERATED)
create table class_sessions (
  id uuid primary key default uuid_generate_v4(),
  timetable_id uuid references timetable(id) on delete cascade,
  subject_id uuid references subjects(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text check (status in ('scheduled','cancelled','completed')) default 'scheduled',
  created_at timestamp default now(),
  cancelled_by uuid references auth.users(id),
  cancelled_at timestamp with time zone
);

-- ATTENDANCE
create table attendance (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references student_profiles(id) on delete cascade,
  class_session_id uuid not null references class_sessions(id) on delete cascade,
  status text not null check (status in ('present', 'absent', 'cancelled')),
  marked_at timestamp default now(),
  latitude double precision,
  longitude double precision,
  overridden_by uuid references auth.users(id),
  override_reason text,
  unique(student_id, class_session_id)
);

-- NOTES
create table notes (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references student_profiles(id) on delete cascade,
  date date not null,
  content jsonb,
  created_at timestamp default now()
);

-- Indexes
create index idx_attendance_student on attendance(student_id);
create index idx_attendance_session on attendance(class_session_id);
create index idx_class_sessions_date on class_sessions(date);

-- RISK SCORES
create table risk_scores (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references student_profiles(id) on delete cascade,
  subject_id uuid references subjects(id) on delete cascade,
  risk_score int not null default 0,
  risk_level text not null default 'safe',
  classes_needed_to_recover int not null default 0,
  computed_at timestamp with time zone default now()
);

-- DEVICE RESET REQUESTS
create table device_reset_requests (
  id uuid primary key default uuid_generate_v4(),
  student_profile_id uuid not null references student_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  status text not null check (status in ('pending', 'approved', 'rejected', 'completed')) default 'pending',
  admin_notes text,
  approved_by uuid references auth.users(id) on delete set null,
  requested_at timestamp with time zone not null default now(),
  reviewed_at timestamp with time zone,
  activates_at timestamp with time zone,
  completed_at timestamp with time zone
);

-- ACADEMIC HOLIDAYS
create table academic_holidays (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references academic_sessions(id) on delete cascade,
  date date not null,
  title text not null,
  created_at timestamp with time zone default now()
);