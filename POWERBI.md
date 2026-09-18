# CIVITRACK — Power BI Executive Dashboard

CIVITRACK's in-app Analytics screen (`/dsac/analytics`) covers the day-to-day
target-status and early-warning view for DSAC staff. This guide is for a
**companion Power BI report** aimed at executives/oversight committees who
already work in Power BI, want cross-filtering, exports, or a scheduled
refresh into a broader departmental reporting pack.

Because CIVITRACK runs on Supabase (hosted Postgres), Power BI can connect
**directly to the live database** — there's no export/import step, and no
separate ETL to maintain.

## 1. Get your connection details

In the Supabase dashboard: **Project Settings → Database → Connection
info**. You need:

- **Host** — e.g. `db.<project-ref>.supabase.co`
- **Port** — `5432` (or `6543` if you're using the pooled connection)
- **Database** — `postgres`
- **User** — `postgres` (or a dedicated read-only role — see §4)
- **Password** — your database password (not the anon/service API key)

## 2. Connect from Power BI Desktop

1. `Get Data` → `Database` → `PostgreSQL database`.
2. Server: `<host>:<port>`, Database: `postgres`.
3. Connectivity mode: **Import** for a scheduled-refresh executive report,
   or **DirectQuery** if you want it always live (heavier load on the DB,
   fine at DSAC's data volumes).
4. Enter the username/password from §1 when prompted, SSL enabled.
5. In Navigator, don't pick raw tables — pick the **views** created by
   `sql/schema.sql` (run that script in the Supabase SQL editor first):
   - `v_case_target_status`
   - `v_case_early_warning`
   - `v_funding_by_month`
   - `v_organisations_by_year`
   - `v_entity_staff_demographics`

   These do the same aggregation the in-app Analytics screen does, so the
   two stay consistent instead of drifting apart with duplicated logic.

## 3. Suggested report pages

| Page | Visuals | Source view |
|---|---|---|
| **Overview** | KPI cards (total organisations, active agreements, open cases, overdue cases); stacked bar of case status | `v_case_target_status` |
| **Early Warning** | Table of at-risk cases sorted by `days_remaining`, conditional formatting (red < 0, amber ≤ 15, blue ≤ 30) | `v_case_early_warning` |
| **Funding** | Line/bar of `total_allocated` by `month`; slicer by `currency` | `v_funding_by_month` |
| **Organisations** | Bar of `organisation_count` by `year`, split by `organisation_type` (year-on-year growth) | `v_organisations_by_year` |
| **Entity Reporting** | Staff demographics (women / youth / persons with disabilities) and jobs created, by organisation and reporting period; audit finding distribution | `v_entity_staff_demographics` |

### A couple of starter DAX measures

```DAX
Overdue Cases = 
CALCULATE(
    SUM(v_case_target_status[overdue_count])
)

Total Allocated (Active FY) =
CALCULATE(
    SUM(v_funding_by_month[total_allocated]),
    v_funding_by_month[month] >= DATE(2026,4,1)
)

YoY Organisation Growth % =
VAR ThisYear = SUM(v_organisations_by_year[organisation_count])
VAR LastYear = CALCULATE(SUM(v_organisations_by_year[organisation_count]), 
                          v_organisations_by_year[year] = MAX(v_organisations_by_year[year]) - 1)
RETURN DIVIDE(ThisYear - LastYear, LastYear)
```

## 4. Security note

Don't point Power BI at the Supabase `service_role` key or the app's
Postgres superuser in production. Create a dedicated read-only Postgres
role scoped to the `v_*` views:

```sql
create role powerbi_reader login password '<set a strong password>';
grant select on
  v_case_target_status, v_case_early_warning,
  v_funding_by_month, v_organisations_by_year,
  v_entity_staff_demographics
to powerbi_reader;
```

Use that role's credentials in Power BI instead of an admin account, and
rotate the password the same way you would any other production secret.

## 5. Publishing to the org

Once the report is built, `Publish` to a Power BI workspace and set a
scheduled refresh (Import mode) against the same read-only role, or
distribute as a Power BI App to the DSAC oversight committee.
