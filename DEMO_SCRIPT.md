# MediHub — Hackathon Presentation & Demo Script (Ticket H2)
## Multi-Hospital SaaS Management Platform ("Daraz for Hospitals")

This document provides the exact step-by-step click path to demonstrate all 5 core success metrics defined in `01_Product_Requirements_Document.md` §7 during the hackathon judging session.

---

## 1. Demo Credentials Quick Reference
*(All accounts are provisioned via `npm run seed`, default password: `Password123!`)*

| Role | Hospital / Tenant | Email | Password |
|---|---|---|---|
| **Super Admin** | Platform Owner (All) | `superadmin@medihub.local` | `Password123!` |
| **Hospital Admin 1** | City Care General Hospital | `admin1@citycare.local` | `Password123!` |
| **Doctor 1 (Cardiology)**| City Care General Hospital | `dr.sarah@citycare.local` | `Password123!` |
| **Receptionist 1** | City Care General Hospital | `reception@citycare.local` | `Password123!` |
| **Hospital Admin 2** | Metro Health Medical Center | `admin2@metrohealth.local` | `Password123!` |
| **Doctor 2 (Orthopedics)**| Metro Health Medical Center | `dr.bilal@metrohealth.local` | `Password123!` |
| **Patient 1** | End User | `patient.ali@example.com` | `Password123!` |
| **Patient 2** | End User | `patient.zainab@example.com` | `Password123!` |

---

## 2. 5-Minute Judge Presentation Narrative

### Act 1: The Multi-Tenant Problem & Super Admin Vision (1 min)
* **Goal**: Prove multi-tenancy ("Daraz model for hospitals").
* **Click path**:
  1. Open browser to `/login`. Sign in as `superadmin@medihub.local` (`Password123!`).
  2. The dashboard displays **All Hospitals Overview**:
     - "City Care General Hospital" (Karachi) — Active staff, patient visits today, enterprise tier.
     - "Metro Health Medical Center" (Islamabad) — Active staff, growth tier.
  3. Click **"Onboard hospital"** (`/super-admin/onboard`) to show how a new clinic or hospital can be registered in 30 seconds with its initial admin account.
  4. *Judge Takeaway*: A single shared infrastructure serves isolated hospitals with zero server provisioning.

### Act 2: Patient Booking & AI Symptom Triage (1 min)
* **Goal**: Demonstrate intuitive patient booking with AI assistance.
* **Click path**:
  1. Open an Incognito window (or sign out). Log in as `patient.ali@example.com`.
  2. Navigate to **"Book Visit"** (`/hospitals`). Select **"City Care General Hospital"**.
  3. In the booking card, type symptoms in the text box:
     > *"Severe chest pressure, shortness of breath, and rapid heartbeat after climbing stairs."*
  4. Click **"Suggest department"**:
     - Google Gemini AI analyzes symptoms and automatically recommends **"Cardiology"** with clinical justification: *"Symptoms point toward cardiovascular evaluation."*
     - The department selector automatically focuses on Cardiology.
  5. Select **"Dr. Sarah Khan (Consultant Cardiologist)"**, pick an available slot time, and click the time button to book.
  6. Instant confirmation banner appears.

### Act 3: Live Real-Time Queue ("The Hero Feature") (1.5 min)
* **Goal**: Show real-time WebSocket token tracking between receptionist and patient phone.
* **Click path**:
  1. **Split-Screen Setup**:
     * **Left Window**: Log in as Receptionist `reception@citycare.local` (`/receptionist`).
     * **Right Window (Mobile View)**: Patient Ali (`/queue`).
  2. In the Left Window (Reception), find today's booked arrival for Ali Hassan and click **"Check in"**.
  3. The token `#1` is issued.
  4. Look at the Right Window (Patient): The live token board shows:
     - Big bold token number **`#1`**
     - Live queue status badge: **`waiting`**
     - Estimated wait calculation: **`You are #1 · about 0 min`**
     - Built with `aria-live="polite"` for healthcare accessibility.
  5. In Reception window, click **"Call next"**:
     - Token status changes to **`called`**.
     - Instantly (under 1 second), without refreshing the page, the patient's screen reflects the status update via Supabase Realtime WebSocket broadcast.
  6. **Emergency Checkup Demo**:
     - Check in another patient with the **Emergency** button.
     - Notice the vivid red pulsing banner pinned to the top of the queue: **`EMERGENCY`**, prioritizing critical patients above standard wait queues.

### Act 4: Doctor Consultation & AI Plain-Language Report (1 min)
* **Goal**: Show clinician workflow and automated patient report translation.
* **Click path**:
  1. Sign in as Doctor `dr.sarah@citycare.local` (`/doctor`).
  2. In the patient queue, click **"Write report"** on the active appointment.
  3. Doctor reviews prior visit history on the left card.
  4. Doctor writes clinical findings:
     > *"Patient presented with elevated BP (140/90 mmHg). Resting ECG indicates mild sinus tachycardia. Heart sounds normal S1/S2. Recommended ambulatory blood pressure monitoring and starting low-dose ACE inhibitor."*
  5. Prescribe: *"Tab Enalapril 5mg once daily."*
  6. Click **"Save report + AI summary"**:
     - The server route triggers Google Gemini AI with medical guardrails.
     - A patient-friendly summary is generated: *"Your blood pressure was slightly higher than normal and your heart was beating a bit fast, but heart sounds were healthy. Your doctor prescribed a daily blood pressure medicine (Enalapril 5mg) and recommended monitoring."*
     - Accompanied by mandatory disclaimer: *"AI-generated summary — consult your doctor for full details."*

### Act 5: Patient Medical History & Reminders (30 sec)
* **Goal**: Verify end-to-end loop and data privacy.
* **Click path**:
  1. Back in Patient Ali's portal, open **"Medical History"** (`/reports`).
  2. Ali sees the completed visit report with the plain-language summary prominently featured.
  3. Open **"Alerts"** (`/notifications`) to see automated notification: *"Your report is ready"*.
  4. Open **"Account & Privacy"** (`/profile`) to demonstrate GDPR/health privacy compliance with the one-click *"Delete my account & data"* button.

---

## 3. Verification of PRD §7 Success Metrics

| # | PRD Success Metric | How It Is Proven in Demo |
|---|---|---|
| 1 | Patient registers, books at Hospital A, sees live queue | Demonstrated in Act 2 & Act 3 |
| 2 | Doctor at Hospital A cannot see Hospital B data | Tested via RLS: `dr.sarah@citycare` only sees City Care patients |
| 3 | Super Admin dashboard shows both hospitals side-by-side | Demonstrated in Act 1 with aggregate analytics |
| 4 | AI summary generated for medical report | Demonstrated in Act 4 with Gemini plain-language output |
| 5 | Reminder notification fires for appointment | Demonstrated in Act 5 with in-app notification inbox |
