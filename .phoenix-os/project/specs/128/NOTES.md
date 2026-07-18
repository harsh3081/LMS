# Issue #128 — Move Lead Management content off `/` and add a real Dashboard placeholder

Fast-track implementation (direct user request, continuing #126's sidebar work). Handled directly by the orchestrator rather than a full agent delegation, given the small, well-contained scope. This document records what changed, test results, and known gaps.

## What was built

- **`frontend/src/pages/LeadManagementPage.tsx`** (new) — a straight rename/relocation of the former `LandingPage.tsx`. Identical behavior (My Leads table, "New Lead" slide-over quick action, "New Enquiry" link) except the page's own `<h1>` changed from "Dashboard" to "Lead Management", and it now mounts at `/leads` instead of `/`.
- **`frontend/src/pages/DashboardPage.tsx`** (new) — a genuinely new, deliberately minimal placeholder for `/`: a heading + a short "coming soon" message inside a `Card`. No data fetching, no Lead Management content. A real Dashboard will be designed in a later step.
- **`frontend/src/App.tsx`** — `/` now routes to `DashboardPage`; new `/leads` route added for `LeadManagementPage`.
- **`frontend/src/components/layout/Sidebar.tsx`** — `NavGroup` gained an optional `to` field; when present, the group's label renders as a `NavLink` instead of a plain `<p>`. Only "Lead Management" has one so far (`to: '/leads'`), since it's the only section with a landing page today — Enquiry Management and Test Drive Scheduling keep plain labels until their own landing pages exist. No `end` on this link, so it stays highlighted for any nested `/leads/*` route (e.g. `/leads/new`, `/leads/:id`), which reads naturally as "you're somewhere in Lead Management."
- Old `LandingPage.tsx`/`LandingPage.spec.tsx` deleted (superseded, not deprecated-in-place — this codebase's convention is to delete superseded files outright, not leave renamed-but-unused code around).

## Why `/` stays "Dashboard" (not moved to a new path)

Six existing pages (`ConvertLeadPage`, `LeadDetailPage`, `LogFollowupPage`, `TestDriveSchedulerPage`, `UpcomingFollowupsPage`, `UpcomingTestDrivesPage`) already have a "Back to Dashboard" link pointing at `/`. Keeping `/` as the Dashboard route (just swapping what's mounted there) means every one of those links stays correct with zero changes — verified by grep, no changes were needed to any of them.

## Test results

- Full frontend regression: **32/32 files, 221/221 tests passing** (`npx vitest run`).
- `npx tsc -b --force` (forced, not incremental) — clean.
- `npx eslint . --max-warnings=0` — clean.
- New: `DashboardPage.spec.tsx` (2 tests: renders placeholder content, does NOT render Lead Management content). `LeadManagementPage.spec.tsx` is a renamed `LandingPage.spec.tsx` with only heading-text/import updates — same coverage as before (AC4 link-trim proof, New Lead toggle/slide-over end-to-end, New Enquiry toggle). `Sidebar.spec.tsx` extended with 3 new assertions for "Lead Management" being a link now (default state, active on `/leads`, active on a nested `/leads/*` route).
- No other existing test file needed changes — verified via `grep` that no other spec asserted on the old Dashboard heading text or depended on `/` showing Lead Management content.

## Known gaps

- The real Dashboard's actual content/design is explicitly out of scope — this is a placeholder only, per the user's own framing ("which we will do later").
- Enquiry Management and Test Drive Scheduling sidebar groups still have no landing page of their own (their labels stay plain, non-clickable) — a natural follow-up once (if) those sections get their own aggregator pages, mirroring what this Story did for Lead Management.
