'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type LiftType = {
  id: string;
  name: string;
};

type ExerciseStats = {
  date: string;
  maxWeight: number;
  totalVolume: number;
  totalSets: number;
  averageReps: number;
};

export default function WorkoutStats() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [liftTypes, setLiftTypes] = useState<LiftType[]>([]);
  const [selectedLiftType, setSelectedLiftType] = useState<string | null>(null);
  const [selectedLiftTypeName, setSelectedLiftTypeName] = useState<string>('');
  const [stats, setStats] = useState<ExerciseStats[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'all'>('month');

  useEffect(() => {
    const checkUserAndLoadLiftTypes = async () => {
      // Check if user is authenticated
      const { data } = await supabase.auth.getUser();
      
      if (!data.user) {
        router.push('/auth/login');
        return;
      }
      
      setUser(data.user);
      
      // Load lift types
      try {
        const { data: liftTypesData, error: liftTypesError } = await supabase
          .from('lift_types')
          .select('*')
          .order('name');
        
        if (liftTypesError) throw liftTypesError;
        
        setLiftTypes(liftTypesData);
      } catch (error: any) {
        setError(error.message || 'Failed to load lift types');
      } finally {
        setLoading(false);
      }
    };

    checkUserAndLoadLiftTypes();
  }, [router]);

  const loadStats = async () => {
    if (!selectedLiftType || !user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Find the selected lift type name
      const liftType = liftTypes.find(lt => lt.id === selectedLiftType);
      if (liftType) {
        setSelectedLiftTypeName(liftType.name);
      }
      
      // Calculate date range
      let dateFilter = '';
      const now = new Date();
      
      if (timeRange === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = `and w.date >= '${weekAgo.toISOString()}'`;
      } else if (timeRange === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter = `and w.date >= '${monthAgo.toISOString()}'`;
      } else if (timeRange === 'year') {
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        dateFilter = `and w.date >= '${yearAgo.toISOString()}'`;
      }
      
      // Execute SQL query to get stats
      const { data: statsData, error: statsError } = await supabase.rpc(
        'get_lift_type_stats',
        {
          p_lift_type_id: selectedLiftType,
          p_user_id: user.id,
          p_sql_date_filter: dateFilter
        }
      );
      
      if (statsError) throw statsError;
      
      // Transform data for display
      const formattedStats = statsData.map((stat: any) => ({
        date: new Date(stat.workout_date).toLocaleDateString(),
        maxWeight: stat.max_weight,
        totalVolume: stat.total_volume,
        totalSets: stat.total_sets,
        averageReps: stat.average_reps
      }));
      
      setStats(formattedStats);
    } catch (error: any) {
      console.error('Error loading stats:', error);
      setError(error.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedLiftType) {
      loadStats();
    }
  }, [selectedLiftType, timeRange]);

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Workout Statistics</h1>
          <Link
            href="/workouts"
            className="flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Workouts
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="mb-2 text-lg font-medium">Select Exercise Type</h2>
            <div className="flex flex-wrap gap-4">
              <select
                value={selectedLiftType || ''}
                onChange={(e) => setSelectedLiftType(e.target.value || null)}
                className="rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              >
                <option value="">Select lift type</option>
                {liftTypes.map((liftType) => (
                  <option key={liftType.id} value={liftType.id}>
                    {liftType.name}
                  </option>
                ))}
              </select>
              
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              >
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="year">Last Year</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>

          {loading && selectedLiftType ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-lg">Loading statistics...</p>
            </div>
          ) : selectedLiftType && stats.length > 0 ? (
            <div>
              <h3 className="mb-4 text-xl font-medium">
                {selectedLiftTypeName} - Progress Over Time
              </h3>
              
              <div className="mb-6 overflow-x-auto">
                <table className="w-full min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Max Weight (lbs)
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Total Volume
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Total Sets
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Avg Reps
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {stats.map((stat, index) => (
                      <tr key={index}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {stat.date}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {stat.maxWeight}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {stat.totalVolume}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {stat.totalSets}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {stat.averageReps.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mb-4">
                <h4 className="mb-2 text-lg font-medium">Key Insights</h4>
                <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
                  {stats.length > 1 && (
                    <>
                      <li>
                        Max weight: {Math.max(...stats.map(s => s.maxWeight))} lbs
                      </li>
                      <li>
                        Progress over time: {(stats[stats.length - 1].maxWeight - stats[0].maxWeight).toFixed(1)} lbs
                      </li>
                    </>
                  )}
                  <li>
                    Average volume per workout: {(stats.reduce((sum, s) => sum + s.totalVolume, 0) / stats.length).toFixed(0)}
                  </li>
                </ul>
              </div>
            </div>
          ) : selectedLiftType ? (
            <div className="rounded-md bg-gray-50 p-8 text-center">
              <p className="text-gray-500">
                No data available for this exercise type in the selected time range.
              </p>
            </div>
          ) : (
            <div className="rounded-md bg-gray-50 p-8 text-center">
              <p className="text-gray-500">
                Select an exercise type to view your progress over time.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
