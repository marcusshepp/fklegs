'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      
      if (data.user) {
        router.push('/dashboard');
      } else {
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold">Workout Tracker</h1>
          <p className="mt-3 text-xl text-gray-600">Track your lifting progress and achieve your fitness goals</p>
        </div>

        <div className="flex flex-col items-center space-y-4">
          <p className="text-lg">Log your workouts, track your progress, and reach new personal records</p>
          
          <div className="mt-8 flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
            <Link 
              href="/auth/login" 
              className="rounded-md bg-blue-600 px-8 py-3 text-center text-sm font-medium text-white hover:bg-blue-700"
            >
              Log in
            </Link>
            <Link 
              href="/auth/signup"
              className="rounded-md border border-gray-300 bg-white px-8 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Sign up
            </Link>
          </div>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          <div className="rounded-lg border p-6">
            <h3 className="mb-2 text-lg font-medium">Track Workouts</h3>
            <p className="text-gray-600">Log your exercises, sets, reps, and weights with ease</p>
          </div>
          
          <div className="rounded-lg border p-6">
            <h3 className="mb-2 text-lg font-medium">Monitor Progress</h3>
            <p className="text-gray-600">See your strength gains over time with detailed analytics</p>
          </div>
          
          <div className="rounded-lg border p-6">
            <h3 className="mb-2 text-lg font-medium">Achieve Goals</h3>
            <p className="text-gray-600">Set personal records and celebrate your achievements</p>
          </div>
        </div>
      </div>
    </div>
  );
}
