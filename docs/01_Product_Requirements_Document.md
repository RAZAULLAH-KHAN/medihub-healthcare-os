# 01 — Product Requirements Document (PRD)
## MediHub — AI-Powered Multi-Hospital Management Platform

> Status: Hackathon MVP scope · Owner: Raza · Build target: Google Antigravity (agentic build)

---

## 1. Vision & Analogy

Build **one platform that hosts many hospitals**, the same way Daraz hosts many independent shops under one marketplace. Each hospital is a **tenant** with its own staff, patients, departments, and data — but they all run on the same codebase, the same admin tooling, and the same AI layer.

- **Daraz "Seller"** → **Hospital** (has its own branding, staff, inventory of doctors/services)
- **Daraz "Shop dashboard"** → **Hospital Admin Dashboard**
- **Daraz "Marketplace admin"** → **Super Admin** (Platform owner — onboards hospitals, monitors uptime/usage, bills hospitals)
- **Daraz "Buyer"** → **Patient**
- **Daraz "Product"** → **Doctor / Service / Time slot**
- **Daraz "Order"** → **Appointment**

This tenant model is the single most important architectural decision in this project — every other document assumes it.

---

## 2. Problem Statement

Small and mid-size hospitals/clinics (the target market — modelled on Pakistani private clinics/hospitals) run on paper registers, WhatsApp groups, and phone calls for:
- Patient queueing ("what number am I?")
- Appointment booking and no-show follow-up
- Medical report storage and retrieval
- Reminders (medication, follow-up visits, lab pickup)

This causes long waiting-room times, lost reports, missed follow-ups, and no visibility for hospital owners across multiple branches.

## 3. Target Users / Personas

| Persona | Role | Core Need |
|---|---|---|
| **Super Admin** | Platform owner (you) | Onboard hospitals, see cross-hospital analytics, manage billing/subscriptions |
| **Hospital Admin** | Hospital owner/manager | Manage staff, departments, view hospital-wide analytics |
| **Doctor** | Clinician | See queue, patient history, write reports/prescriptions |
| **Receptionist / Front Desk** | Staff | Register patients, manage queue, book appointments |
| **Patient** | End user | Book appointment, track queue/waiting status, view reports, get reminders |
| **Lab/Radiology Staff** *(stretch)* | Staff | Upload test results to patient record |

## 4. Core Feature Set (MVP)

### 4.1 Multi-Hospital / Tenant Management
- Super Admin can onboard a new hospital (name, logo, address, departments, subscription plan)
- Each hospital gets an isolated data space (see `02_Technical_Architecture_Document.md` and `03_Security_Access_Document.md`)
- Hospital Admin manages their own staff, departments, and doctor schedules

### 4.2 Appointment Booking
- Patient searches by hospital → department → doctor → available slot
- Doctor/hospital-defined working hours & slot duration
- Booking confirmation + reschedule/cancel flow
- Reminder notification sent before appointment (see 4.4)

### 4.3 Live Queue / Waiting Status ("token system")
- Digital token generated on check-in (walk-in or appointment)
- Patient-facing live queue screen: "You are #4, estimated wait 20 min"
- Doctor/reception can call next patient, mark no-show, skip
- Powered by a simple real-time channel (see Technical doc) — this is the single most "wow factor" feature for a hackathon demo

### 4.4 Reminders & Notifications
- Appointment reminder (24h before, 1h before)
- Medication reminder (optional, patient-configured)
- Report-ready notification
- Channel: in-app push + email (SMS/WhatsApp as stretch goal, see Technical doc)

### 4.5 Medical Reports & History
- Doctor uploads/writes report + prescription after visit
- Patient can view full history across visits, download PDF
- Lab results attachable to a visit record
- **AI feature**: auto-summarize a long report/history into a plain-language summary for the patient

### 4.6 Emergency Checkup (optional / stretch)
- "Emergency" intake path that bypasses normal queue ordering with a severity flag
- Triggers alert to available doctor/on-duty staff

### 4.7 AI Layer (what makes it "AI-powered")
| AI Feature | Priority |
|---|---|
| Symptom-based department/doctor suggestion at booking time (simple triage) | P1 |
| Plain-language report summary for patients | P1 |
| No-show / queue-delay prediction to keep wait estimates accurate | P2 |
| Smart scheduling suggestions for hospital admins (busiest hours, doctor load) | P2 |

## 5. Standard App-Readiness Checklist (mapped into this project)

The generic pre-launch checklist you pasted is folded in here, scoped to what actually applies to a web-based hospital platform (mobile app store items are marked optional/stretch):

**Account & Access**
- Sign up & log in (role-aware: patient vs staff) — P0
- Email verification — P0
- Password reset — P0
- Account deletion (patient can request data deletion — also a privacy/compliance requirement for health data) — P1
- User permissions (RBAC — see Security doc) — P0

**UI Robustness**
- Empty states (no appointments yet, no reports yet) — P0
- Loading states (queue screen, report list) — P0
- Error states (booking conflict, failed upload) — P0
- Network/offline states (queue screen must degrade gracefully) — P1

**Platform**
- Data persistence — P0
- Payment flow *(stretch — subscription billing for hospitals, or paid consultation fee)* — P2
- Notifications — P0
- Analytics (basic usage dashboard for Super Admin) — P1
- Crash reporting *(hook up Sentry or similar if time allows)* — P2
- Privacy setup (health data = sensitive; see Security doc) — P0
- Accessibility (contrast, font size, screen-reader labels — important, this is a medical app) — P1
- Responsiveness (must work on a receptionist desktop AND a patient's phone) — P0
- Documented user flows — P0
- Beta testers / demo script for hackathon judges — P0

**Mobile app store items (APPLE SIGN-IN, PRIVACY LABELS, NOT A WEB VIEW, DELETE ACCOUNT, TERMS OF USE)** — only relevant **if** you ship a native/wrapped mobile app. For the hackathon, treat these as **out of scope**; revisit only if you package a Flutter/React Native shell post-hackathon.

**Public marketing site & SEO checklist (H1s, meta tags, sitemap, robots.txt, etc.)** — **out of scope for the hackathon build.** This applies to a public marketing landing page, not the product itself. If you want a one-page public "About MediHub" site for the demo, treat it as a single P2 ticket, not a workstream — see the last ticket in `05_Feature_Ticket_List.md`.

## 6. Out of Scope (explicitly, for the hackathon)

- Real insurance/billing integrations
- HL7/FHIR interoperability with external hospital systems
- Native mobile apps (web-responsive only)
- Multi-language i18n (English/Urdu toggle is a nice-to-have stretch, not required)
- Real payment gateway (mock it if a payment flow is demoed)

## 7. Success Metrics (for the demo)

1. A patient can register, book an appointment at "Hospital A," and see their live queue position.
2. A doctor at "Hospital A" cannot see any data belonging to "Hospital B" (proves multi-tenancy).
3. A Super Admin dashboard shows both hospitals side-by-side with aggregate stats.
4. An AI summary is generated for at least one medical report.
5. A reminder notification fires for an upcoming appointment.

## 8. Assumptions

- Team size and hackathon timebox mean **breadth of realistic features > depth of any single feature**.
- Antigravity will be used to scaffold the app from these documents plus `05_Feature_Ticket_List.md`, ticket by ticket.
