# Acadence - Step-by-Step Build Tracker

## 🎯 Goal
Teach the developer how to build Acadence from scratch, step-by-step, ensuring deep understanding of *why* choices were made, not just *how*.

## 🛤️ Learning Path & Status

- [x] **Phase 1: Problem Definition & Tech Stack Selection** (Completed)
- [x] **Phase 2: Initial Setup & Database Architecture (Supabase Schema)** (Current)
- [ ] **Phase 3: Authentication & Middleware (`proxy.ts`)**
- [ ] **Phase 4: The Core Logic - Validation Engines (GPS, Time)**
- [ ] **Phase 5: The Analytics & Simulation Engines (Pure Functions)**
- [ ] **Phase 6: Server Actions - Connecting Frontend to DB**
- [ ] **Phase 7: Frontend UI & Layout Architecture (Next.js App Router)**
- [ ] **Phase 8: Security, Optimization, and Deployment (Fixing Technical Debt)**

## 🧠 Core Principles to Emphasize
1. **Server Actions > REST APIs**: Less boilerplate, better type safety.
2. **Pure Functions for Logic**: Keep business rules (`lib/engines/`) independent of frameworks.
3. **Relational Database (SQL) > NoSQL**: Because academic data is highly structured and connected.
4. **Security by Default**: Server-side validation of GPS/Time, not client-side trusting.
