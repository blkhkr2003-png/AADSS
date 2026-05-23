# AADSS — Deployment Guide

---

## Current Stack

| Service            | Platform             | Notes                           |
| ------------------ | -------------------- | ------------------------------- |
| Frontend + Backend | Vercel (recommended) | Next.js native hosting          |
| Database + Auth    | Supabase Cloud       | Free tier sufficient for MVP    |
| File Storage       | Supabase Storage     | Future: profile photos, exports |

---

## Prerequisites

```bash
Node.js >= 20.9.0 (required by Next.js 16)
npm >= 10.x
```

---

## Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/dipexplorer/AADSS.git
cd AADSS

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local

# 4. Add Supabase credentials
# Edit .env.local:
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ[your-anon-key]

# 5. Run database migrations
# Go to Supabase dashboard → SQL Editor
# Run: db/supabase-schema.sql
# Run: db/seed/01_initial_data.sql

# 6. Start development server
npm run dev
# → http://localhost:3000
```

---

## Critical Fix Before Deploy

### ⚠️ Middleware File Naming Bug

`proxy.ts` must be renamed to `middleware.ts` at the project root for Next.js to pick it up:

```bash
mv proxy.ts middleware.ts
```

Without this, route protection won't work in production.

---

## Vercel Deployment

### Method 1: GitHub Integration (Recommended)

```
1. Push code to GitHub
2. Go to vercel.com → New Project
3. Import from GitHub
4. Framework Preset: Next.js (auto-detected)
5. Add Environment Variables:
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
6. Deploy
```

### Method 2: CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

### Environment Variables in Vercel

```
Settings → Environment Variables → Add:
NEXT_PUBLIC_SUPABASE_URL    = [your url]
NEXT_PUBLIC_SUPABASE_ANON_KEY = [your key]
```

---

## Supabase Setup

### 1. Create Project

```
supabase.com → New Project
Name: aadss
Region: [closest to your users]
Password: [strong password]
```

### 2. Run Schema

```sql
-- In Supabase Dashboard → SQL Editor
-- Copy and run db/supabase-schema.sql
```

### 3. Run Seed Data

```sql
-- Run db/seed/01_initial_data.sql
-- Creates: B.Tech CSE program, Semester 5, DBMS/OS/CN/TOC subjects
```

### 4. Create Admin User

```
Supabase Dashboard → Authentication → Users → Add User
Email: admin@yourinstitution.edu
Password: [secure password]
```

```sql
-- Set admin role
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object('role', 'admin')
WHERE email = 'admin@yourinstitution.edu';
```

### 5. Enable Row Level Security (Do this before production)

```sql
-- Run security policies from security.md
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
-- ... (see security.md for full policies)
```

---

## Build & Verify

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Production build (catch errors before deploy)
npm run build

# Test production build locally
npm run start
```

---

## Post-Deploy Checklist

```
□ Middleware.ts is at project root (not proxy.ts)
□ Environment variables set in Vercel
□ Database schema applied in Supabase
□ Admin user created + role set
□ RLS policies enabled
□ Test student registration → onboarding → attendance flow
□ Test admin login → timetable creation → session management
□ Verify geo-fence with actual GPS device
□ Test on mobile browser (attendance marking)
```

---

## Performance Optimizations

### Next.js

```typescript
// In page.tsx for statistics (heavy computation)
export const dynamic = "force-dynamic"; // No caching for attendance data

// For mostly-static pages
export const revalidate = 3600; // Cache for 1 hour
```

### Supabase Indexes (Apply in production)

```sql
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_session ON attendance(class_session_id);
CREATE INDEX idx_class_sessions_date ON class_sessions(date);
CREATE INDEX idx_subjects_semester ON subjects(semester_id);
CREATE INDEX idx_timetable_day ON timetable(day_of_week);
```

---

## Monitoring

### Vercel Analytics

- Enable in Vercel Dashboard → Analytics
- Tracks page loads, errors, performance

### Supabase Monitoring

- Dashboard → Reports → Query Performance
- Watch for slow queries on attendance + class_sessions tables

### Error Tracking (Recommended)

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

---

## Scaling Considerations

| Users    | Action Required                                  |
| -------- | ------------------------------------------------ |
| 0-500    | Supabase free tier, Vercel hobby                 |
| 500-5000 | Supabase Pro ($25/mo), Vercel Pro                |
| 5000+    | Supabase Team + connection pooling via PgBouncer |

### Connection Pooling

Supabase includes PgBouncer. For high traffic:

```env
# Use pooler URL instead of direct URL
DATABASE_URL=postgres://[user]:[pass]@[project].pooler.supabase.com:6543/postgres
```
