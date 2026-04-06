# HR Face Clock

A browser-based HR time tracking system that uses face recognition to clock employees in and out.

## Features

- **Face Clock In/Out** — Employees scan their face via webcam to clock in and out automatically
- **Employee Registration** — Admin registers staff by capturing face images through the browser
- **Dashboard** — Real-time view of who's clocked in, today's activity, and stats
- **Reports** — Date-filtered attendance reports with per-employee summaries and CSV export

## Tech Stack

- **Next.js 16** (App Router) + Tailwind CSS
- **face-api.js** — Browser-based face detection and recognition
- **Supabase** — PostgreSQL database + API

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Open the **SQL Editor** in your Supabase dashboard
3. Paste the contents of `supabase-schema.sql` and run it — this creates the `employees` and `time_logs` tables

### 3. Configure environment variables

Copy your Supabase credentials from **Settings > API** and update `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the kiosk view.

## Usage

### Register employees

1. Go to [/admin/employees/register](http://localhost:3000/admin/employees/register)
2. Enter the employee's name, role, and department
3. Capture 5 face images via webcam (move your head slightly between captures for accuracy)

### Clock in / out

1. Open [/](http://localhost:3000) on a device with a webcam (this is the kiosk screen)
2. An employee stands in front of the camera
3. The system detects their face, matches it, and automatically clocks them in or out
4. A confirmation screen shows for 5 seconds before returning to scanning

### Admin dashboard

- [/admin](http://localhost:3000/admin) — Dashboard with live status
- [/admin/employees](http://localhost:3000/admin/employees) — Manage employees
- [/admin/reports](http://localhost:3000/admin/reports) — Attendance reports with date filters and CSV export

## Deploy to Vercel

1. Push this project to a GitHub repository
2. Import the repo at [vercel.com](https://vercel.com)
3. Add the two environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel project settings
4. Deploy

## Project Structure

```
app/
  page.tsx                        # Kiosk — face clock in/out
  admin/
    page.tsx                      # Dashboard
    employees/
      page.tsx                    # Employee list
      register/page.tsx           # Register new employee
    reports/page.tsx              # Attendance reports
  api/
    employees/route.ts            # Employee CRUD
    time-logs/route.ts            # Clock in/out + log queries
components/
  FaceScanner.tsx                 # Webcam + face detection
  FaceRegistration.tsx            # Multi-capture face registration
  ClockInOut.tsx                  # Kiosk UI with recognition
lib/
  supabase.ts                    # Supabase client + types
  face-recognition.ts            # face-api.js helpers
  utils.ts                       # Date/time formatting
public/
  models/                        # face-api.js model weights
supabase-schema.sql              # Database setup script
```
