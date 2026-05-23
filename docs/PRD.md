# AADSS — Academic Attendance Decision Support System

## Product Requirements Document (PRD)

---

## 1. Product Overview

**Product Name:** AADSS (Academic Attendance Decision Support System)
**Version:** 1.0 (MVP → Phase 2 in progress)
**Type:** Full-Stack Web Application (PWA-ready)
**Primary Users:** College students + Admin (faculty/coordinator)

### Problem Statement

Students lose exam eligibility due to attendance shortfall — often realising too late. Existing systems only show historical data. AADSS provides **real-time intelligence**: current state, future prediction, and actionable recovery paths.

### Vision

_"At any moment, a student should know exactly where they stand, what will happen if they skip, and what they must do to stay eligible."_

---

## 2. User Personas

### Persona 1 — Student (Primary)

- B.Tech / BCA / BSc college student
- Checks attendance daily before deciding to bunk
- Wants to know "can I safely miss today's class?"
- Needs exam eligibility alerts early enough to act

### Persona 2 — Admin (Secondary)

- Faculty coordinator or HOD
- Manages academic sessions, programs, semesters
- Configures timetables, subjects
- Monitors student attendance statistics

---

## 3. Core Feature Requirements

### P0 — Must Have (MVP, already partially built)

| Feature                       | Description                                      | Status  |
| ----------------------------- | ------------------------------------------------ | ------- |
| Auth                          | Email/password login, role-based (student/admin) | ✅ Done |
| Student Profile Onboarding    | Link student to session/program/semester         | ✅ Done |
| Timetable Management (Admin)  | CRUD for weekly class schedule                   | ✅ Done |
| Auto Class Session Generation | Generate sessions from timetable on demand       | ✅ Done |
| Daily Attendance Marking      | Mark present/absent/cancelled per class          | ✅ Done |
| Geo-fence Validation          | Validate student is in classroom (GPS)           | ✅ Done |
| Time Window Validation        | Only mark present within 10 min of class start   | ✅ Done |
| Calendar Dashboard            | Year-view calendar with per-day attendance dots  | ✅ Done |
| Semester Statistics           | Per-subject attendance %, risk levels            | ✅ Done |
| Analytics Engine              | Risk score, danger thresholds, projections       | ✅ Done |
| Simulation Engine             | Skip planner, recovery planner, streak simulator | ✅ Done |
| Admin Dashboard               | Overview stats + quick links                     | ✅ Done |

### P1 — High Priority (Next Phase)

| Feature                       | Description                                   |
| ----------------------------- | --------------------------------------------- |
| Push Notifications            | Alert when subject drops below threshold      |
| Attendance Correction Request | Student requests manual correction from admin |
| Admin Bulk Import             | CSV upload for timetable/student data         |
| Subject-wise Detailed History | Per-class session attendance log              |
| Export Reports                | PDF/CSV attendance report for student         |
| Dark Mode                     | Full dark theme support (CSS vars ready)      |

### P2 — Nice to Have (Future)

| Feature                 | Description                        |
| ----------------------- | ---------------------------------- |
| Multi-device sync       | Real-time via Supabase Realtime    |
| Biometric/QR attendance | Alternative to GPS for marking     |
| Parent portal           | View-only attendance for guardians |
| AI-powered predictions  | ML-based attendance trajectory     |
| Offline support         | PWA with service worker caching    |

---

## 4. User Flows

### Student Flow

```
Register → Onboarding (select session/program/semester)
→ Calendar Dashboard (year overview)
→ Daily Attendance (mark present/absent)
→ Semester Statistics (analytics)
→ Simulation (what-if scenarios)
```

### Admin Flow

```
Admin Login → Admin Dashboard
→ Manage Sessions & Programs
→ Manage Subjects
→ Configure Timetable
→ Manage Class Sessions (cancel/reschedule)
→ View Students
```

---

## 5. Non-Functional Requirements

| Requirement             | Target                           |
| ----------------------- | -------------------------------- |
| Page Load               | < 2s on 4G                       |
| Attendance Mark Latency | < 500ms                          |
| Mobile Responsive       | Yes (mobile-first)               |
| Uptime                  | 99.5%                            |
| Data Security           | RLS on all Supabase tables       |
| Concurrent Users        | 500+ (Supabase free tier scales) |

---

## 6. Success Metrics

- Student marks attendance within 5 min of class start: **>80%**
- Students who avoid eligibility loss after using alerts: **>70%**
- Admin setup time for full semester: **< 30 minutes**
- Daily active usage rate: **> 60% of enrolled students**
