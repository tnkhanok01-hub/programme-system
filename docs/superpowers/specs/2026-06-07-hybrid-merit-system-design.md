# Hybrid Merit System Design

Date: 2026-06-07
Status: Draft for review
Scope: Improve the existing programme-system merit model. Do not add residential placement.

## 1. Goal

The system should evolve from a simple role-based point awarder into a hybrid merit platform:

1. Operational points: fair, configurable, auditable points for participation, leadership, service, discipline, and programme completion.
2. Verified student record: a student-facing activity history that can support certificates, resumes, interviews, awards, and institutional reporting.

This keeps the current programme management workflow intact while making merit more realistic for college-level and university-level use.

## 2. Current System Summary

The current system already has strong foundations:

- Programmes can be created, reviewed, approved, rejected, and resubmitted.
- Committees are managed through `programme_roles`.
- Attendance is verified through QR scanning.
- Post-survey completion can trigger attendee merit.
- Admin and superadmin users can review programmes.
- Superadmin can issue manual demerit records.
- Merit is currently stored in a `merit` table and uses fixed constants:
  - Programme Director: 25 points
  - High committee: 15 points
  - Member: 10 points
  - Attendee: points entered during superadmin approval

The current model is useful, but it is too coarse for real-world merit governance because it does not yet capture:

- Programme level, such as college, faculty, university, national, or international.
- Activity pillar, such as leadership, service, sports, entrepreneurship, culture, innovation, or welfare.
- Evidence quality and verification status.
- Role hierarchy beyond a small fixed list.
- Time contribution, programme duration, or repeated participation limits.
- Transparent audit trails for why points were awarded, changed, or revoked.
- University-level organizational scopes, such as college, faculty, department, centre, and campus.

## 3. External Benchmark Notes

### Malaysia

UKM E-Merit is used to make residential college selection more systematic. Public UKM reporting says it considers inputs such as B40 data, uniformed bodies, i-STAR, and academic excellence. This shows that Malaysian merit systems often combine activity records with eligibility and student profile data. Source: https://www.ukm.my/beritaukm/ukm-lancar-sistem-e-merit/

UiTM eMERIT focuses on online registration of college activities, student attendance, and semester merit access through mobile-friendly views. This is close to the current system's QR attendance direction. Source: https://emerit.uitm.edu.my/emerits/index.html and https://emerit.uitm.edu.my/emerit/index.php

UPM college merit guidelines show a more detailed weighted model by activity level. One public Kolej Dua Belas document shows minimum combined merit requirements and separates merit by college, university/national/international, association/club, and faculty levels. Source: https://k12.upm.edu.my/upload/dokumen/menul320170719101715PENGIRAAN_MERIT_2.pdf

UiTM residential guidance and policy references show that merit, student leadership roles, uniformed bodies, sports, and special priorities can influence institutional decisions. This supports a model where points are not only attendance counts but structured evidence of contribution. Source: https://kedah.uitm.edu.my/component/content/article/17-student/student-information/32-informasi-kolej-kediaman and https://ir.uitm.edu.my/id/eprint/130693

### International

NUS maintains Co-Curricular Activity records that document student life, leadership positions, membership, and event participation. Attendance and student leader updates are emphasized. Source: https://osa.nus.edu.sg/services-support/student-services/co-curricular-activity-cca-records/

Saint Mary's University has an Experience Record, described as an official university-verified record of curricular and co-curricular experiential learning. It is designed to support resumes, LinkedIn, interviews, scholarships, and graduate school applications. Source: https://www.smu.ca/cel/students/experiencerecord/

Methodist University describes a Co-Curricular Transcript as an official document that complements the academic transcript and verifies extracurricular involvement, leadership, awards, and community service. Source: https://www.methodist.edu/life-at-mu/student-affairs-office/co-curricular-transcript/

Southern Methodist University uses SMU360 as an official campus engagement platform for student organizations, events, departments, and services. This shows the value of a central engagement platform rather than scattered manual records. Source: https://www.smu.edu/studentaffairs/studentcenterandactivities/studentorganizations

## 4. Recommended Direction

Use a hybrid design with two connected layers:

1. Merit ledger: the authoritative point history used for operations, ranking, reporting, and eligibility.
2. Student activity record: a curated, verified record students can view, export, and use as proof of development.

The same programme attendance or role can feed both layers, but they serve different purposes. The ledger answers "how many points and why?" The student record answers "what did this student do and what did they gain?"

## 5. Merit Model

### 5.1 Programme Attributes

Every programme should have structured merit metadata:

- Activity pillar: leadership, service, sports, culture, entrepreneurship, innovation, academic, welfare, sustainability, internationalization, or general.
- Programme level: college, faculty, campus, university, national, international.
- Organizer unit: college, faculty, department, club, society, administrative office, external partner.
- Delivery mode: physical, online, hybrid.
- Duration band: short, half-day, full-day, multi-day, semester-long.
- Verification method: QR attendance, manual attendance, role approval, document evidence, admin verification.
- Risk or responsibility level: normal, high responsibility, high risk, external stakeholder involvement.
- Merit rule version: the ruleset used at the time of award.

### 5.2 Point Sources

Points should come from distinct source types:

- Participation: student attended and completed required post-survey or reflection.
- Committee role: student served in an approved role.
- Leadership role: director, deputy director, secretary, treasurer, head of unit, or equivalent.
- Contribution evidence: report, deliverable, certificate, portfolio, service hours, competition result.
- Manual adjustment: admin-approved bonus, correction, demerit, or revocation.
- Institutional award: verified award, recognition, competition placing, or representative duty.

### 5.3 Suggested Base Points

These values are starting points, not final policy.

| Source | Suggested range |
| --- | ---: |
| Normal participant, short event | 2-3 |
| Normal participant, half/full-day event | 4-6 |
| Multi-day participant | 8-12 |
| General committee/member | 8-12 |
| Unit head/exco | 12-18 |
| High committee | 18-25 |
| Programme director | 25-35 |
| University representative | 15-30 |
| National/international award | 20-60 |
| Demerit/no-show/misconduct | negative points based on severity |

### 5.4 Multipliers and Caps

Use multipliers carefully so the system rewards real contribution without runaway point inflation.

Suggested level multiplier:

| Level | Multiplier |
| --- | ---: |
| College | 1.00 |
| Faculty/campus | 1.20 |
| University | 1.50 |
| National | 2.00 |
| International | 2.50 |

Suggested caps:

- A student receives only the highest role-based award for one programme.
- Participant points and committee points can be separate only if policy allows it.
- Maximum points per programme should be capped.
- Maximum points per semester should be capped by category to prevent gaming.
- Repeated attendance for the same recurring programme should use a recurrence rule.
- Manual adjustments must require reason, actor, timestamp, and optional evidence.

### 5.5 Verification Status

Each merit record should have a lifecycle:

- pending: record created but not fully verified.
- verified: record is approved and counts toward totals.
- rejected: claim was reviewed and rejected.
- revoked: previously verified record was cancelled.
- adjusted: points were changed with reason.

Only verified records should count toward official totals and student transcripts.

## 6. Student Activity Record

The student record should display verified experiences, not only points.

Each record should include:

- Programme name
- Date or semester
- Role or participation type
- Activity pillar
- Programme level
- Organizer unit
- Skills or graduate attributes
- Evidence link if available
- Verified by
- Points awarded
- Reflection, optional

Possible skill tags:

- Leadership
- Teamwork
- Communication
- Event management
- Financial management
- Community engagement
- Technical skills
- Entrepreneurship
- Cultural competency
- Problem solving
- Professional ethics

Export options can come later:

- Student activity transcript PDF
- Merit summary by semester
- Co-curricular certificate
- Admin report by college/faculty

## 7. Data Architecture Proposal

This is conceptual. Exact migrations should be planned later after checking the real Supabase schema.

### 7.1 Core Tables

`merit_rules`

- Stores configurable point rules.
- Includes rule name, source type, role, level, category, base points, multiplier, caps, active dates, and version.

`merit_transactions`

- Replaces or extends the current `merit` table.
- Stores every award, demerit, adjustment, revocation, and verification event.
- Should be append-friendly and auditable.

`student_activity_records`

- Stores verified experiences for student-facing display.
- Can be generated from merit transactions, but may include non-point experiences too.

`programme_merit_metadata`

- Stores pillar, level, duration band, organizer unit, risk level, verification method, and rule version.

`organization_units`

- Represents college, faculty, school, department, centre, campus, or club.
- Programmes and admins should be scoped to organization units for university-level scale.

`admin_unit_assignments`

- Controls which admins can review or manage which units.

### 7.2 Keep or Migrate Current Merit Table

Two options:

1. Extend current `merit` table.
   - Faster.
   - Less migration work.
   - Harder to support audit and detailed rules.

2. Introduce `merit_transactions` and keep `merit` as a compatibility view or summary table.
   - Better long-term design.
   - More work.
   - Recommended for university scale.

Recommendation: use option 2.

## 8. University-Level Scalability Assessment

The system can grow from college level to university level, but not safely with the current query and role model.

### 8.1 Current Scale Risks

Likely risks from the current codebase:

- Broad client-side reads: dashboards load full programme lists and filter on the client.
- Attendance page loads all attendance rows with `select('*')`, which will not scale when attendance reaches hundreds of thousands of records.
- Merit `/api/merit/all` backfills director merit on GET, then returns all merit records. This is risky at scale and mixes read operations with write side effects.
- Admin and superadmin pages are very large files, which makes future feature work harder to isolate and test.
- Admin scope is role-based, not organization-based. University-level use needs college/faculty/unit-level permissions.
- Approval notification emails are sent inline. Large fanout should move to background jobs or a queue.
- Search, filters, and dashboard stats are mostly computed in the browser. University-level dashboards need server-side filtering, pagination, and aggregate endpoints.
- Merit rules are hardcoded in constants, so policy changes require code changes.

### 8.2 Scalability Target

Target the following university-level assumptions:

- 20,000-40,000 active students.
- 500-5,000 programmes per academic year.
- 100,000-1,000,000 attendance records per year.
- 100,000-2,000,000 merit transactions over multiple years.
- Multiple colleges, faculties, departments, clubs, and admin teams.

### 8.3 Required Scale Improvements

- Server-side pagination for programme, user, attendance, and merit lists.
- Server-side search and filters.
- Database indexes for:
  - `programmes(status, start_date)`
  - `programmes(organizer_unit_id, status)`
  - `attendance(programme_id, user_id)`
  - `attendance(user_id, programme_id)`
  - `merit_transactions(user_id, semester)`
  - `merit_transactions(programme_id)`
  - `merit_transactions(status, updated_at)`
  - `programme_roles(programme_id, status)`
  - `programme_roles(user_id)`
- Aggregated summary tables or views for dashboards.
- Background processing for merit recalculation, email notifications, and reports.
- Organization-unit permission model.
- API-level rate limits or duplicate protection for QR attendance.
- Explicit audit logs for admin actions.

## 9. Scalability Test Plan

The goal is to test whether the system can operate at university scale before major rollout.

### 9.1 Test Data Profiles

College scale:

- 2,000 students
- 100 admins/staff
- 300 programmes/year
- 20,000 attendance rows/year
- 30,000 merit transactions/year

University scale:

- 35,000 students
- 1,000 admins/staff
- 5,000 programmes/year
- 500,000 attendance rows/year
- 1,000,000 merit transactions/year

Stress scale:

- 50,000 students
- 2,000 admins/staff
- 10,000 programmes/year
- 1,500,000 attendance rows/year
- 3,000,000 merit transactions/year

### 9.2 What to Measure

- Dashboard API response time.
- Programme list pagination speed.
- Attendance QR submission latency.
- Duplicate QR scan handling.
- Merit award calculation time.
- Merit summary calculation time per student.
- Admin report generation time.
- Supabase database CPU and memory pressure.
- Browser rendering time for dashboard tables.
- Email notification fanout time.

### 9.3 Suggested Performance Targets

- QR attendance submit: p95 under 500 ms.
- Student merit summary: p95 under 800 ms.
- Paginated programme list: p95 under 800 ms.
- Admin dashboard stats: p95 under 1,000 ms.
- Merit recalculation batch: completes within scheduled background job window.
- Browser dashboard renders without loading more than 100 rows by default.

## 10. Implementation Roadmap

### Phase 1: Policy and Data Foundation

- Define merit categories, levels, role taxonomy, and caps.
- Add configurable merit rules.
- Add programme merit metadata.
- Add merit transaction audit model.
- Preserve existing merit behavior during migration.

### Phase 2: Award Engine

- Build a central merit calculation service.
- Award points based on rules instead of constants.
- Move backfill logic out of GET routes.
- Add idempotency so duplicate scans or approvals do not duplicate points.
- Add admin adjustment workflow with reason and evidence.

### Phase 3: Student Record

- Add student merit timeline.
- Add category breakdown.
- Add verified activity record.
- Add optional reflection/evidence display.
- Prepare PDF/export structure.

### Phase 4: Admin and Reporting

- Add merit rule management for superadmin.
- Add admin review queue for pending or disputed merit.
- Add reports by student, programme, organizer unit, category, and semester.
- Add suspicious pattern checks, such as duplicate attendance or unusually high points.

### Phase 5: University Scale

- Add organization units and scoped admin permissions.
- Add server-side pagination and filtering.
- Add aggregate dashboard endpoints.
- Add background jobs for emails and recalculation.
- Run synthetic load tests using the profiles in section 9.

## 11. Key Product Decisions Still Needed

Before implementation, the team should decide:

1. Should participant points and committee points stack, or should students receive only the highest award for a programme?
2. What are the official activity pillars?
3. What are the official programme levels?
4. Should demerit affect all totals or only disciplinary totals?
5. Should students be allowed to submit missing merit claims?
6. Should admins approve every manual claim, or only exceptions?
7. Should merit expire, reset each academic year, or remain cumulative?
8. Should transcript export show points, or only verified experiences?
9. Should the first rollout serve only Kolej Siswa Jaya, or all UTM Kuala Lumpur units?

## 12. Recommended First Build

The first implementation should be intentionally narrow:

1. Add programme merit metadata.
2. Add configurable merit rules.
3. Add append-only merit transactions.
4. Update approval and attendance flows to award through a central engine.
5. Add student merit summary and activity timeline.
6. Add admin merit report with server-side pagination.

This gives the system a real-world merit foundation without adding residential placement or overbuilding the transcript/export layer too early.

