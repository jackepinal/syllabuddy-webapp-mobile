-- Syllabuddy database schema
-- Run this once in your Supabase project's SQL editor (Project -> SQL Editor -> New query).
-- Safe to re-run: every statement below is guarded so a second run won't error.

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- profiles: one row per student, mirrors auth.users
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  free_forever boolean not null default true, -- true = signed up before the paywall existed
  created_at timestamptz not null default now()
);

-- auto-create a profile row whenever someone signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- terms: a semester/quarter
-- ---------------------------------------------------------------------------
create table if not exists public.terms (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- courses: one class within a term
-- ---------------------------------------------------------------------------
create table if not exists public.courses (
  id uuid primary key default uuid_generate_v4(),
  term_id uuid not null references public.terms (id) on delete cascade,
  name text not null,
  code text,
  instructor text,
  color text not null default '#2c4a7c',
  icon text not null default '📘',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- syllabi: the uploaded file + what the AI extracted from it (Phase 2)
-- ---------------------------------------------------------------------------
create table if not exists public.syllabi (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references public.courses (id) on delete cascade,
  file_url text,
  raw_text text,
  parsed_json jsonb,
  review_status text not null default 'pending', -- pending | reviewed
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- grade_categories: grading breakdown per course (Phase 3)
-- ---------------------------------------------------------------------------
create table if not exists public.grade_categories (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references public.courses (id) on delete cascade,
  name text not null,
  weight_pct numeric not null default 0,
  drop_lowest_n int not null default 0,
  sort_order int not null default 0
);

-- ---------------------------------------------------------------------------
-- assignments: every graded item (Phase 2 / 3 / 4)
-- ---------------------------------------------------------------------------
create table if not exists public.assignments (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references public.courses (id) on delete cascade,
  category_id uuid references public.grade_categories (id) on delete set null,
  title text not null,
  due_at timestamptz,
  points_possible numeric,
  points_earned numeric,
  status text not null default 'todo', -- todo | in_progress | overdue | complete
  description_raw text,
  ai_summary text,
  created_at timestamptz not null default now()
);

-- Migrate any rows from the old status vocabulary (upcoming/submitted/graded)
-- to the new one, then lock the column down with a check constraint. Safe to
-- re-run: the update is a no-op once every row already matches, and the
-- constraint is dropped and recreated each time.
alter table public.assignments alter column status set default 'todo';
update public.assignments
  set status = case status
    when 'submitted' then 'in_progress'
    when 'graded' then 'complete'
    else 'todo'
  end
  where status not in ('todo', 'in_progress', 'overdue', 'complete');
alter table public.assignments drop constraint if exists assignments_status_check;
alter table public.assignments
  add constraint assignments_status_check
  check (status in ('todo', 'in_progress', 'overdue', 'complete'));

-- ---------------------------------------------------------------------------
-- schedule_blocks: recurring weekly time blocks. Either a class meeting
-- (course_id set, name/color/icon borrowed from the course) or a student-
-- added extracurricular (course_id null, title/color/icon of its own).
-- ---------------------------------------------------------------------------
create table if not exists public.schedule_blocks (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid references public.courses (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  title text,
  color text,
  icon text,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  location text
);

-- Widen an older schedule_blocks table (course_id used to be required, and
-- there was no user_id/title/color/icon) to the shape above. Safe to re-run.
alter table public.schedule_blocks alter column course_id drop not null;
alter table public.schedule_blocks add column if not exists user_id uuid references public.profiles (id) on delete cascade;
alter table public.schedule_blocks add column if not exists title text;
alter table public.schedule_blocks add column if not exists color text;
alter table public.schedule_blocks add column if not exists icon text;
update public.schedule_blocks sb
  set user_id = t.user_id
  from public.courses c
  join public.terms t on t.id = c.term_id
  where sb.course_id = c.id and sb.user_id is null;
alter table public.schedule_blocks drop constraint if exists schedule_blocks_owner_check;
alter table public.schedule_blocks
  add constraint schedule_blocks_owner_check
  check (course_id is not null or title is not null);

-- ---------------------------------------------------------------------------
-- subscriptions: dormant until the paywall flag is switched on (Phase 5)
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  price_id text,
  current_period_end timestamptz
);

-- ---------------------------------------------------------------------------
-- Row Level Security: every student can only ever see their own data
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.terms enable row level security;
alter table public.courses enable row level security;
alter table public.syllabi enable row level security;
alter table public.grade_categories enable row level security;
alter table public.assignments enable row level security;
alter table public.schedule_blocks enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own terms" on public.terms;
create policy "own terms" on public.terms
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own courses" on public.courses;
create policy "own courses" on public.courses
  for all using (
    exists (select 1 from public.terms t where t.id = term_id and t.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.terms t where t.id = term_id and t.user_id = auth.uid())
  );

drop policy if exists "own syllabi" on public.syllabi;
create policy "own syllabi" on public.syllabi
  for all using (
    exists (
      select 1 from public.courses c
      join public.terms t on t.id = c.term_id
      where c.id = course_id and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.courses c
      join public.terms t on t.id = c.term_id
      where c.id = course_id and t.user_id = auth.uid()
    )
  );

drop policy if exists "own grade categories" on public.grade_categories;
create policy "own grade categories" on public.grade_categories
  for all using (
    exists (
      select 1 from public.courses c
      join public.terms t on t.id = c.term_id
      where c.id = course_id and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.courses c
      join public.terms t on t.id = c.term_id
      where c.id = course_id and t.user_id = auth.uid()
    )
  );

drop policy if exists "own assignments" on public.assignments;
create policy "own assignments" on public.assignments
  for all using (
    exists (
      select 1 from public.courses c
      join public.terms t on t.id = c.term_id
      where c.id = course_id and t.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.courses c
      join public.terms t on t.id = c.term_id
      where c.id = course_id and t.user_id = auth.uid()
    )
  );

drop policy if exists "own schedule blocks" on public.schedule_blocks;
create policy "own schedule blocks" on public.schedule_blocks
  for all using (
    user_id = auth.uid()
    or exists (
      select 1 from public.courses c
      join public.terms t on t.id = c.term_id
      where c.id = course_id and t.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.courses c
      join public.terms t on t.id = c.term_id
      where c.id = course_id and t.user_id = auth.uid()
    )
  );

drop policy if exists "own subscription" on public.subscriptions;
create policy "own subscription" on public.subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage: a private bucket for uploaded syllabus files (Phase 2)
-- Files are stored at "<user_id>/<course_id>/<filename>" so the policies
-- below can key off the first folder segment matching the signed-in user.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'syllabi',
  'syllabi',
  false,
  15728640, -- 15 MB
  array['application/pdf', 'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "own syllabus files" on storage.objects;
create policy "own syllabus files" on storage.objects
  for all using (
    bucket_id = 'syllabi' and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'syllabi' and (storage.foldername(name))[1] = auth.uid()::text
  );
