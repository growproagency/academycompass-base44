# Academy Compass

A multi-tenant SaaS application for managing organizations, teams, tasks, rocks, and strategic plans. Built with React, Vite, Supabase, and TailwindCSS.

## Tech Stack
React + Vite · TailwindCSS + shadcn/ui · Supabase · React Router · TanStack Query

## Prerequisites
- Node.js v18+
- A Supabase project

## Setup

1. Clone the repo and install dependencies
```bash
git clone https://github.com/yourusername/academy-compass.git
cd academy-compass
npm install
```

2. Create a `.env.local` file in the project root
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Run locally
```bash
npm run dev
```
Open `http://localhost:5173`

## Deploy to Vercel
1. Push code to GitHub
2. Import repo in Vercel
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel environment variables
4. Deploy

## Features
- Google OAuth authentication
- Multi-tenant organization management
- Role-based access control (Super Admin, Admin, Member)
- Invite-based onboarding flow
- Tasks, Rocks, Milestones, Strategic Plans
- Announcements and Calendar
- Super Admin Dashboard
