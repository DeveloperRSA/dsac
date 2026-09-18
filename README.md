# CIVITRACK — DSAC Public Funding & Accountability Management System

Expo Router app (React Native + Web) for the Department of Sport, Arts and
Culture, backed by Supabase (Postgres + Auth).

## 1. Setup

```bash
npm install
npm run web      # or: npm start / npm run android / npm run ios
```

### Environment variables

Supabase credentials live in `.env` at the project root:

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

**They must be prefixed with `EXPO_PUBLIC_`.** Expo/Metro only inlines
environment variables into the client bundle when they carry that prefix —
anything else is only visible to Node-based tooling, not to the app itself.
`src/services/supabase.js` reads `process.env.EXPO_PUBLIC_SUPABASE_URL` and
`process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY` and throws a clear error on boot
if either is missing.

---

## 2. Fixes made in this pass

| Issue | Fix |
|---|---|
| `.env` used unprefixed `supabaseUrl` / `supabaseAnonKey`, so the client bundle could never see them and the app would fail to start | Renamed to `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`, updated `src/services/supabase.js` to match, and gave the startup guard a real error message |
| `app/index.js` redirected `ORG_ADMIN` / `ORG_STAFF` / `EXTERNAL_COLLABORATOR` to `/organisation/dashboard`, but the folder was misspelled `app/organasation/` | Renamed the folder to `app/organisation/` |
| `app/index.js` redirected `DSAC_REVIEWER` to `/reviewer/dashboard`, which doesn't exist — that role had no working screen at all | Temporarily routed `DSAC_REVIEWER` to `/dsac/dashboard` so the role isn't stranded on a dead route. **A dedicated reviewer dashboard still needs to be built** — see §5 |
| `app/dsac/funding-agreements.jsx` was a stub: the form only showed an alert ("Supabase persistence will be connected next") and never wrote to the database, even though the DSAC dashboard was already counting rows from `funding_agreements` | Rewired the whole screen — organisation picker, insert-on-save, live record list, live summary stats, pull-to-refresh (see §4) |
| Decorative flag-colored borders (green `#007A4D`, gold `#D4A72C`/`#FFB81C`) on cards, headers and avatars across `cases.jsx`, `dashboard.jsx`, `organisations.tsx`, `funding-agreements.jsx`, `login.jsx` | Removed. The flag-colored strip graphic at the top of each screen and the neutral grey card borders were left as-is |
| Coat of arms favicon | Cropped from the supplied header image, background made transparent, and used to regenerate `assets/favicon.png`, `assets/icon.png`, `assets/android-icon-foreground.png` (paths already wired up in `app.json`) |

All edited files were checked with Babel's parser (`babel-preset-expo`) to
confirm they're syntactically valid.

---

## 3. How the DB ↔ frontend integration works

Every data screen follows the same three-part pattern. Once you understand
one, you understand all of them.

### a) Read — load data when the screen is focused

```js
const loadData = useCallback(async () => {
  const { data, error } = await supabase
    .from('table_name')
    .select('col1, col2, related_table ( id, name )')
    .order('created_at', { ascending: false });

  if (error) throw error;
  setState(data || []);
}, []);

useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
```

`useFocusEffect` (from `expo-router`) re-runs the fetch every time the
screen comes into view — so navigating back to a screen after creating a
record elsewhere always shows fresh data.

### b) Write — insert on form submit

```js
const { error } = await supabase.from('table_name').insert({
  col1: value1,
  col2: value2,
  created_by: user.id,
});

if (error) throw error;
await loadData(); // re-fetch so the UI reflects the new row immediately
```

### c) Dashboard — aggregate counts, not a separate data source

`app/dsac/dashboard.jsx` doesn't hold its own copy of the data. It runs
`count`-only queries against the *same* tables every other screen reads
and writes:

```js
supabase.from('organisations').select('id', { count: 'exact', head: true })
supabase.from('funding_agreements').select('id', { count: 'exact', head: true })
supabase.from('accountability_cases').select('id', { count: 'exact', head: true })
supabase.from('approvals').select('id', { count: 'exact', head: true })
```

**This is why "add it on the frontend, see it on the dashboard" already
works for organisations and accountability cases** — as soon as a row is
inserted into `organisations` or `accountability_cases`, the dashboard's
next load (on focus, or pull-to-refresh) will count it. There is no
separate sync step required.

`funding_agreements` was the one exception: the create form never actually
called `.insert()`, so rows never reached the table the dashboard was
already counting. That's fixed now (§2, §4).

### Current tables in use

| Table | Written by | Read by |
|---|---|---|
| `organisations` | `app/dsac/organisations.tsx` | dashboard count, `cases.jsx` org picker, `funding-agreements.jsx` org picker |
| `funding_agreements` | `app/dsac/funding-agreements.jsx` | dashboard count, `cases.jsx` funding picker |
| `accountability_cases` | `app/dsac/cases.jsx` | dashboard count |
| `approvals` | *(not yet written from the frontend)* | dashboard count (pending reviews) |
| `user_profiles` | *(managed via Supabase Auth / admin)* | `AuthContext.jsx`, `ProtectedRoute.jsx` — role + active-status gate on every screen |
| `organisation_memberships` | *(not yet written from the frontend)* | `app/organisation/dashboard.tsx` — links a signed-in user to their organisation |

### Adding a new "add on frontend → shows on dashboard" feature

1. **Create/confirm the table** in Supabase with the columns your form needs, plus `created_at` and `created_by`.
2. **Write a `loadX()` function** in the screen using the read pattern above, called from `useFocusEffect`.
3. **Write the insert** in your save handler using the write pattern above, then call `loadX()` again.
4. **Add a count query** for the new table in `app/dsac/dashboard.jsx`'s `loadDashboard()` `Promise.all([...])`, and add a field to `stats` / a `StatCard`.
5. Wrap the screen in `<ProtectedRoute allowedRoles={[...]}>` (see `src/constants/roles.js` for the role list) so only the right roles can reach it.

---

## 4. What changed specifically in Funding Agreements

`app/dsac/funding-agreements.jsx` now:

- Loads `organisations` (for a picker) and `funding_agreements` (joined to
  `organisations` for display) on focus, and on pull-to-refresh.
- Replaced the free-text "organisation" field with a picker sourced from
  the `organisations` table, so new agreements always link to a real
  `organisation_id` (matching how `cases.jsx` links cases to organisations
  and agreements).
- `saveAgreement()` validates the form, then inserts into
  `funding_agreements` (`agreement_number`, `title`, `organisation_id`,
  `allocated_amount`, `currency`, `start_date`, `end_date`, `status`,
  `created_by`) and reloads the list.
- The three summary tiles (Active Agreements / Total Allocation / Pending)
  and the record count are now computed from the live `agreements` array
  instead of hardcoded `0`.
- The empty state only shows when there are genuinely zero agreements;
  otherwise a list of record cards renders (agreement number, status,
  organisation name, amount, date range).

**Note:** if your `funding_agreements` table doesn't already have
`start_date` / `end_date` columns, add them (`date` type) — the form was
built expecting them but they weren't in the fields `cases.jsx` selects
from that table.

---

## 5. Known follow-ups (not fixed in this pass — flagging so nothing gets lost)

- **No reviewer dashboard exists.** `DSAC_REVIEWER` currently lands on the
  DSAC admin dashboard as a stopgap (see §2). `app/dsac/dashboard.jsx`,
  `cases.jsx`, `organisations.tsx`, and `funding-agreements.jsx` are all
  gated to `ROLES.DSAC_ADMIN` only, so a reviewer would currently be
  redirected but then bounced by `ProtectedRoute`. Building a real
  `/dsac/reviewer` (or similar) screen, or explicitly adding
  `ROLES.DSAC_REVIEWER` to the relevant `allowedRoles` arrays, is a
  product decision worth making deliberately rather than defaulting.
- **`approvals` and `organisation_memberships` are read-only from the
  frontend right now** — nothing in the app currently writes to them, so
  "Pending Reviews" on the dashboard and organisation membership will stay
  at whatever's seeded directly in Supabase until an approvals workflow
  and a membership-management screen are built.
- **Supabase Row Level Security (RLS):** this review only checked the
  frontend code. If RLS policies on `organisations`, `funding_agreements`,
  `accountability_cases`, etc. aren't set up to match `user_profiles.role`,
  inserts/selects that look correct here can still fail (or worse, over-
  expose data) at the database level — worth a separate pass in the
  Supabase dashboard.

---

## 6. Analytics, KPIs and Power BI (added in this pass)

The DSAC challenge statement's **Analytics Module** and **Early Warning
Functionality** requirements weren't implemented anywhere in the app yet.
This pass adds:

- **`/dsac/analytics`** — a new in-app screen (linked from the dashboard's
  "Analytics" nav item and a new "Analytics & Early Warning" quick-action
  card) covering:
  - **Target status overview** — accountability cases broken down into Not
    Started / In Progress / Under Review / Action Required / Completed,
    plus a distinct Deadline Missed count, computed from `status` and
    `due_date`.
  - **Early warning list** — cases due within 30 days or already overdue,
    ranked most urgent first, with OVERDUE / DUE IN 15 DAYS / DUE IN 30
    DAYS / DUE TODAY (hourly) severity bands — directly matching the
    challenge's "30 days / 15 days / hourly" countdown requirement.
  - **Funding allocation trend** — total allocated per month, last 6
    months with activity (the year-on-year comparison the Analytics
    Module asks for).
  - **Organisation growth (YoY)** — registered entities by year.
  - **A clearly-labelled placeholder** for staff demographics, job
    creation and audit findings — see below.
- Added a `due_date` field to the case-creation form in `cases.jsx` (it
  was already selected from the database but never captured on insert),
  so the early-warning list has real data to work with.
- **`sql/schema.sql`** — a new `entity_reports` table (reporting period,
  staff totals split by women/youth/persons with disabilities, jobs
  created, audit finding, target status, document link) plus five `v_*`
  views (`v_case_target_status`, `v_case_early_warning`,
  `v_funding_by_month`, `v_organisations_by_year`,
  `v_entity_staff_demographics`) that both the app and Power BI can query
  for consistent KPI numbers, plus starter RLS policies.
- **`POWERBI.md`** — how to point Power BI Desktop directly at the
  Supabase Postgres database (no export step), which views to use,
  suggested report pages, starter DAX measures, and a note on using a
  dedicated read-only role rather than an admin credential.

**Staff demographics, job creation and audit findings are not wired up to
real data yet** — that data was never being captured anywhere in the app
(there's no reporting-submission screen), so the Analytics screen shows an
explicit "Awaiting entity reporting data" card rather than fabricating
numbers. The table and views are ready in `sql/schema.sql`; what's missing
is a reporting-submission form for public entities to actually populate
`entity_reports` (see §7 below).

---

## 7. Gap analysis against the challenge statement & judging criteria

An honest check against the DSAC problem statement's five functional
requirements:

| Requirement | Status |
|---|---|
| **a) Analytics Module** — trends/patterns, audit findings, YoY comparisons, target status (in progress/not started/deadline missed), staff demographics, job creation | **Partially built.** Target status, deadline tracking, funding trend and org YoY are live and driven by real data. Audit findings, staff demographics and job creation are schema-ready (`entity_reports`) but not yet populated — no submission screen exists for entities to report this data. |
| **b) Early Warning Functionality** — risk-based alerts, 30/15-day/hourly countdown notifications | **Built** for accountability case due dates (in-app list + severity bands). Not yet built: push/email notifications — the current implementation is pull (you open Analytics to see it), not push. |
| **c) Document Repository** — upload of strategic plans, APPs, operational plans, annual/quarterly reports, financials | **Not built.** No file storage, upload UI, or document listing exists anywhere in the app. This is the largest remaining gap against the challenge statement. |
| **d) Workspaces for Public Entities** — Microsoft integration, version control, real-time comments, task assignment, mobile support | **Not built**, and explicitly flagged as such in the app itself (`app/organisation/dashboard.tsx` shows "Funding agreements, accountability cases, tasks and documents will appear here as those modules are added to CIVITRACK"). The organisation-side dashboard exists and reads real membership/org data, but none of the workspace collaboration features do. |
| **e) Security and Privacy** | **Partially addressed.** Role-based access (`ROLES`, `ProtectedRoute`) and Supabase Auth are in place; Row Level Security policies weren't verified in this pass (see §5) and there's no documented alignment statement against South African cybersecurity/privacy principles (POPIA) for a submission. |

### Against the judging criteria weightings

This is a candid read, not a score — worth validating against the actual
prototype in a live walkthrough before presenting:

- **Relevance to the Challenge Statement (20%)** — core accountability
  loop (organisations → funding agreements → cases → dashboard) is solid
  and genuinely functions end-to-end. Two of five functional requirements
  (Document Repository, Workspaces) are unbuilt, which is the main risk
  here — worth having a clear "credible path" story ready (the judging
  criteria explicitly allows for this), e.g. pointing at `entity_reports`
  and describing the document-repository build as the next sprint.
- **Innovation and Use of Emerging Technologies (15%)** — currently no AI
  or predictive analytics; the Analytics screen is descriptive (what
  happened / what's due), not predictive (what's likely to happen). The
  challenge explicitly asks for AI-driven risk prediction — this is a gap
  worth addressing if there's time, even as a simple heuristic (e.g. flag
  entities with a rising trend of missed deadlines as "at risk").
- **Technical Feasibility and Functionality (20%)** — strong: the app
  runs, reads and writes real data, and the flows demoed (create org →
  create agreement → create case → see it on the dashboard) work.
- **User Experience, Accessibility and Inclusivity (10%)** — no
  accessibility audit was done in this pass (screen reader labels,
  contrast, multilingual support aren't addressed anywhere in the
  codebase). Worth a quick pass before presenting.
- **Data, Intelligence and Insight Generation (10%)** — improved by this
  pass (target status, early warning, trends), but still descriptive
  rather than predictive — see the Innovation point above.
- **Security, Governance and Responsible Technology Use (10%)** — role
  gating exists; RLS and a POPIA-alignment statement are the two concrete
  gaps to close before presenting.
- **Scalability, Sustainability and Digital Sovereignty (10%)** — built on
  open-source (Expo/React Native) and a standard Postgres database with no
  proprietary lock-in; the Power BI integration is additive rather than
  required, which keeps the core solution vendor-neutral.
- **Presentation, Demonstration and Communication (5%)** — not something
  code changes affect; worth rehearsing the live demo against exactly the
  flow in §3 of this README.

**Bottom line:** the funding/accountability core and the newly-added
analytics/early-warning layer are in good shape and demonstrably working.
Document Repository and Workspaces are the two functional requirements
with no implementation at all, and AI/predictive analytics — explicitly
weighted at 15% on its own plus feeding into the 10% insight-generation
criterion — is the most impactful gap to close with any remaining time,
even a small heuristic-based version.
