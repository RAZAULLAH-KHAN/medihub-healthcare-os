# 04 — Frontend Specification Document
## MediHub — AI-Powered Multi-Hospital Management Platform

> Written from a senior UI/UX perspective. Goal: calm, trustworthy, clinical-but-warm — not sterile hospital-white, not consumer-app-flashy.

---

## 1. Design Direction

Medical products fail visually in two directions: too clinical (cold white/grey, feels like a form) or too playful (feels unserious for health data). The target here is **"calm clarity"** — soft, desaturated color, generous whitespace, high-contrast text for readability, and a single confident accent color used sparingly for actions.

## 2. Color System

| Token | Hex | Use |
|---|---|---|
| `--color-primary` | `#0F766E` (deep teal) | Primary actions, active nav, links — teal reads as medical + trustworthy without being a cliché hospital-blue |
| `--color-primary-hover` | `#0B5A54` | Hover/active state |
| `--color-secondary` | `#3B82F6` (calm blue) | Secondary actions, informational badges |
| `--color-accent` | `#F59E0B` (warm amber) | Used **only** for attention items: "waiting," reminders, pending states — never for errors |
| `--color-success` | `#16A34A` | Confirmed appointment, report ready |
| `--color-danger` | `#DC2626` | Errors, emergency-flagged patients, destructive actions |
| `--color-emergency` | `#B91C1C` on `#FEE2E2` background | Reserved exclusively for the Emergency Checkup flow so it's instantly recognizable |
| `--color-bg` | `#F8FAFC` | App background (soft, not pure white — reduces eye strain in long shifts) |
| `--color-surface` | `#FFFFFF` | Cards, panels |
| `--color-border` | `#E2E8F0` | Dividers, input borders |
| `--color-text-primary` | `#0F172A` | Body text |
| `--color-text-secondary` | `#64748B` | Meta text, timestamps, helper text |

**Accessibility:** every text/background pairing above meets WCAG AA contrast (4.5:1 for body text). Never convey status by color alone — always pair color with an icon or label (important for colorblind users, and this is a healthcare app).

## 3. Typography

- **Font:** Inter (or system-ui fallback) — highly legible at small sizes, works well in dense data tables (patient lists, queues)
- Scale: `12 / 14 / 16 / 20 / 24 / 32` px
- Body text minimum `16px` — never smaller, this app will be read by patients of all ages
- Headings: semi-bold, never full-bold-everywhere (keeps hierarchy calm, not shouty)

## 4. Layout & Responsiveness

- **Desktop-first for staff roles** (reception/doctor dashboards are used on a desk PC) with a min-width sidebar nav
- **Mobile-first for patient roles** (booking, queue tracking, reports) since patients primarily use phones
- Breakpoints: `640px` (mobile) / `1024px` (tablet) / `1280px+` (desktop)
- Queue/waiting screen must be legible from across a waiting room — large token number, high contrast, auto-refreshing

## 5. Screens by Role

### Patient
1. Sign up / Log in / Email verify / Password reset
2. Hospital search → Department → Doctor → Slot picker
3. Booking confirmation
4. **Live queue tracker** (token number, estimated wait, position — the hero screen for the demo)
5. Medical history list → Report detail (with AI summary + disclaimer)
6. Reminders/notifications inbox
7. Profile / account settings / delete account

### Receptionist
1. Login → Today's queue dashboard (per department)
2. Patient check-in (search existing / register new)
3. Call next / mark no-show / emergency flag

### Doctor
1. Login → My queue / today's patients
2. Patient detail (history + write report/prescription)
3. Mark visit complete

### Hospital Admin
1. Login → Hospital dashboard (staff list, department list, today's stats)
2. Add/manage doctors & departments
3. Analytics (appointments/day, average wait time, no-show rate)

### Super Admin
1. Login → All-hospitals overview (cards per hospital: patient count, active staff, status)
2. Onboard new hospital (form)
3. Cross-hospital analytics

## 6. Component States (required for every data-driven view)

Every list/detail screen (queue, appointments, reports, staff list) must explicitly design for:
- **Empty state** — friendly illustration/icon + one-line explanation + primary CTA (e.g., "No appointments yet — book your first visit")
- **Loading state** — skeleton loaders, not blank screens or spinners-only
- **Error state** — clear message + retry action, never a raw error code
- **Network/offline state** — banner ("You're offline — showing last known queue position") especially critical on the live queue screen

## 7. Key User Flows to Prototype First (highest demo value)

1. Patient books appointment → sees confirmation → sees live queue position update in real time
2. Doctor writes report → AI summary appears → patient sees it in their history
3. Super Admin views two hospitals side-by-side, proving tenant isolation visually

## 8. Emergency Checkup Visual Treatment

- Distinct red banner/badge state (`--color-emergency`) so an emergency-flagged patient is unmistakable in any staff queue view
- Skips normal position ordering — shown pinned to top of queue list with a pulsing indicator

## 9. Accessibility Checklist

- Alt text on all icons/illustrations
- Full keyboard navigation on booking flow
- Screen-reader labels on queue status updates (`aria-live="polite"` region for the live token number)
- Minimum tap target 44x44px on mobile
- Color + icon + text label for every status, never color alone
