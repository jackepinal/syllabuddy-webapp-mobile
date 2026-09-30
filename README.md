# Syllabuddy

Phases 0–2 of the build roadmap: project scaffold, accounts, manual
term/course management, and AI syllabus upload. No grade calculator or
payments yet — those are Phases 3–5.

## What's in this build

- Sign up / log in (Supabase Auth, email + password)
- Create terms (a semester or quarter)
- Add courses to a term by hand, each with a color and icon
- Upload a syllabus — a PDF, DOCX, pasted text, or a public course website
  link (Claude fetches it directly, and will follow an obvious in-page link
  to the actual syllabus/schedule page) — and have Claude pull out the
  grading breakdown, every assignment with its due date, recurring class
  meeting times, a short plain-English summary of each assignment, and a
  key-policies card (late work, attendance, academic integrity, etc.)
- A review screen where you edit/remove anything Claude got wrong before it's
  saved — nothing is written to your course silently
- A dashboard listing your terms and courses, each course shown as a bubble in
  the color you picked for it
- A course detail page showing the grading breakdown and upcoming assignments
  once a syllabus has been reviewed
- An Assignments tab with every assignment across every course in one vertical
  list (or a Google-Calendar-style week view), filterable by due date, class,
  and status
- Each assignment carries a status — To do, In progress, Complete! (purple,
  yellow, green), or an automatic red Overdue once its due date passes and
  it isn't marked complete — editable from a dropdown anywhere it's listed
- Add an assignment by hand, or edit one's title/due date/points/description
  — for anything a syllabus upload didn't catch or got wrong
- A Schedule tab for a weekly recurring schedule: class meeting times (pulled
  in from syllabus upload, or added by hand) plus student-added
  extracurriculars, each shown as a list or a weekly time grid; tapping a
  class opens that course's page and its assignments
- Every table is protected by row-level security, so each student only ever
  sees their own data
- A `free_forever` flag on every account and a dormant `subscriptions` table,
  ready for the paywall described in the plan — nothing charges anyone yet

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com), create a free account, and
   create a new project.
2. Once it's ready, open **Project Settings → API**. You'll need the
   **Project URL** and the **anon / public key** in a moment.
3. Open **SQL Editor → New query**, paste in the contents of
   [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates
   every table, the private `syllabi` storage bucket for uploaded files, and
   the row-level security policies that keep each student's data private.
   Safe to re-run any time the schema changes — every statement is guarded.
4. Optional, for faster testing: in **Authentication → Providers → Email**,
   you can turn off "Confirm email" so new accounts can log in immediately
   instead of needing to click a confirmation link first. Turn it back on
   before you launch for real.

## 2. Get an Anthropic API key

Syllabus upload reads the file with Claude, so you need an API key from
[console.anthropic.com](https://console.anthropic.com) → **API Keys** → **Create
Key**. Buying a small amount of usage credit ($5 is plenty to build and test
with) is a separate step on the same site if your account doesn't have any
yet.

## 3. Run it locally

```bash
npm install
cp .env.local.example .env.local
```

Open `.env.local` and paste in your Supabase Project URL, Supabase anon key,
and Anthropic API key.

```bash
npm run dev
```

Visit `http://localhost:3000` — it redirects to `/signup`. Create an
account, create a term, add a course, then open that course and upload a
syllabus (a real one, or paste some text) to try the extraction + review flow.

## 4. Deploy

The app is a standard Next.js app, so it deploys to
[Vercel](https://vercel.com) with no extra configuration:

1. Push this project to a GitHub repo.
2. In Vercel, "Add New Project" → import that repo.
3. Add all three environment variables from `.env.local` in the Vercel
   project's settings.
4. Deploy.

## Project layout

```
src/
  app/
    login/, signup/                     sign in / create account
    (app)/                              everything behind auth (dashboard, terms, courses, assignments, schedule)
      courses/[courseId]/syllabus/review/  the extraction review-and-edit screen
      assignments/                      every assignment: scroll or week view, filterable by date/class/status
      schedule/                         weekly classes + extracurriculars: agenda or week-grid view
    actions/                            server actions: auth.ts, terms.ts, courses.ts, syllabus.ts, assignments.ts, schedule.ts
  components/
    ui/                                 Button, Input, Card, Select
    CourseForm.tsx                      the color + icon picker
    SyllabusUpload.tsx                  file/paste-text upload form
    SyllabusReviewForm.tsx              editable review screen before saving
    AssignmentsList.tsx / AssignmentRow.tsx / AssignmentForm.tsx   the scrollable list, each row, add/edit form
    AssignmentsWeekView.tsx             the Google-Calendar-style week view
    AssignmentStatusSelect.tsx          the To do / In progress / Overdue / Complete! dropdown
    ScheduleForm.tsx / ScheduleList.tsx / ScheduleWeekView.tsx     add a class or activity; agenda and week-grid views
  lib/
    supabase/                           browser + server Supabase clients
    claude/                             Anthropic client + the syllabus extraction prompt/tool
    file-text.ts                        DOCX/TXT text extraction (PDFs go to Claude directly)
    types.ts                            hand-written types matching supabase/schema.sql
    status.ts                           assignment status labels/colors + the auto-overdue rule
    format.ts                           shared due-date formatting/parsing
    schedule.ts                         shared schedule display helpers (name/color/icon, time formatting)
  middleware.ts                          keeps sessions fresh, redirects signed-out users
supabase/
  schema.sql                             run this once in the Supabase SQL editor
```

## What's next

Following the build roadmap: Phase 3 adds the grade calculator and "what do I
need" simulator, using the grading categories syllabus upload already saves.
Phase 4's assignment list and weekly schedule are done; a monthly calendar
view is still open. Phase 5 wires up Stripe behind a `PAYWALL_ENABLED` flag,
kept off until it's time to charge new signups.
