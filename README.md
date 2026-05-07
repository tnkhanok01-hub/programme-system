# Programme System

Programme System is a role-based student programme management platform built with Next.js and Supabase. It supports the full lifecycle of campus programmes: registration, proposal submission, document uploads, committee management, approval workflows, attendance tracking, merit updates, and student surveys.

The app routes users by role after login:

- Superadmin users manage admins, exchange admins, programme approvals, attendance, and system-wide oversight.
- Admin users review programmes, manage users, track attendance, and handle approval-related workflows.
- Student users browse programmes, view details, join activities, submit pre- and post-surveys, and mark attendance.

## What This Repo Does

This repository contains the web app and API routes that power the platform. In practice, it covers:

- Authentication with Supabase, including login, registration, password reset, and password updates.
- Role-based dashboards for superadmin, admin, and student users.
- Programme creation and editing, including budget validation, dates, venues, categories, and supporting documents.
- Programme approval flows such as approve, reject, resubmit, and checklist review.
- Committee management for programmes, including adding and removing members.
- Document upload, preview, download, and deletion through Supabase storage.
- QR-based attendance flows for admins and students.
- Merit updates and student survey pages for programme participation.

## Tech Stack

- Next.js 16 with the App Router
- React 19
- TypeScript
- Tailwind CSS
- Supabase Auth, Database, and Storage
- lucide-react icons
- jsPDF and QR-related utilities for document and attendance flows

## Project Structure

- `app/` - application routes, pages, and API handlers
- `components/` - shared UI and feature components
- `lib/` - Supabase client, constants, and shared types
- `services/` - fetch wrappers for programme, committee, and document operations
- `public/` - static assets

## Key Routes

- `/` - session-aware landing route that redirects users by role
- `/login` - sign in page
- `/register` - new user registration
- `/forgot-password` and `/update-password` - password recovery flow
- `/student` - student dashboard
- `/student/attendance` - student attendance view
- `/student/pre-survey` and `/student/post-survey` - programme surveys
- `/admin` - admin dashboard
- `/admin/attendance` - admin attendance dashboard
- `/admin/users` - user management
- `/superadmin` - superadmin dashboard
- `/superadmin/attendance` - system attendance dashboard
- `/superadmin/create-admin` and `/superadmin/exchange-admin` - admin management flows
- `/programmes/[id]` - programme detail and management view
- `/create-programme-form` - programme creation form

## API Routes

The app also exposes Next.js route handlers for programme and account operations, including:

- programme CRUD and approval actions
- programme committee management
- document upload and deletion
- user search and profile updates
- auth confirmation and password reset helpers
- admin creation and registration support

## Environment Variables

Create a `.env.local` file with the Supabase credentials used by the app and server routes:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are used by the client. `SUPABASE_SERVICE_ROLE_KEY` is used by server-side route handlers that need elevated access.

## Getting Started

1. Install dependencies.

```bash
pnpm install
```

2. Add the environment variables above to `.env.local`.

3. Start the development server.

```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `pnpm dev` - start the local development server
- `pnpm build` - create a production build
- `pnpm start` - run the production server
- `pnpm lint` - run ESLint

## Notes

- The root route automatically checks the current Supabase session and redirects users to the correct dashboard.
- Many programme flows depend on Supabase Storage files being publicly accessible for preview and download.
- The UI is built to support mobile and desktop views, with dedicated handling in several dashboard pages.