'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, BarChart, BarChart2, Calendar, ChevronDown, ChevronUp, FileX, TrendingUp, Weight } from 'lucide-react';
import LiftTypeSelector from '@/components/LiftTypeSelector';
import { tw } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart as RechartsBarChart, Bar } from 'recharts';

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

type TimeRange = 'week' | 'month' | 'year' | 'all';

export default function WorkoutStats() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [liftTypes, setLiftTypes] = useState<LiftType[]>([]);
  const [selectedLiftType, setSelectedLiftType] = useState<string>('');
  const [selectedLiftTypeName, setSelectedLiftTypeName] = useState('');
  const [stats, setStats] = useState<ExerciseStats[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [chartMetric, setChartMetric] = useState<'maxWeight' | 'totalVolume'>('maxWeight');

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
      let dateFilter = null;
      const now = new Date();
      
      if (timeRange === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateFilter = weekAgo.toISOString();
      } else if (timeRange === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateFilter = monthAgo.toISOString();
      } else if (timeRange === 'year') {
        const yearAgo = new Date(now);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        dateFilter = yearAgo.toISOString();
      }
      
      console.log('Fetching stats with params:', {
        liftTypeId: selectedLiftType,
        userId: user.id,
        dateFilter: dateFilter
      });
      
      // Step 1: Get all exercises of the selected lift type
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('exercises')
        .select('id, name, workout_id')
        .eq('lift_type_id', selectedLiftType);
      
      if (exercisesError) throw exercisesError;
      
      if (!exercisesData || exercisesData.length === 0) {
        console.log('No exercises found for this lift type');
        setStats([]);
        setLoading(false);
        return;
      }
      
      // Get all exercise IDs
      const exerciseIds = exercisesData.map(ex => ex.id);
      
      // Step 2: Get all sets for these exercises
      const { data: setsData, error: setsError } = await supabase
        .from('sets')
        .select('*')
        .in('exercise_id', exerciseIds);
      
      if (setsError) throw setsError;
      
      // Step 3: Get all workouts to get dates
      const workoutIds = [...new Set(exercisesData.map(ex => ex.workout_id))];
      
      let workoutsQuery = supabase
        .from('workouts')
        .select('id, date')
        .in('id', workoutIds);
      
      // Apply date filter if needed
      if (dateFilter) {
        workoutsQuery = workoutsQuery.gte('date', dateFilter);
      }
      
      const { data: workoutsData, error: workoutsError } = await workoutsQuery;
      
      if (workoutsError) throw workoutsError;
      
      if (!workoutsData || workoutsData.length === 0) {
        console.log('No workouts found in the selected time range');
        setStats([]);
        setLoading(false);
        return;
      }
      
      // Create a map of workout ID to date for easy lookup
      const workoutDates: Record<string, string> = {};
      workoutsData.forEach(workout => {
        workoutDates[workout.id] = workout.date;
      });
      
      // Create a map of exercise ID to workout date
      const exerciseWorkoutDates: Record<string, string> = {};
      exercisesData.forEach(exercise => {
        if (workoutDates[exercise.workout_id]) {
          exerciseWorkoutDates[exercise.id] = workoutDates[exercise.workout_id];
        }
      });
      
      // Group sets by workout date
      const setsByDate: Record<string, any[]> = {};
      
      setsData.forEach(set => {
        const workoutDate = exerciseWorkoutDates[set.exercise_id];
        if (!workoutDate) return;
        
        // Format date to be just the date part (no time)
        const dateKey = new Date(workoutDate).toISOString().split('T')[0];
        
        if (!setsByDate[dateKey]) {
          setsByDate[dateKey] = [];
        }
        
        setsByDate[dateKey].push(set);
      });
      
      // Calculate stats for each date
      const formattedStats: ExerciseStats[] = Object.keys(setsByDate).map(dateKey => {
        const sets = setsByDate[dateKey];
        const totalSets = sets.length;
        const totalReps = sets.reduce((sum: number, set: any) => sum + set.reps, 0);
        const maxWeight = Math.max(...sets.map((set: any) => set.weight));
        const totalVolume = sets.reduce((sum: number, set: any) => sum + (set.weight * set.reps), 0);
        
        return {
          date: new Date(dateKey).toLocaleDateString(),
          maxWeight: maxWeight,
          totalVolume: totalVolume,
          totalSets: totalSets,
          averageReps: totalReps / totalSets
        };
      });
      
      // Sort by date (newest first)
      formattedStats.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      
      console.log('Formatted stats:', formattedStats);
      setStats(formattedStats);
    } catch (error: any) {
      console.error('Error loading stats:', error);
      setError(error.message || 'Failed to load statistics');
      setStats([]);
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
    <div className="min-h-screen bg-gray-900 pb-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-100">Workout Statistics</h1>
          <Link
            href="/workouts"
            className="flex items-center rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Workouts
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="lift-type" className="block text-sm font-medium text-gray-300">
              Lift Type
            </label>
            <LiftTypeSelector
              liftTypes={liftTypes}
              selectedLiftType={selectedLiftType}
              onSelect={setSelectedLiftType}
              placeholder="Select a lift type"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="date-range" className="block text-sm font-medium text-gray-300">
              Date Range
            </label>
            <select
              id="date-range"
              className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 bg-gray-800 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            >
              <option value="all">All Time</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
            </select>
          </div>
        </div>

        {/* Stats Content */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-indigo-500"></div>
              <span className="mt-2 text-sm text-gray-400">Loading statistics...</span>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-lg bg-red-900/20 p-4 text-red-400">
            <p className="text-center">{error}</p>
          </div>
        ) : !selectedLiftType ? (
          <div className="rounded-lg bg-gray-800 p-8 text-center border border-gray-700 shadow-md">
            <BarChart2 className="mx-auto h-12 w-12 text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No Lift Type Selected</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              Select a lift type from the dropdown above to view your performance statistics.
            </p>
          </div>
        ) : stats.length === 0 ? (
          <div className="rounded-lg bg-gray-800 p-8 text-center border border-gray-700 shadow-md">
            <FileX className="mx-auto h-12 w-12 text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No Data Available</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              There are no recorded exercises for this lift type in the selected time period.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-gray-800 p-6 border border-gray-700 shadow-md">
                <div className="flex items-center">
                  <div className="rounded-full bg-indigo-900/20 p-3">
                    <Weight className="h-6 w-6 text-indigo-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-400">Max Weight</p>
                    <h3 className="text-2xl font-bold text-gray-100">
                      {stats[0].maxWeight}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-gray-800 p-6 border border-gray-700 shadow-md">
                <div className="flex items-center">
                  <div className="rounded-full bg-emerald-900/20 p-3">
                    <TrendingUp className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-400">Average Weight</p>
                    <h3 className="text-2xl font-bold text-gray-100">
                      {stats[0].totalVolume / stats[0].totalSets}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-gray-800 p-6 border border-gray-700 shadow-md">
                <div className="flex items-center">
                  <div className="rounded-full bg-amber-900/20 p-3">
                    <BarChart className="h-6 w-6 text-amber-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-400">Total Volume</p>
                    <h3 className="text-2xl font-bold text-gray-100">
                      {stats[0].totalVolume}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-gray-800 p-6 border border-gray-700 shadow-md">
                <div className="flex items-center">
                  <div className="rounded-full bg-purple-900/20 p-3">
                    <Calendar className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-400">Total Sessions</p>
                    <h3 className="text-2xl font-bold text-gray-100">{stats.length}</h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Chart */}
            <div className="rounded-lg bg-gray-800 p-6 border border-gray-700 shadow-md">
              <h3 className="mb-4 text-lg font-medium text-gray-200">Progress Over Time</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={stats}
                    margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: '#9ca3af' }} 
                      stroke="#4b5563"
                    />
                    <YAxis 
                      tick={{ fill: '#9ca3af' }} 
                      stroke="#4b5563"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        borderColor: '#374151',
                        color: '#f9fafb' 
                      }}
                      labelStyle={{ color: '#f9fafb' }}
                    />
                    <Legend 
                      wrapperStyle={{ color: '#9ca3af' }}
                    />
                    <Line
                      type="monotone"
                      dataKey={chartMetric}
                      name={chartMetric === 'maxWeight' ? 'Max Weight' : 'Total Volume'}
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: '#6366f1', stroke: '#f9fafb', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Sets Table */}
            <div className="rounded-lg bg-gray-800 border border-gray-700 shadow-md overflow-hidden">
              <div className="p-6 border-b border-gray-700">
                <h3 className="text-lg font-medium text-gray-200">Recent Sets</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-900">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
                      >
                        Date
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
                      >
                        Max Weight
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
                      >
                        Total Volume
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
                      >
                        Sets
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
                      >
                        Avg. Reps
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 bg-gray-800">
                    {stats.map((stat, index) => (
                      <tr key={index} className="hover:bg-gray-700">
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">
                          {stat.date}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-100">
                          {stat.maxWeight}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">
                          {stat.totalVolume}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">
                          {stat.totalSets}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">
                          {stat.averageReps.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
