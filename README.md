# Workout Tracker App

A Next.js application for tracking your lifting workouts, built with TypeScript and Supabase for authentication and database functionality.

## Features

- User authentication (signup, login, logout)
- Protected routes with middleware
- Dashboard for workout tracking
- Modern UI with Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account

### Supabase Setup

1. Create a new project on [Supabase](https://supabase.com)
2. Go to Project Settings > API to get your project URL and anon key
3. Create a `.env.local` file in the root directory with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Installation

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `/src/app` - Next.js App Router pages and layouts
- `/src/app/auth` - Authentication pages (login, signup)
- `/src/app/dashboard` - Protected dashboard for logged-in users
- `/src/lib` - Utility functions and shared code
- `/src/middleware.ts` - Authentication middleware for route protection

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Next Steps

- Add workout logging functionality
- Implement progress tracking and statistics
- Create exercise library
- Add personal records tracking
