# AADSS — UI/UX Design Specification

---

## Design System

### Color Tokens (OKLCH)

```css
/* Light Mode */
--background: oklch(1 0 0) /* white */ --foreground: oklch(0.145 0 0)
  /* near-black */ --primary: oklch(0.205 0 0) /* dark */ --card: oklch(1 0 0)
  --muted: oklch(0.97 0 0) --border: oklch(0.922 0 0) /* Dark Mode */
  --background: oklch(0.145 0 0) --primary: oklch(0.922 0 0) /* inverted */;
```

### Semantic Colors (Attendance)

```css
Safe (≥75%):    text-green-600   bg-green-500   bg-green-50
Warning (70-74%): text-yellow-600  bg-yellow-500  bg-yellow-50
Danger (<65%):  text-red-600     bg-red-500     bg-red-50
```

### Typography

- **Font:** Geist (Google Fonts, variable `--font-sans`)
- **Headings:** `font-bold`, `tracking-tight`
- **Body:** `text-sm`, `text-foreground`
- **Labels:** `text-xs uppercase tracking-wider text-muted-foreground`

### Border Radius

```css
--radius: 0.625rem /* base */ --radius-sm: ~0.375rem /* buttons, badges */
  --radius-lg: 0.625rem /* cards */ --radius-xl: ~0.875rem /* large cards */;
```

---

## Layout Patterns

### Page Layout

```
┌─────────────────────────────────────┐
│  Header (fixed, h=60px, z=50)       │
├─────────────────────────────────────┤
│  Main Content (pt-[60px])           │
│  max-w-[1400px] mx-auto px-4 py-8   │
│                                     │
└─────────────────────────────────────┘
│  Mobile Bottom Nav (md:hidden)      │
└─────────────────────────────────────┘
```

### Card Pattern

```jsx
<div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl shadow-sm p-6">
```

### Section Headers

```jsx
<h3 className="text-lg font-bold text-foreground mb-4">Section Title</h3>
```

---

## Page Designs

### 1. Calendar Dashboard (`/calendar-dashboard`)

```
┌─────────────────────────────────────────────────────┐
│ Year Progress Card (full width)                     │
│  [Academic Year 2025] [===========75%====] 275 days │
├──────────────────────────────┬──────────────────────┤
│ Year Navigator               │                      │
│ ← [ 2025 ] →                 │                      │
├──────────────────────────────┤  Semester Info Panel │
│ Monthly Calendar Grid        │  ┌────────────────┐  │
│                              │  │ Start/End Date │  │
│  Jan  Feb  Mar  Apr         │  ├────────────────┤  │
│  May  Jun  Jul  Aug         │  │ Overall: 78%   │  │
│  Sep  Oct  Nov  Dec         │  ├────────────────┤  │
│                              │  │ Subject Alerts │  │
│  (Each month: 7x6 grid)      │  └────────────────┘  │
└──────────────────────────────┴──────────────────────┘
```

**Calendar Day Cell:**

- Today: `ring-2 ring-primary`
- Weekend: `bg-red-50/50 text-red-500/70`
- Semester day: `bg-primary/5 border border-primary/10`
- Has classes: dot indicator (green/yellow/red)
- Click: navigate to `/daily-attendance?date=YYYY-MM-DD`

### 2. Daily Attendance (`/daily-attendance`)

```
┌─────────────────────────────────────────┐
│ Date Navigator                          │
│ ← Monday, January 15, 2025 →  [Today]  │
│                          [Pick Date 📅] │
├─────────────────────────────────────────┤
│ Period 1 — DBMS                        │
│ 09:00 AM — 10:00 AM · A101            │
│ [✓ Present] [✗ Absent] [— Cancel]     │
├─────────────────────────────────────────┤
│ Period 2 — Operating Systems           │
│ 10:00 AM — 11:00 AM · B201            │
│ [  Present] [✗ Absent] [— Cancel]     │
└─────────────────────────────────────────┘
```

**Period Card States:**

```
Default:   border-l-transparent
Present:   border-l-green-500 (green left border)
Absent:    border-l-red-400
Cancelled: border-l-yellow-500
```

**Button States:**

```
Active Present:  bg-green-600 text-white ring-2 ring-green-500
Active Absent:   bg-red-500 text-white ring-2 ring-red-400
Inactive:        text-{color} hover:bg-{color}-50
```

**Loading State:** Spinner on Present button while fetching GPS

### 3. Semester Statistics (`/semester-statistics`)

```
┌─────────────────────────────────────────────────────┐
│ Statistics Header                                   │
│ B.Tech CSE · Semester 5 · 2025-2026  [78% Safe]    │
│ Progress bar ████████████░░░░                       │
│ [Safe: 3] [Warning: 1] [Danger: 0]                 │
├─────────────────────────────────────────────────────┤
│ Intelligence Panel Tabs                             │
│ [Semester Projection] [Trajectory] [Recovery: 1]   │
├─────────────────────────────────────────────────────┤
│ Filter + Sort Bar                                   │
│ [All(4)] [Safe(3)] [Warning(1)] Sort: Lowest First  │
├─────────────────────────────────────────────────────┤
│ Subject Cards Grid (3 columns)                      │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│ │ DBMS     │ │ OS       │ │ CN       │             │
│ │ 82% ✅   │ │ 71% ⚠️   │ │ 85% ✅   │             │
│ └──────────┘ └──────────┘ └──────────┘             │
└─────────────────────────────────────────────────────┘
```

### 4. Simulation (`/simulate`)

```
┌─────────────────────────────────────────────────────┐
│ Simulation Engine                                   │
│ "What-if scenarios for your attendance"             │
├─────────────────────────────────────────────────────┤
│ [Skip Planner] [Recovery Planner] [Streak] [Worst] │
├─────────────────────────────────────────────────────┤
│ (Streak tab)                                        │
│ Attend next: ──────●────── 5 classes               │
├─────────────────────────────────────────────────────┤
│ DBMS            78%    Current                     │
│                 [Current: 78%] → [After: 80.5%]    │
│ OS              71%                                 │
│                 [Current: 71%] → [After: 73.8%]    │
└─────────────────────────────────────────────────────┘
```

---

## Component Inventory

### Layout Components

- `Header` — Fixed top nav + mobile bottom nav
- `AdminSidebar` — Fixed left sidebar for admin

### Page-Level Components

- `CalendarDashboardInteractive` — Manages year state
- `DailyAttendanceClient` — Manages date + attendance state
- `SemesterStatisticsClient` — Filter/sort state
- `SimulateClient` — Simulation parameter state

### Feature Components

- `MonthCalendar` — Single month grid with attendance dots
- `YearProgressCard` — Academic year progress bar
- `YearNavigator` — ← Year → controls
- `SemesterInfoPanel` — Stats sidebar with alerts
- `DateNavigator` — ← Date → with date picker
- `ScheduleTimeline` — List of class periods
- `PeriodCard` — Individual class with action buttons
- `SubjectCard` — Per-subject statistics card
- `StatisticsHeader` — Overall stats with progress bar
- `IntelligencePanel` — 3-tab analytics panel

---

## Responsive Breakpoints

```
Mobile (default):  Single column, bottom nav
Tablet (md: 768px): 2 columns, bottom nav hidden
Desktop (lg: 1024px): Full layout, sidebar visible
Wide (xl: 1280px): Max-width container
```

### Mobile-Specific Adaptations

- Calendar: Full-width months, smaller day cells
- Period cards: Action buttons wrap below subject info
- Statistics: Single column subject cards
- Simulation tabs: Horizontally scrollable

---

## Animation Guidelines

```css
/* Transitions */
transition-all duration-200    /* hover states */
transition-all duration-300    /* panel reveals */
transition-all duration-1000   /* progress bars (on mount) */

/* Skeleton Loading */
animate-pulse bg-muted/30

/* No spring/bounce animations — keep professional */
```

---

## Accessibility

- All interactive elements have `aria-label` where text not visible
- Form inputs have associated labels
- Color is never the ONLY indicator (icons + text alongside)
- Focus rings: `focus-visible:ring-2 focus-visible:ring-primary`
- Disabled states: `opacity-50 cursor-not-allowed`
