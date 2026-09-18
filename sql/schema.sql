-- ============================================================
-- CIVITRACK — Analytics / Power BI schema additions
-- Run in the Supabase SQL editor (or via `supabase db push`).
-- Safe to run more than once (IF NOT EXISTS guards throughout).
-- ============================================================

-- ------------------------------------------------------------
-- 1. entity_reports
--
-- Captures the per-entity, per-period data the DSAC challenge
-- statement asks for that CIVITRACK doesn't collect anywhere
-- yet: staff demographics, job creation, and audit findings.
-- Feeds the "Entity Reporting" section of /dsac/analytics and,
-- via the view below, Power BI.
-- ------------------------------------------------------------

create table if not exists entity_reports (
  id uuid primary key default gen_random_uuid(),

  organisation_id uuid not null references organisations(id) on delete cascade,
  funding_agreement_id uuid references funding_agreements(id) on delete set null,

  reporting_period_start date not null,
  reporting_period_end date not null,
  report_type text not null check (
    report_type in ('STRATEGIC_PLAN','ANNUAL_PERFORMANCE_PLAN','OPERATIONAL_PLAN',
                     'ANNUAL_REPORT','QUARTERLY_REPORT','FINANCIALS')
  ),

  -- Staff demographics
  staff_total integer default 0,
  staff_women integer default 0,
  staff_youth integer default 0,
  staff_disability integer default 0,

  -- Job creation
  jobs_created integer default 0,

  -- Audit / target tracking
  audit_finding text,                 -- e.g. 'Unqualified', 'Qualified', 'Adverse', 'Disclaimer'
  target_status text default 'NOT_STARTED' check (
    target_status in ('NOT_STARTED','IN_PROGRESS','DEADLINE_MISSED','COMPLETED')
  ),

  document_url text,                  -- link into the document repository (storage bucket path)

  submitted_by uuid references user_profiles(id),
  submitted_at timestamptz default now(),
  reviewed_by uuid references user_profiles(id),
  reviewed_at timestamptz,

  created_at timestamptz default now()
);

create index if not exists idx_entity_reports_org on entity_reports(organisation_id);
create index if not exists idx_entity_reports_period on entity_reports(reporting_period_start);

-- ------------------------------------------------------------
-- 2. KPI views
--
-- Thin, read-only views over existing + new tables. The app's
-- Analytics screen currently computes these client-side from
-- raw rows (fine at current volumes); Power BI should query
-- these views directly instead — one round trip, and the
-- aggregation logic lives in one place instead of being
-- duplicated between the app and every BI report.
-- ------------------------------------------------------------

create or replace view v_case_target_status as
select
  status,
  count(*) as case_count,
  count(*) filter (
    where due_date is not null
      and due_date < current_date
      and status <> 'APPROVED'
  ) as overdue_count
from accountability_cases
group by status;

create or replace view v_case_early_warning as
select
  ac.id,
  ac.case_number,
  ac.status,
  ac.priority,
  ac.due_date,
  (ac.due_date - current_date) as days_remaining,
  o.id as organisation_id,
  o.name as organisation_name
from accountability_cases ac
left join organisations o on o.id = ac.organisation_id
where ac.status <> 'APPROVED'
  and ac.due_date is not null
  and ac.due_date <= current_date + interval '30 days'
order by ac.due_date asc;

create or replace view v_funding_by_month as
select
  date_trunc('month', created_at)::date as month,
  currency,
  sum(allocated_amount) as total_allocated,
  count(*) as agreement_count
from funding_agreements
group by 1, 2
order by 1;

create or replace view v_organisations_by_year as
select
  extract(year from created_at)::int as year,
  organisation_type,
  count(*) as organisation_count
from organisations
group by 1, 2
order by 1;

create or replace view v_entity_staff_demographics as
select
  o.id as organisation_id,
  o.name as organisation_name,
  er.reporting_period_start,
  er.reporting_period_end,
  er.staff_total,
  er.staff_women,
  er.staff_youth,
  er.staff_disability,
  er.jobs_created,
  er.audit_finding,
  er.target_status
from entity_reports er
join organisations o on o.id = er.organisation_id;

-- ------------------------------------------------------------
-- 3. Row Level Security
--
-- Match whatever policy pattern the existing tables use. As a
-- starting point: DSAC admins/reviewers can read and write
-- everything; an organisation can only read/write its own
-- entity_reports rows via organisation_memberships.
-- Review and adjust before enabling in production — RLS wasn't
-- part of this pass, see README §5.
-- ------------------------------------------------------------

alter table entity_reports enable row level security;

create policy "DSAC staff can manage entity reports"
  on entity_reports
  for all
  using (
    exists (
      select 1 from user_profiles up
      where up.id = auth.uid()
        and up.role in ('DSAC_ADMIN', 'DSAC_REVIEWER')
    )
  );

create policy "Organisation members can manage their own entity reports"
  on entity_reports
  for all
  using (
    exists (
      select 1 from organisation_memberships om
      where om.user_id = auth.uid()
        and om.organisation_id = entity_reports.organisation_id
    )
  );
