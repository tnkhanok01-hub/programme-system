# Superadmin Overdue Checklist Panel

**Date:** 2026-06-03  
**Status:** Approved

## Overview

Add an Overdue Checklists panel to the Superadmin Dashboard that surfaces Approved programmes with incomplete phase checklists past their deadline. Also send a one-time in-app + email warning to the programme director and advisor 3 days before the post-phase deadline.

---

## Overdue Rules

Only **Approved** programmes are considered.

| Phase | Overdue Condition |
|---|---|
| During | `end_date < today` AND fewer than 5 documents with `phase = 'during'` |
| Post | `end_date + 7 days < today` AND at least one of `program_report`, `financial_report`, `survey_report` has no document |

## Post-Phase Warning Trigger

Fires at **`end_date + 4 days`** (3 days before the 1-week post deadline).

Conditions:
- Post checklist is incomplete (at least one item missing)
- No entry in `notification_sent_log` for this programme with `notification_type = 'post_warning'`

Actions:
- Insert one `notifications` row for `programme_director_id`
- Insert one `notifications` row for `advisor_id`
- Send email to both users' email addresses (from `profiles` table)
- Insert one row into `notification_sent_log` to prevent re-firing

---

## Database Changes

### New table: `notification_sent_log`

```sql
CREATE TABLE notification_sent_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id     uuid NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  sent_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (programme_id, notification_type)
);
```

The unique constraint on `(programme_id, notification_type)` guarantees the warning fires exactly once per programme.

---

## API Route

### `GET /api/overdue/check`

**Auth:** Superadmin only (verified via JWT + role check).

**Steps:**
1. Fetch all Approved programmes (`status = 'Approved'`)
2. Fetch all documents for those programmes
3. Fetch profiles (email) for all `programme_director_id` and `advisor_id` values
4. Fetch existing `notification_sent_log` rows for those programmes
5. For each programme:
   - Compute during overdue: `end_date < today` AND during docs < 5
   - Compute post overdue: `end_date + 7d < today` AND any post item missing
   - Compute warning trigger: `end_date + 4d <= today` AND any post item missing AND not in log
6. For each warning trigger: insert 2 notifications, send 2 emails, insert 1 log row
7. Return `{ during: OverdueItem[], post: OverdueItem[] }` to the client

**`OverdueItem` shape:**
```ts
{
  id: string
  name: string
  organiser: string
  end_date: string
  days_overdue: number
}
```

---

## Dashboard UI: `OverduePanel`

**File:** `components/programmes/OverduePanel.tsx`

- Placed below `BudgetBanner`, above the programmes table in `app/superadmin/page.tsx`
- Hidden entirely when both `during` and `post` arrays are empty
- Red-tinted border (`rgba(239,68,68,0.2)`) to signal urgency
- Header: "Overdue Checklists" with a count badge

### Row layout per item:
- Phase badge: **During** in `#34d399` (green), **Post** in `#a78bfa` (purple) — matching existing `PHASES` colours
- Programme name
- Days overdue (e.g. "3 days overdue")
- Organiser + end date in muted text
- Entire row is clickable → navigates to `/programmes/[id]`

---

## In-App Notification Content

Inserted into the `notifications` table for both `programme_director_id` and `advisor_id`:

| Field | Value |
|---|---|
| `title` | `"Post-Phase Checklist Due Soon"` |
| `message` | `"Programme '[name]' post-phase checklist must be completed in 3 days. Please upload the Program Report, Financial Report, and Survey Report."` |

Delivered in real-time via the existing Supabase channel subscription in `NotificationBell`.

---

## Email Content

**Subject:** `Action Required: Post-Phase Checklist Due in 3 Days — [Programme Name]`

**Body (plain text):**
```
Dear [Full Name],

This is a reminder that the post-phase checklist for "[Programme Name]" is due in 3 days (by [deadline date]).

The following documents are still required:
- Program Report
- Financial Report
- Survey Report

Please log in to the system and upload the missing documents before the deadline.

UTM SPMS
```

Sent via the existing `sendEmail` utility in `lib/sendEmail.ts`.

---

## Affected Files

| File | Change |
|---|---|
| Supabase (migration) | Create `notification_sent_log` table |
| `app/api/overdue/check/route.ts` | New API route |
| `components/programmes/OverduePanel.tsx` | New component |
| `app/superadmin/page.tsx` | Call API on mount, render `OverduePanel` |
