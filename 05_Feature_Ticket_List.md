# 05 — Feature Ticket List
## MediHub — AI-Powered Multi-Hospital Management Platform

> Feed these to Antigravity one epic at a time (or one ticket at a time for tighter control). Each ticket has an acceptance criteria line so the agent — and your teammates — know when it's "done." Priority: **P0 = must demo, P1 = should demo, P2 = stretch/cut first if time runs out.**

---

## Epic A — Foundation & Security (build first, always)

| ID | Ticket | Priority | Acceptance Criteria |
|---|---|---|---|
| A1 | Init repo, `.gitignore` includes `.env*`, add secrets scan pre-commit | P0 | No secret ever appears in a commit; `.env.example` provided with dummy values |
| A2 | Set up Supabase project (or Postgres + Auth backend) | P0 | Can create a user via signup form |
| A3 | Define schema from `02_Technical_Architecture_Document.md` §3 | P0 | All tables exist with correct columns/foreign keys |
| A4 | Enable Row-Level Security on every tenant table + write policies (see `03_Security_Access_Document.md` §3) | P0 | A logged-in Hospital A doctor cannot fetch Hospital B's data, verified by manual test |
| A5 | Sign up + email verification + login + password reset | P0 | New user can complete full account lifecycle without dev intervention |
| A6 | Role-based route guarding (frontend) + server-side role re-check (backend) | P0 | Directly hitting a receptionist API as a patient returns 403 |
| A7 | Rate-limit login, add CAPTCHA on signup/login | P1 | 6th rapid login attempt is blocked/challenged |
| A8 | Input validation (client + server) on all forms | P0 | Submitting an invalid email/phone is rejected with a clear inline error |
| A9 | Security headers + force HTTPS + `npm audit` clean pass | P1 | Headers present in response; no high-severity vuln in audit |
| A10 | Account deletion flow | P1 | User can request deletion; data is purged/soft-deleted |

## Epic B — Multi-Hospital / Tenant Management

| ID | Ticket | Priority | Acceptance Criteria |
|---|---|---|---|
| B1 | Super Admin: onboard new hospital form | P0 | New hospital + first Hospital Admin account created in one flow |
| B2 | Super Admin: all-hospitals overview dashboard | P0 | Shows patient count, staff count, appointments-today per hospital |
| B3 | Hospital Admin: manage departments & doctors | P0 | Can add/edit/remove a doctor and assign to a department |
| B4 | Hospital Admin: hospital analytics (appointments/day, avg wait, no-show rate) | P1 | Chart renders from real appointment data |

## Epic C — Appointment Booking

| ID | Ticket | Priority | Acceptance Criteria |
|---|---|---|---|
| C1 | Patient: browse hospitals → departments → doctors → available slots | P0 | Slot list reflects doctor's configured working hours minus already-booked slots |
| C2 | Patient: book / reschedule / cancel appointment | P0 | Booking creates an `appointments` row with correct `hospital_id` |
| C3 | AI: symptom-based department suggestion at booking start | P1 | Entering "chest pain" suggests Cardiology (or closest match) |
| C4 | Empty/loading/error states for booking flow | P0 | All three states are visually distinct and tested |

## Epic D — Live Queue / Waiting Status (hero feature)

| ID | Ticket | Priority | Acceptance Criteria |
|---|---|---|---|
| D1 | Check-in creates a `queue_tokens` row, assigns next token number | P0 | Token numbers increment correctly per hospital/department/day |
| D2 | Realtime queue position broadcast (Supabase Realtime or WebSocket) | P0 | Patient's queue screen updates within ~2s of reception calling next patient, without a page refresh |
| D3 | Reception/doctor: call next, mark no-show, skip | P0 | Actions update `queue_tokens.status` and propagate to the patient view live |
| D4 | Emergency check-in flag (jumps queue, red banner) | P1 | Emergency-flagged token appears pinned at top of staff queue view |
| D5 | Offline/network-degraded state on queue screen | P1 | Shows "last known position" banner when connection drops |

## Epic E — Medical Reports & AI Summary

| ID | Ticket | Priority | Acceptance Criteria |
|---|---|---|---|
| E1 | Doctor: write report + prescription tied to an appointment | P0 | Report saved with correct `patient_id`/`hospital_id` |
| E2 | Server-side call to AI API to generate plain-language summary | P0 | `ai_summary` field populated; API key never exposed client-side |
| E3 | Patient: view history list + report detail with AI summary + disclaimer | P0 | Disclaimer text always shown alongside any AI summary |
| E4 | File upload for lab results (type/size restricted) | P1 | Only PDF/JPG/PNG under 10MB accepted; rejected files show a clear error |

## Epic F — Reminders & Notifications

| ID | Ticket | Priority | Acceptance Criteria |
|---|---|---|---|
| F1 | Scheduled job: appointment reminder 24h / 1h before | P0 | Notification row created and visible in patient's notification inbox |
| F2 | In-app notification inbox + read/unread state | P0 | Unread badge count matches actual unread notifications |
| F3 | Report-ready notification | P1 | Fires when a doctor completes a report |
| F4 | SMS/WhatsApp reminder channel (stretch) | P2 | Message delivered via Twilio/WhatsApp Cloud API sandbox |

## Epic G — Frontend Polish & Accessibility

| ID | Ticket | Priority | Acceptance Criteria |
|---|---|---|---|
| G1 | Apply design system tokens from `04_Frontend_Specification_Document.md` §2–3 globally | P0 | Colors/fonts consistent across all screens |
| G2 | Empty/loading/error/network states on every data view | P0 | Verified on: queue, appointments, reports, staff list |
| G3 | Responsive pass (mobile patient flows, desktop staff dashboards) | P0 | No horizontal scroll/broken layout at 375px and 1440px widths |
| G4 | Accessibility pass (contrast, alt text, aria-live on queue, keyboard nav on booking) | P1 | Passes a basic axe/Lighthouse accessibility audit |

## Epic H — Demo & Wrap-up

| ID | Ticket | Priority | Acceptance Criteria |
|---|---|---|---|
| H1 | Seed data script: 2 hospitals, staff, patients, sample appointments | P0 | One command populates a realistic demo dataset |
| H2 | Demo script (the exact click-path judges will see) | P0 | Written script covering the 5 success metrics in `01_Product_Requirements_Document.md` §7 |
| H3 | *(Optional, cut first if short on time)* One-page public marketing/landing page with basic SEO meta tags, favicon, `robots.txt` | P2 | Only build if all P0/P1 tickets above are done first |

---

### Suggested Build Order for Antigravity Sessions
1. Epic A (Foundation & Security) — non-negotiable, everything depends on it
2. Epic B (Tenant Management) — proves the multi-hospital story
3. Epic C + D (Booking + Live Queue) — the demo's centerpiece
4. Epic E (Reports + AI) — the "AI-powered" proof point
5. Epic F (Reminders) — rounds out the feature set
6. Epic G (Polish) — do this continuously, not only at the end
7. Epic H — final day
