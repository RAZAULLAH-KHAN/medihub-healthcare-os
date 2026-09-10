# MediHub — AI-Powered Multi-Hospital Healthcare Operating System

[![Next.js](https://img.shields.io/badge/Next.js-16.3.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%26%20Realtime-emerald?style=flat&logo=supabase)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20AI-Gemini%203.6%20Flash-orange?style=flat&logo=google)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-cyan?style=flat&logo=tailwindcss)](https://tailwindcss.com/)

> **Lead Developer & Solutions Architect:** Raza  
> **Platform Model:** Multi-Tenant Healthcare Operating System ("Daraz / Shopify for Healthcare")

---

## 🌟 Executive Overview

**MediHub** is an enterprise multi-tenant Healthcare Operating System (HMS SaaS) engineered to digitize and interconnect independent clinics and tertiary hospitals across Pakistan into a unified, zero-latency digital healthcare grid.

Using an architectural model analogous to **Daraz / Shopify for Healthcare**, MediHub allows the platform owner (Super Admin) to onboard dozens of independent hospitals on a single high-performance codebase. Each hospital operates as an autonomous tenant with its own branding, departments, doctors, consultation schedules, and patients—while sharing high-availability cloud infrastructure, Row-Level Security (RLS), and a unified clinical AI layer powered by Google Gemini.

---

## 🚀 Key Innovations & Features

### 1. 🤖 Google Gemini AI Clinical Symptom Triage
- Natural language symptom processing: Patients enter symptoms in plain language.
- Gemini 3.6 Flash evaluates urgency, provides clinical justification, and automatically routes the patient to the exact matching specialty (e.g., Cardiology, Oncology, Neurology).

### 2. ⚡ Zero-Latency Live Digital Queue & Token Engine
- Real-time digital token generation (`#1`, `#2`, `#3`...) upon patient check-in.
- WebSocket-synchronized live queue position and dynamic wait-time estimation updated without page reloads.

### 3. 🩺 Synchronized Doctor Clinical Desk
- Instant live schedule updates when a patient books.
- Complete digital EHR charting (Diagnosis, Prescriptions, Lab Orders).
- **Gemini Plain-Language Summarizer:** Translates complex Latin clinical terms into simple, compassionate patient instructions.

### 4. 🏥 Receptionist Front-Desk Intake
- Real-time patient arrivals board.
- 1-click patient check-in and digital token dispatch.

### 5. 📊 Executive Hospital Operations Analytics
- Real-time dashboard for Hospital Admins tracking daily patient throughput, live average wait times, and attendance rates.

### 6. 🌐 Super Admin Multi-Tenant Governance
- Hospital onboarding suite, subscription tier management (`enterprise`, `growth`, `starter`), cross-hospital utilization, and system audit logs.

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT / BROWSER TIERS                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────────────┐  │
│  │  Patient Portal  │  │   Doctor Desk    │  │ Reception / Admin Portals │  │
│  │ (Ali Hassan PK)  │  │ (Dr. Sarah Khan) │  │ (Arrivals & Operations)   │  │
│  └────────┬─────────┘  └────────┬─────────┘  └─────────────┬─────────────┘  │
└───────────┼─────────────────────┼──────────────────────────┼────────────────┘
            │ HTTPS (Next.js Server Actions)                 │ WebSocket Sync
┌───────────▼─────────────────────▼──────────────────────────▼────────────────┐
│                   NEXT.js 16 ENTERPRISE APPLICATION LAYER                   │
│  ┌────────────────────────┐ ┌────────────────────────┐ ┌──────────────────┐ │
│  │ Middleware & Sessions  │ │ App Router Handlers    │ │ 1-Click Persona  │ │
│  │ (Auth & Route Guards)  │ │ (Queue, Appointments)  │ │ Fast Switcher    │ │
│  └────────┬───────────────┘ └────────┬───────────────┘ └────────┬─────────┘ │
└───────────┼──────────────────────────┼──────────────────────────┼───────────┘
            │ Service Role RPC         │ Gemini 3.6 Flash SDK     │
┌───────────▼──────────────────────────▼──────────────────────────▼───────────┐
│                    CLOUD DATA & AI INFRASTRUCTURE LAYER                     │
│  ┌───────────────────────────────┐        ┌──────────────────────────────┐  │
│  │      PostgreSQL Database      │        │       Google Gemini AI       │  │
│  │  - Row-Level Security (RLS)   │        │  - Symptom-Based Triage      │  │
│  │  - 11 Relational Tables       │        │  - Plain-Language Summaries  │  │
│  └───────────────┬───────────────┘        └──────────────────────────────┘  │
│                  │ CDC Postgres Changes                                     │
│  ┌───────────────▼───────────────┐                                          │
│  │   Supabase Realtime Engine    │───► Broadcasts to connected browsers     │
│  │  (WebSocket State Dispatch)   │     in under 100 milliseconds            │
│  └───────────────────────────────┘                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 👥 Demo Personas & Credentials

The live application includes a **1-Click Demo Switcher** in the top navigation bar. You can also log in manually with the credentials below:

### Universal Demo Password
```
Password123!
```

| Persona | Role | Email | Hospital / Workspace |
| :--- | :--- | :--- | :--- |
| **Dr. Sarah Khan** | Doctor | `dr.sarah@citycare.local` | City Care General, Rawalpindi (`/doctor`) |
| **Fatima Noor** | Receptionist | `reception@citycare.local` | City Care General, Rawalpindi (`/receptionist`) |
| **Ali Hassan** | Patient | `patient.ali@example.com` | All Pakistani Hospitals (`/appointments`, `/queue`) |
| **Dr. Tariq Mahmood** | Hospital Admin | `admin1@citycare.local` | City Care General, Rawalpindi (`/hospital-admin`) |
| **Super Admin** | Super Admin | `superadmin@medihub.local` | MediHub Platform SaaS (`/super-admin`) |

---

## 🛠️ Local Development & Setup

### Prerequisites
- Node.js 18.18+ or 20+
- npm, yarn, or pnpm

### 1. Clone the Repository
```bash
git clone https://github.com/RAZAULLAH-KHAN/medihub-healthcare-os.git
cd medihub-healthcare-os/web
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create `.env.local` inside the `web/` directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

AI_PROVIDER=gemini
AI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash

CRON_SECRET=your-cron-secret
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

### 5. Automated Verification Tests
```bash
node --env-file=.env.local scripts/test-all.mjs
node --env-file=.env.local scripts/test-realtime-flow.mjs
```

---

## 🚢 Vercel Deployment Guide

1. Push this repository to GitHub:
   ```bash
   git remote add origin https://github.com/RAZAULLAH-KHAN/medihub-healthcare-os.git
   git branch -M main
   git push -u origin main
   ```
2. Import the project in [Vercel](https://vercel.com/):
   - **Root Directory:** Set to `web`
   - **Framework Preset:** Next.js
3. Configure the Environment Variables in Vercel Dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `AI_PROVIDER` (`gemini`)
   - `AI_API_KEY`
   - `GEMINI_MODEL` (`gemini-2.0-flash`)
   - `CRON_SECRET`
4. Click **Deploy**!

---

## 📄 Documentation Links
- [Product Requirements Document (PRD)](01_Detailed_Client_PRD_MediHub.md)
- [Technical Architecture Document](02_Technical_Architecture_Document.md)
- [Security & Access Policy (RLS)](03_Security_Access_Document.md)
- [Frontend Design Specifications](04_Frontend_Specification_Document.md)
- [Demo Script & Evaluation Guide](DEMO_SCRIPT.md)

---

**Built with pride for Pakistan Healthcare Modernization.**  
**Lead Developer:** Raza
