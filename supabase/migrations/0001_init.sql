-- MediHub schema + RLS
-- Run in Supabase SQL editor (or supabase db push)

create extension if not exists "pgcrypto";

-- Drop previous conflicting tables if any to ensure clean MediHub schema
drop table if exists public.queue_tokens cascade;
drop table if exists public.medical_reports cascade;
drop table if exists public.reminders cascade;
drop table if exists public.notifications cascade;
drop table if exists public.appointments cascade;
drop table if exists public.patients cascade;
drop table if exists public.doctors cascade;
drop table if exists public.departments cascade;
drop table if exists public.profiles cascade;
drop table if exists public.hospitals cascade;
drop table if exists public.audit_logs cascade;

-- Clean enum types
drop type if exists public.user_role cascade;
create type public.user_role as enum (
  'super_admin', 'hospital_admin', 'doctor', 'receptionist', 'lab_staff', 'patient'
);

drop type if exists public.appointment_status cascade;
create type public.appointment_status as enum (
  'booked', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show'
);

drop type if exists public.queue_status cascade;
create type public.queue_status as enum (
  'waiting', 'called', 'in_progress', 'done', 'skipped', 'no_show'
);

create table if not exists public.hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  address text,
  subscription_plan text not null default 'starter',
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role public.user_role not null default 'patient',
  hospital_id uuid references public.hospitals (id) on delete set null,
  name text not null,
  phone text,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals (id) on delete cascade,
  name text not null
);

create table if not exists public.doctors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  hospital_id uuid not null references public.hospitals (id) on delete cascade,
  department_id uuid not null references public.departments (id) on delete cascade,
  specialty text,
  slot_duration_minutes int not null default 15,
  working_hours jsonb not null default '{
    "mon":{"start":"09:00","end":"17:00"},
    "tue":{"start":"09:00","end":"17:00"},
    "wed":{"start":"09:00","end":"17:00"},
    "thu":{"start":"09:00","end":"17:00"},
    "fri":{"start":"09:00","end":"17:00"},
    "sat":{"start":"09:00","end":"13:00"},
    "sun":null
  }'::jsonb
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  dob date,
  gender text,
  blood_group text,
  emergency_contact text
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  slot_time timestamptz not null,
  status public.appointment_status not null default 'booked',
  is_emergency boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.queue_tokens (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals (id) on delete cascade,
  department_id uuid references public.departments (id) on delete set null,
  appointment_id uuid references public.appointments (id) on delete set null,
  token_number int not null,
  status public.queue_status not null default 'waiting',
  is_emergency boolean not null default false,
  called_at timestamptz,
  service_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.medical_reports (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals (id) on delete cascade,
  patient_id uuid not null references public.profiles (id) on delete cascade,
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete set null,
  content text not null,
  prescription text,
  ai_summary text,
  attachments text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  target_time timestamptz not null,
  sent_at timestamptz,
  channel text not null default 'in_app',
  appointment_id uuid references public.appointments (id) on delete cascade
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid references public.hospitals (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  table_name text,
  record_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_hospital on public.profiles (hospital_id);
create index if not exists idx_appointments_hospital_slot on public.appointments (hospital_id, slot_time);
create index if not exists idx_queue_day on public.queue_tokens (hospital_id, department_id, service_date);
create unique index if not exists idx_queue_unique_appt_day
  on public.queue_tokens (appointment_id, service_date)
  where appointment_id is not null;

-- Auth helpers (security definer, bypass RLS to avoid recursion)
create or replace function public.auth_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.profiles where id = auth.uid() and deleted_at is null
$$;

create or replace function public.auth_hospital_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select hospital_id from public.profiles where id = auth.uid() and deleted_at is null
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.auth_role() in ('hospital_admin', 'doctor', 'receptionist', 'lab_staff')
$$;

-- New user trigger: default patient profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text;
  resolved public.user_role;
begin
  meta_role := coalesce(new.raw_user_meta_data->>'role', 'patient');
  if meta_role not in ('super_admin','hospital_admin','doctor','receptionist','lab_staff','patient') then
    meta_role := 'patient';
  end if;
  -- Public signup may only create patients
  if new.raw_user_meta_data->>'created_by_admin' is distinct from 'true' then
    meta_role := 'patient';
  end if;
  resolved := meta_role::public.user_role;

  insert into public.profiles (id, email, role, hospital_id, name, phone)
  values (
    new.id,
    coalesce(new.email, ''),
    resolved,
    nullif(new.raw_user_meta_data->>'hospital_id', '')::uuid,
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, 'user'), '@', 1)),
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;

  if resolved = 'patient' then
    insert into public.patients (user_id) values (new.id) on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_user_created on auth.users;
drop trigger if exists handle_new_user on auth.users;
drop trigger if exists trg_profiles on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Derive hospital_id from doctor on appointment insert
create or replace function public.appointments_set_hospital()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  doc_hospital uuid;
begin
  select hospital_id into doc_hospital from public.doctors where id = new.doctor_id;
  if doc_hospital is null then
    raise exception 'Invalid doctor';
  end if;
  new.hospital_id := doc_hospital;
  if public.auth_role() = 'patient' then
    new.patient_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_appointments_set_hospital on public.appointments;
create trigger trg_appointments_set_hospital
  before insert on public.appointments
  for each row execute function public.appointments_set_hospital();

-- Atomic check-in
create or replace function public.check_in_appointment(p_appointment_id uuid, p_emergency boolean default false)
returns public.queue_tokens
language plpgsql
security definer
set search_path = public
as $$
declare
  appt public.appointments;
  doc public.doctors;
  next_num int;
  token public.queue_tokens;
  role text;
begin
  role := public.auth_role();
  select * into appt from public.appointments where id = p_appointment_id;
  if appt.id is null then
    raise exception 'Appointment not found';
  end if;
  if role = 'patient' and appt.patient_id <> auth.uid() then
    raise exception 'Not allowed';
  end if;
  if role in ('receptionist', 'hospital_admin', 'doctor')
     and appt.hospital_id <> public.auth_hospital_id() then
    raise exception 'Not allowed';
  end if;
  if role = 'super_admin' then
    null;
  elsif role not in ('patient', 'receptionist', 'hospital_admin', 'doctor') then
    raise exception 'Not allowed';
  end if;

  select * into doc from public.doctors where id = appt.doctor_id;

  perform pg_advisory_xact_lock(hashtext(appt.hospital_id::text || coalesce(doc.department_id::text, '') || current_date::text));

  select * into token
  from public.queue_tokens
  where appointment_id = appt.id and service_date = current_date;

  if token.id is not null then
    if p_emergency and not token.is_emergency then
      update public.queue_tokens
        set is_emergency = true
        where id = token.id
        returning * into token;
    end if;
    return token;
  end if;

  select coalesce(max(token_number), 0) + 1 into next_num
  from public.queue_tokens
  where hospital_id = appt.hospital_id
    and department_id is not distinct from doc.department_id
    and service_date = current_date;

  insert into public.queue_tokens (
    hospital_id, department_id, appointment_id, token_number, status, is_emergency, service_date
  )
  values (
    appt.hospital_id, doc.department_id, appt.id, next_num, 'waiting',
    coalesce(p_emergency, appt.is_emergency), current_date
  )
  returning * into token;

  update public.appointments
    set status = 'checked_in', is_emergency = token.is_emergency
    where id = appt.id;

  return token;
end;
$$;

grant execute on function public.check_in_appointment(uuid, boolean) to authenticated;

-- RLS
alter table public.hospitals enable row level security;
alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.doctors enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.queue_tokens enable row level security;
alter table public.medical_reports enable row level security;
alter table public.reminders enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- Hospitals
drop policy if exists hospitals_select on public.hospitals;
create policy hospitals_select on public.hospitals for select using (
  public.auth_role() = 'super_admin'
  or public.auth_role() = 'patient'
  or id = public.auth_hospital_id()
);

drop policy if exists hospitals_write_super on public.hospitals;
create policy hospitals_write_super on public.hospitals for all using (
  public.auth_role() = 'super_admin'
) with check (public.auth_role() = 'super_admin');

drop policy if exists hospitals_update_admin on public.hospitals;
create policy hospitals_update_admin on public.hospitals for update using (
  public.auth_role() = 'hospital_admin' and id = public.auth_hospital_id()
);

-- Profiles
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles for select using (
  id = auth.uid()
  or public.auth_role() = 'super_admin'
  or (
    public.is_staff()
    and hospital_id = public.auth_hospital_id()
    and hospital_id is not null
  )
);

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update using (
  id = auth.uid()
) with check (
  id = auth.uid()
  and role = public.auth_role()::public.user_role
  and hospital_id is not distinct from public.auth_hospital_id()
);

-- Departments
drop policy if exists departments_select on public.departments;
create policy departments_select on public.departments for select using (
  public.auth_role() = 'super_admin'
  or public.auth_role() = 'patient'
  or hospital_id = public.auth_hospital_id()
);

drop policy if exists departments_write on public.departments;
create policy departments_write on public.departments for all using (
  public.auth_role() = 'super_admin'
  or (public.auth_role() = 'hospital_admin' and hospital_id = public.auth_hospital_id())
) with check (
  public.auth_role() = 'super_admin'
  or (public.auth_role() = 'hospital_admin' and hospital_id = public.auth_hospital_id())
);

-- Doctors
drop policy if exists doctors_select on public.doctors;
create policy doctors_select on public.doctors for select using (
  public.auth_role() = 'super_admin'
  or public.auth_role() = 'patient'
  or hospital_id = public.auth_hospital_id()
);

drop policy if exists doctors_write on public.doctors;
create policy doctors_write on public.doctors for all using (
  public.auth_role() = 'super_admin'
  or (public.auth_role() = 'hospital_admin' and hospital_id = public.auth_hospital_id())
) with check (
  public.auth_role() = 'super_admin'
  or (public.auth_role() = 'hospital_admin' and hospital_id = public.auth_hospital_id())
);

-- Patients table
drop policy if exists patients_select on public.patients;
create policy patients_select on public.patients for select using (
  user_id = auth.uid()
  or public.auth_role() = 'super_admin'
  or (
    public.is_staff()
    and exists (
      select 1 from public.profiles p
      where p.id = patients.user_id
        and p.hospital_id = public.auth_hospital_id()
    )
  )
  or exists (
    select 1 from public.appointments a
    where a.patient_id = patients.user_id
      and a.hospital_id = public.auth_hospital_id()
      and public.is_staff()
  )
);

drop policy if exists patients_self_write on public.patients;
create policy patients_self_write on public.patients for update using (user_id = auth.uid());

-- Appointments
drop policy if exists appointments_select on public.appointments;
create policy appointments_select on public.appointments for select using (
  public.auth_role() = 'super_admin'
  or (public.auth_role() = 'patient' and patient_id = auth.uid())
  or (
    public.auth_role() in ('hospital_admin', 'receptionist')
    and hospital_id = public.auth_hospital_id()
  )
  or (
    public.auth_role() = 'doctor'
    and hospital_id = public.auth_hospital_id()
    and doctor_id in (select id from public.doctors where user_id = auth.uid())
  )
);

drop policy if exists appointments_insert_patient on public.appointments;
create policy appointments_insert_patient on public.appointments for insert with check (
  public.auth_role() = 'patient' and patient_id = auth.uid()
);

drop policy if exists appointments_insert_reception on public.appointments;
create policy appointments_insert_reception on public.appointments for insert with check (
  public.auth_role() in ('receptionist', 'hospital_admin')
  and hospital_id = public.auth_hospital_id()
);

drop policy if exists appointments_update on public.appointments;
create policy appointments_update on public.appointments for update using (
  public.auth_role() = 'super_admin'
  or (public.auth_role() = 'patient' and patient_id = auth.uid())
  or (
    public.auth_role() in ('hospital_admin', 'receptionist', 'doctor')
    and hospital_id = public.auth_hospital_id()
  )
);

-- Queue
drop policy if exists queue_select on public.queue_tokens;
create policy queue_select on public.queue_tokens for select using (
  public.auth_role() = 'super_admin'
  or hospital_id = public.auth_hospital_id()
  or exists (
    select 1 from public.appointments a
    where a.id = queue_tokens.appointment_id and a.patient_id = auth.uid()
  )
);

drop policy if exists queue_staff_update on public.queue_tokens;
create policy queue_staff_update on public.queue_tokens for update using (
  public.auth_role() in ('hospital_admin', 'receptionist', 'doctor')
  and hospital_id = public.auth_hospital_id()
);

-- Reports
drop policy if exists reports_select on public.medical_reports;
create policy reports_select on public.medical_reports for select using (
  public.auth_role() = 'super_admin'
  or (public.auth_role() = 'patient' and patient_id = auth.uid())
  or (
    public.auth_role() = 'doctor'
    and hospital_id = public.auth_hospital_id()
    and doctor_id in (select id from public.doctors where user_id = auth.uid())
  )
  or (
    public.auth_role() = 'lab_staff'
    and hospital_id = public.auth_hospital_id()
  )
);

drop policy if exists reports_insert_doctor on public.medical_reports;
create policy reports_insert_doctor on public.medical_reports for insert with check (
  public.auth_role() in ('doctor', 'lab_staff')
  and hospital_id = public.auth_hospital_id()
);

drop policy if exists reports_update_doctor on public.medical_reports;
create policy reports_update_doctor on public.medical_reports for update using (
  public.auth_role() in ('doctor', 'lab_staff', 'super_admin')
  and (hospital_id = public.auth_hospital_id() or public.auth_role() = 'super_admin')
);

-- Reminders / notifications
drop policy if exists reminders_own on public.reminders;
create policy reminders_own on public.reminders for select using (
  user_id = auth.uid() or public.auth_role() = 'super_admin'
);

drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications for select using (
  user_id = auth.uid() or public.auth_role() = 'super_admin'
);

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update using (
  user_id = auth.uid()
);

-- Audit
drop policy if exists audit_select on public.audit_logs;
create policy audit_select on public.audit_logs for select using (
  public.auth_role() = 'super_admin'
  or (public.is_staff() and hospital_id = public.auth_hospital_id())
);

-- Realtime
alter table public.queue_tokens replica identity full;
alter table public.notifications replica identity full;

do $$ begin
  execute 'alter publication supabase_realtime add table public.queue_tokens';
exception when duplicate_object then null; when undefined_object then null; end $$;

do $$ begin
  execute 'alter publication supabase_realtime add table public.notifications';
exception when duplicate_object then null; when undefined_object then null; end $$;

-- Storage
insert into storage.buckets (id, name, public)
values ('medical-files', 'medical-files', false)
on conflict (id) do nothing;

drop policy if exists medical_files_staff_insert on storage.objects;
create policy medical_files_staff_insert on storage.objects for insert with check (
  bucket_id = 'medical-files'
  and public.auth_role() in ('doctor', 'lab_staff', 'hospital_admin')
);

drop policy if exists medical_files_read on storage.objects;
create policy medical_files_read on storage.objects for select using (
  bucket_id = 'medical-files'
  and (
    public.auth_role() = 'super_admin'
    or public.auth_role() in ('doctor', 'lab_staff', 'hospital_admin')
    or public.auth_role() = 'patient'
    
  )
);
