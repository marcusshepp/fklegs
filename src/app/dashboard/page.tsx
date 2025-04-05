'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      
      if (!data.user) {
        router.push('/auth/login');
        return;
      }
      
      setUser(data.user);
      setLoading(false);
    };

    checkUser();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Workout Tracker</h1>
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-600">
              Logged in as: <span className="font-medium">{user?.email}</span>
            </p>
            <button
              onClick={handleSignOut}
              className="rounded-md bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Welcome to your workout dashboard!</h2>
          <p className="mb-4">
            Track your lifting progress and log your workouts to reach your fitness goals.
          </p>
          <div className="flex gap-4">
            <Link
              href="/workouts/new"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Start New Workout
            </Link>
            <Link
              href="/workouts/history"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View Workout History
            </Link>
          </div>
        </div>

        {/* Dashboard cards */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-lg font-medium">Quick Log Workout</h3>
            <p className="mb-4 text-sm text-gray-600">
              Log your lifting sessions with exercises, sets, reps, and weight.
            </p>
            <Link
              href="/workouts/new"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Log Workout
            </Link>
          </div>

          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-lg font-medium">View Progress</h3>
            <p className="mb-4 text-sm text-gray-600">
              Track your lifting progress over time with charts and statistics.
            </p>
            <Link
              href="/workouts/stats"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              View Stats
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
