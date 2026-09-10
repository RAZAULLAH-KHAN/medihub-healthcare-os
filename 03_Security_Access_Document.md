# 03 — Security & Access Document
## MediHub — AI-Powered Multi-Hospital Management Platform

> Health data is sensitive by nature. Even for a hackathon demo, treat every patient record as if it were real. This doc maps your full 20-item security checklist into concrete implementation guidance, plus the RBAC model.

---

## 1. Role-Based Access Control (RBAC) Matrix

| Action | Super Admin | Hospital Admin | Doctor | Receptionist | Lab Staff | Patient |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Onboard a hospital | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View all hospitals' analytics | ✅ | ❌ (own only) | ❌ | ❌ | ❌ | ❌ |
| Manage staff for own hospital | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View own hospital's appointments/queue | ❌ | ✅ | ✅ (own patients) | ✅ | ❌ | ❌ |
| Write medical report | ❌ | ❌ | ✅ | ❌ | ✅ (lab results only) | ❌ |
| Book/cancel own appointment | ❌ | ❌ | ❌ | ✅ (on behalf of patient) | ❌ | ✅ |
| View own medical history | ❌ | ❌ | ✅ (their patients) | ❌ | ❌ | ✅ (self only) |
| Cross-hospital data access | ✅ only | ❌ | ❌ | ❌ | ❌ | ❌ |

**Golden rule:** every role except Super Admin is scoped to exactly one `hospital_id`, and every patient is scoped to exactly their own `patient_id`. This is enforced at the database layer (Row-Level Security), not just hidden in the UI.

## 2. Your 20-Item Security Checklist — Mapped

### Secrets & Infrastructure
1. **Hide API keys** — All keys (AI API key, DB service key, JWT secret) live in server-side env vars only. Never in frontend bundle, never in a public repo file.
2. **Purge Git secrets** — Before first commit: add `.env`, `.env.*` to `.gitignore`. Run `git log -p | grep -i key` before making the repo public; use `git filter-repo` if anything leaked.
3. **Use public DB key** — Frontend uses only the Supabase **anon/public** key, which is safe to expose because RLS restricts what it can actually read/write. The **service role key** never leaves the server.
4. **Enable row-level security** — Turn on RLS on every table in Postgres. Default-deny, then add explicit policies (see §3 below).
5. **Encrypt sensitive data** — Rely on at-rest encryption provided by the hosting DB (Supabase/Postgres does this by default); ensure all traffic is HTTPS (see #19) so data is encrypted in transit too.
6. **Enforce server-side auth** — Every write (create appointment, write report) must re-check the user's session role server-side — never trust a role sent from the client.
7. **Lock record access** — RLS policy: a row is only visible if `hospital_id = auth.hospital_id()` AND (role-appropriate condition, e.g. patient sees only `patient_id = auth.uid()`).
8. **Block field tampering** — Never accept `hospital_id`, `role`, or `user_id` as writable fields from client input on create/update calls — derive them from the authenticated session server-side.
9. **Secure session cookies** — `HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict`) on all session cookies; short-lived access tokens + refresh token rotation.
10. **Hash passwords** — Handled automatically by Supabase Auth (bcrypt/Argon2 under the hood) — never store or log plaintext passwords.

### Application Hardening
11. **Rate limit login** — Limit login attempts per IP/account (e.g., 5 attempts / 15 min) to block brute force.
12. **Add bot protection** — Add a CAPTCHA (hCaptcha/reCAPTCHA) on signup and login forms.
13. **Parameterize queries** — Use the Supabase client / an ORM (never raw string-concatenated SQL) to eliminate SQL injection risk.
14. **Validate all input** — Validate every form (email format, phone format, required fields) both client-side (UX) and server-side (security) — client-side validation is never suffient alone.
15. **Escape user content** — Any user-entered text (report notes, chat) must be escaped/sanitized before rendering to prevent XSS.
16. **Restrict file uploads** — Limit uploads (lab reports, profile pics) to allow-listed types (PDF, JPG, PNG), max size (e.g. 10MB), and scan/rename files server-side before storage.
17. **Trim API responses** — API responses should only include fields the requesting role needs — e.g., a patient's appointment list should never leak another patient's name.
18. **Add security headers** — Set `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` on all responses.
19. **Force HTTPS** — Enforce HTTPS redirects at the hosting layer (Vercel/Supabase do this by default) — never allow plain HTTP in production.
20. **Scan dependencies** — Run `npm audit` (or Dependabot/Snyk) before demo day; fix or acknowledge any high-severity findings.

## 3. Example Row-Level Security Policy (Postgres)

```sql
-- appointments table: patients see only their own rows, staff see only their hospital's rows
alter table appointments enable row level security;

create policy "patients_see_own_appointments"
on appointments for select
using (
  auth.jwt() ->> 'role' = 'patient'
  and patient_id = auth.uid()
);

create policy "staff_see_hospital_appointments"
on appointments for select
using (
  auth.jwt() ->> 'role' in ('hospital_admin','doctor','receptionist')
  and hospital_id = (auth.jwt() ->> 'hospital_id')::uuid
);

create policy "super_admin_sees_all"
on appointments for select
using ( auth.jwt() ->> 'role' = 'super_admin' );
```

Apply the same pattern (scoped `select`/`insert`/`update`/`delete` policies) to every tenant-scoped table.

## 4. Data Privacy Notes (health data specific)

- Store the minimum medical data necessary for the demo — avoid inventing sensitive real-looking data.
- Provide a "delete my account & data" action for patients (ties to PRD §5 account deletion item) — even a simple soft-delete + data purge job satisfies this for the hackathon.
- Any AI call sending a report for summarization should not send more patient-identifying data than needed, and must run server-side only (see #1, #6).
- Add a one-line privacy disclaimer on signup: what data is stored and why (good practice, and an easy point to demonstrate to judges).

## 5. Out of Scope for Hackathon (but note in slides as "roadmap")

- Full HIPAA/PDPA compliance audit
- Penetration testing
- SOC 2 / formal certifications
- Native mobile app store privacy labels (Apple Sign-In, Privacy Nutrition Labels) — only relevant if a native app ships later
