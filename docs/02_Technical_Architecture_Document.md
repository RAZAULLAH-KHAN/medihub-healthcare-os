# 02 — Technical Architecture Document
## MediHub — AI-Powered Multi-Hospital Management Platform

---

## 1. Architecture Style

**Multi-tenant SaaS, single codebase, shared database with tenant isolation via `hospital_id`.**
(This is the "Daraz model" — one platform, many shops, isolated by a shop/tenant key rather than separate databases per hospital. It's the fastest-to-build option and the one real HMS SaaS products use at this scale.)

```
                        ┌─────────────────────────┐
                        │        Frontend          │
                        │  React + Tailwind (SPA)  │
                        └────────────┬─────────────┘
                                     │ REST/JSON + WebSocket
                        ┌────────────▼─────────────┐
                        │        API Layer          │
                        │  Node.js (Express/Nest)   │
                        │  or Supabase Edge Functions│
                        └────────────┬─────────────┘
                 ┌───────────────────┼───────────────────┐
        ┌────────▼───────┐  ┌────────▼────────┐ ┌────────▼────────┐
        │   PostgreSQL    │  │  Realtime Queue  │ │   AI Service     │
        │ (Row-Level      │  │  (WebSocket /    │ │ (Claude/Gemini   │
        │  Security per   │  │  Supabase        │ │  API for triage, │
        │  hospital_id)   │  │  Realtime)        │ │  summaries)      │
        └─────────────────┘  └──────────────────┘ └──────────────────┘
                 │
        ┌────────▼───────┐
        │  File Storage   │  (reports, lab PDFs, hospital logos)
        └────────────────┘
```

## 2. Recommended Stack (optimized for a hackathon + Antigravity build)

| Layer | Choice | Why |
|---|---|---|
| Frontend | **React + TypeScript + Tailwind CSS** | Fast to scaffold, huge component ecosystem, Antigravity/Gemini has strong React support |
| Backend | **Supabase** (Postgres + Auth + Realtime + Storage) *or* Node.js/Express if a custom backend is preferred | Supabase gives you auth, RLS, realtime queue, and file storage out of the box — dramatically cuts hackathon build time |
| Realtime queue | Supabase Realtime channels (Postgres change events) or plain WebSocket | Needed for the live "token/queue" screen |
| AI | Anthropic Claude API (or Gemini, since you're building in Antigravity) for: symptom triage suggestion, report summarization | Keep AI calls server-side only — never expose API keys client-side |
| Auth | Supabase Auth (email/password + magic link) | Handles verification, password reset, sessions natively |
| Notifications | Web Push (in-app) for MVP; Twilio/WhatsApp Cloud API as stretch | Keep MVP notification channel simple |
| Hosting | Vercel (frontend) + Supabase (backend/db) | Zero-ops, fast deploys, good for demo day |

## 3. Multi-Tenancy Data Model (core tables)

```
hospitals            (id, name, logo_url, address, subscription_plan, created_at)
users                (id, email, role, hospital_id [nullable for super_admin], name, phone)
departments          (id, hospital_id, name)
doctors              (id, user_id, hospital_id, department_id, specialty, working_hours)
patients             (id, user_id, dob, gender, blood_group, emergency_contact)
appointments         (id, hospital_id, patient_id, doctor_id, slot_time, status, is_emergency)
queue_tokens         (id, hospital_id, appointment_id, token_number, status, called_at)
medical_reports      (id, hospital_id, patient_id, doctor_id, appointment_id, content, ai_summary, attachments[])
reminders            (id, user_id, type, target_time, sent_at, channel)
notifications        (id, user_id, title, body, read, created_at)
audit_logs           (id, hospital_id, user_id, action, table_name, record_id, created_at)
```

Every tenant-scoped table carries `hospital_id`. **No query should ever run without a `hospital_id` filter** — this is enforced at the database level via Row-Level Security, not just in application code (see `03_Security_Access_Document.md`).

`users.role` enum: `super_admin | hospital_admin | doctor | receptionist | lab_staff | patient`

## 4. Key Flows

### 4.1 Booking → Queue flow
1. Patient books slot → row in `appointments` (status: `booked`)
2. On check-in day, reception/patient self-check-in → `queue_tokens` row created, `status: waiting`
3. Realtime channel pushes queue position updates to all subscribed clients for that `hospital_id` + `department_id`
4. Doctor calls next → `status: in_progress` → completed → `status: done`

### 4.2 AI Report Summary flow
1. Doctor submits report text (and optional attachment) → saved to `medical_reports`
2. Server-side function sends report content to the AI API with a strict prompt: *"Summarize this medical report in plain language for the patient, do not add new clinical claims."*
3. Summary stored in `ai_summary` column, shown to patient with a clear "AI-generated summary — consult your doctor for full details" disclaimer

### 4.3 Reminder flow
1. Scheduled job (cron / Supabase Edge Function on a schedule) scans `appointments` for slots in the next 24h/1h
2. Creates `notifications` row + (stretch) sends email/SMS
3. Patient sees badge/toast in-app

## 5. Environment & Secrets

- `.env` file holds: `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AI_API_KEY`, `JWT_SECRET`
- **Never** commit `.env` — add to `.gitignore` from commit #1 (this is ticket P0-SEC-01 in the ticket list)
- Only server-side code (API routes / edge functions) may use the service-role key or AI key — the frontend only ever talks to the public anon key + RLS-protected endpoints

## 6. Scalability Notes (for the "why this scales" slide)

- Adding a new hospital = one row in `hospitals` + onboarding staff — zero code changes, zero new infrastructure
- RLS means tenant isolation is enforced by Postgres itself, not by every developer remembering a `WHERE hospital_id = ?` clause
- Realtime queue channel is namespaced per hospital, so load scales horizontally per tenant

## 7. What NOT to build for the hackathon

- Do not build a separate database per hospital (over-engineering for the timebox)
- Do not build a custom real-time server from scratch if Supabase Realtime is available
- Do not integrate a real payment gateway — mock it
