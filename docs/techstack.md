# AADSS — Tech Stack

---

## Frontend

| Technology                   | Version | Purpose                              | Justification                                                                 |
| ---------------------------- | ------- | ------------------------------------ | ----------------------------------------------------------------------------- |
| **Next.js**                  | 16.1.7  | Full-stack React framework           | App Router, Server Components, Server Actions — eliminates separate API layer |
| **React**                    | 19.2.3  | UI library                           | Latest stable, Server Components support                                      |
| **TypeScript**               | ^5      | Type safety                          | Strict mode enabled, zero `any` tolerance                                     |
| **Tailwind CSS**             | v4      | Utility-first styling                | CSS variables for theming, no runtime overhead                                |
| **shadcn/ui**                | 4.1.0   | Component library (radix-nova style) | Accessible, unstyled primitives, fully customizable                           |
| **radix-ui**                 | 1.4.3   | Headless UI primitives               | Powers shadcn components                                                      |
| **lucide-react**             | 0.577.0 | Icon library                         | Tree-shakeable, consistent design                                             |
| **react-hot-toast**          | 2.6.0   | Toast notifications                  | Lightweight, customizable                                                     |
| **class-variance-authority** | 0.7.1   | Variant management                   | Type-safe component variants                                                  |
| **tailwind-merge**           | 3.5.0   | Class merging                        | Prevent Tailwind conflicts                                                    |
| **tw-animate-css**           | 1.4.0   | CSS animations                       | Pre-built animation utilities                                                 |

---

## Backend / Full-Stack

| Technology                 | Purpose                                                           |
| -------------------------- | ----------------------------------------------------------------- |
| **Next.js App Router**     | Server Components + Server Actions (replaces API routes)          |
| **Next.js Server Actions** | `"use server"` — direct DB calls from server, no REST boilerplate |
| **Supabase SSR**           | `@supabase/ssr` — cookie-based auth for App Router                |

---

## Database & Auth

| Technology             | Version                        | Purpose                                |
| ---------------------- | ------------------------------ | -------------------------------------- |
| **Supabase**           | Latest                         | PostgreSQL + Auth + Storage + Realtime |
| **PostgreSQL**         | 14.4 (via Supabase)            | Primary database                       |
| **Supabase Auth**      | via `@supabase/auth-js` 2.99.3 | Email/password + JWT sessions          |
| **Row Level Security** | PostgreSQL RLS                 | Data isolation per user                |

---

## Key Architecture Decisions

### Server Components + Server Actions (no REST API)

```
// ❌ Old way — separate API routes
fetch('/api/attendance', { method: 'POST', body: JSON.stringify(data) })

// ✅ New way — Server Actions
import { markAttendance } from '@/lib/attendance/markAttendance'
const result = await markAttendance(sessionId, profileId, 'present', location)
```

**Why:** Eliminates network round-trip overhead, type-safe end-to-end, no API versioning needed.

### Supabase Client Strategy

- **Server:** `lib/supabase/server.ts` — uses `cookies()` from `next/headers`
- **Client:** `lib/supabase/client.ts` — uses `createBrowserClient` for client components
- **Never mix:** Server client in client components = hydration errors

### CSS Variables for Theming

```css
:root {
  --primary: oklch(0.205 0 0);
}
.dark {
  --primary: oklch(0.922 0 0);
}
```

**Why:** OKLCH color space = perceptually uniform, better dark mode transitions.

---

## File Naming Conventions

```
lib/
  engines/
    analytics/    — calculation logic (pure functions)
    simulation/   — what-if engines
    validation/   — input validators
  attendance/     — DB operations for attendance
  admin/          — admin-only DB operations
  supabase/       — client factories
  utils/          — shared utilities

app/
  [route]/
    page.tsx      — Server Component (data fetching)
    components/
      XyzClient.tsx  — "use client" components
      XyzServer.tsx  — Server Components

server/
  auth/           — auth server actions
```

---

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## Development Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint check
```

---

## Dependencies to Add (Phase 2)

| Package                 | Purpose                            |
| ----------------------- | ---------------------------------- |
| `web-push`              | Browser push notifications         |
| `papaparse`             | CSV parsing for bulk import        |
| `jspdf`                 | PDF export for attendance reports  |
| `recharts`              | Charts for analytics visualization |
| `@tanstack/react-query` | Client-side caching + revalidation |
