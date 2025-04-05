'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Search, Plus, BarChart2, Award, Dumbbell, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [liftTypes, setLiftTypes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLifts, setFilteredLifts] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
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
      
      // Fetch lift types
      const { data: lifts, error } = await supabase
        .from('lift_types')
        .select('*')
        .order('name');
        
      if (error) {
        console.error('Error fetching lift types:', error);
      } else {
        setLiftTypes(lifts || []);
      }
    };

    checkUser();
  }, [router]);

  // Filter lifts based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredLifts([]);
      setShowResults(false);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = liftTypes.filter(lift => 
      lift.name.toLowerCase().includes(query)
    );
    
    setFilteredLifts(filtered);
    setShowResults(true);
  }, [searchQuery, liftTypes]);
  
  // Handle lift selection
  const handleLiftSelect = (liftId: string) => {
    router.push(`/lifts/${liftId}`);
    setSearchQuery('');
    setShowResults(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between p-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">Workout Tracker</h1>
          <div className="flex items-center gap-4">
            <p className="hidden text-sm text-gray-600 dark:text-gray-300 sm:block">
              <span className="font-medium">{user?.email}</span>
            </p>
            <button
              onClick={() => supabase.auth.signOut()}
              className="rounded-md bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              aria-label="Sign out"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome card */}
        <section className="mb-8 overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-white dark:from-blue-700 dark:to-indigo-700">
            <h2 className="text-2xl font-bold sm:text-3xl">Welcome to your workout dashboard!</h2>
            <p className="mt-2 max-w-2xl text-blue-100">
              Track your lifting progress and log your workouts to reach your fitness goals.
            </p>
          </div>
          
          {/* Lift Search */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500"
                  placeholder="Search for a lift to see your progression..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (filteredLifts.length > 0) {
                      setShowResults(true);
                    }
                  }}
                />
              </div>
              
              {/* Search Results */}
              {showResults && (
                <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg dark:bg-gray-800 dark:ring-1 dark:ring-gray-700">
                  <ul className="max-h-60 overflow-auto rounded-md py-1 text-base sm:text-sm">
                    {filteredLifts.length > 0 ? (
                      filteredLifts.map((lift) => (
                        <li
                          key={lift.id}
                          className="relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => handleLiftSelect(lift.id)}
                        >
                          <div className="flex items-center">
                            <Dumbbell className="mr-3 h-5 w-5 text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-white">{lift.name}</span>
                          </div>
                          <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600">
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        </li>
                      ))
                    ) : (
                      <li className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900 dark:text-white">
                        No lifts found matching "{searchQuery}"
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col gap-4 p-6 sm:flex-row">
            <Link
              href="/workouts/new"
              className="flex items-center justify-center rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Start New Workout
            </Link>
            <Link
              href="/workouts/history"
              className="flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
              View Workout History
            </Link>
          </div>
        </section>

        {/* Dashboard cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:shadow-md dark:bg-gray-800">
            <div className="p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                <Plus className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-lg font-medium text-gray-900 dark:text-white">Quick Log Workout</h3>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                Log your lifting sessions with exercises, sets, reps, and weight.
              </p>
              <Link
                href="/workouts/new"
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                Log Workout
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:shadow-md dark:bg-gray-800">
            <div className="p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                <BarChart2 className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-lg font-medium text-gray-900 dark:text-white">View Progress</h3>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                Track your lifting progress over time with charts and statistics.
              </p>
              <Link
                href="/workouts/stats"
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                View Stats
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:shadow-md dark:bg-gray-800 sm:col-span-2 lg:col-span-1">
            <div className="p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-lg font-medium text-gray-900 dark:text-white">Recent Achievements</h3>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                View your recent personal records and workout achievements.
              </p>
              <Link
                href="/workouts/achievements"
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                View Achievements
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
