'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, Calendar, Dumbbell, TrendingUp, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Define types
type LiftType = {
  id: string;
  name: string;
};

type ProgressData = {
  date: string;
  formattedDate: string;
  maxWeight: number;
  totalVolume: number;
};

type SetData = {
  id: string;
  exercise_id: string;
  weight: number;
  reps: number;
  completed: boolean;
  created_at: string;
};

type ExerciseData = {
  id: string;
  workout_id: string;
  lift_type_id: string;
  name: string;
  created_at: string;
  sets: SetData[];
};

type WorkoutData = {
  id: string;
  date: string;
  name: string;
  completed: boolean;
  created_at: string;
};

export default function LiftProgressPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [liftType, setLiftType] = useState<LiftType | null>(null);
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [personalRecord, setPersonalRecord] = useState<number>(0);
  const [totalWorkouts, setTotalWorkouts] = useState<number>(0);
  const [averageWeight, setAverageWeight] = useState<number>(0);
  const [recentWorkouts, setRecentWorkouts] = useState<(WorkoutData & { exercises: ExerciseData[] })[]>([]);

  useEffect(() => {
    const checkUserAndLoadData = async () => {
      try {
        // Check if user is authenticated
        const { data } = await supabase.auth.getUser();
        
        if (!data.user) {
          router.push('/auth/login');
          return;
        }
        
        setUser(data.user);
        
        // Load lift type
        const { data: liftData, error: liftError } = await supabase
          .from('lift_types')
          .select('*')
          .eq('id', params.id)
          .single();
        
        if (liftError) {
          throw new Error(`Error loading lift type: ${liftError.message}`);
        }
        
        if (!liftData) {
          throw new Error('Lift type not found');
        }
        
        setLiftType(liftData);
        
        // Get all exercises with this lift type
        const { data: exercises, error: exercisesError } = await supabase
          .from('exercises')
          .select(`
            id,
            workout_id,
            lift_type_id,
            name,
            created_at
          `)
          .eq('lift_type_id', params.id);
        
        if (exercisesError) {
          throw new Error(`Error loading exercises: ${exercisesError.message}`);
        }
        
        if (!exercises || exercises.length === 0) {
          setProgressData([]);
          setLoading(false);
          return;
        }
        
        // Get all exercise IDs
        const exerciseIds = exercises.map(ex => ex.id);
        
        // Get all sets for these exercises
        const { data: sets, error: setsError } = await supabase
          .from('sets')
          .select('*')
          .in('exercise_id', exerciseIds)
          .order('created_at', { ascending: true });
        
        if (setsError) {
          throw new Error(`Error loading sets: ${setsError.message}`);
        }
        
        // Get all workouts for these exercises
        const workoutIds = [...new Set(exercises.map(ex => ex.workout_id))];
        
        const { data: workouts, error: workoutsError } = await supabase
          .from('workouts')
          .select('*')
          .in('id', workoutIds)
          .order('date', { ascending: true });
        
        if (workoutsError) {
          throw new Error(`Error loading workouts: ${workoutsError.message}`);
        }
        
        // Process data for the chart
        const workoutMap = new Map(workouts.map(w => [w.id, w]));
        const exerciseMap = new Map();
        
        exercises.forEach(ex => {
          if (!exerciseMap.has(ex.workout_id)) {
            exerciseMap.set(ex.workout_id, []);
          }
          exerciseMap.get(ex.workout_id).push({
            ...ex,
            sets: []
          });
        });
        
        sets.forEach(set => {
          const exercise = exercises.find(ex => ex.id === set.exercise_id);
          if (exercise) {
            const exerciseList = exerciseMap.get(exercise.workout_id);
            const exerciseIndex = exerciseList.findIndex(ex => ex.id === set.exercise_id);
            if (exerciseIndex !== -1) {
              exerciseList[exerciseIndex].sets.push(set);
            }
          }
        });
        
        // Calculate progress data
        const progressByDate = new Map();
        let maxWeightEver = 0;
        let totalWeightSum = 0;
        let totalWeightCount = 0;
        
        workouts.forEach(workout => {
          const exercisesForWorkout = exerciseMap.get(workout.id) || [];
          let maxWeight = 0;
          let totalVolume = 0;
          
          exercisesForWorkout.forEach(exercise => {
            exercise.sets.forEach(set => {
              if (set.completed && set.weight > 0) {
                maxWeight = Math.max(maxWeight, set.weight);
                totalVolume += set.weight * set.reps;
                
                totalWeightSum += set.weight;
                totalWeightCount++;
              }
            });
          });
          
          if (maxWeight > 0) {
            const date = new Date(workout.date).toISOString().split('T')[0];
            
            if (!progressByDate.has(date) || progressByDate.get(date).maxWeight < maxWeight) {
              progressByDate.set(date, {
                date,
                formattedDate: new Date(date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                }),
                maxWeight,
                totalVolume
              });
            }
            
            maxWeightEver = Math.max(maxWeightEver, maxWeight);
          }
        });
        
        // Convert to array and sort by date
        const progressArray = Array.from(progressByDate.values()).sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        setProgressData(progressArray);
        setPersonalRecord(maxWeightEver);
        setTotalWorkouts(workoutIds.length);
        setAverageWeight(totalWeightCount > 0 ? Math.round(totalWeightSum / totalWeightCount) : 0);
        
        // Get recent workouts with this lift type
        const recentWorkoutsWithExercises = workouts
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5)
          .map(workout => ({
            ...workout,
            exercises: exerciseMap.get(workout.id) || []
          }));
          
        setRecentWorkouts(recentWorkoutsWithExercises);
        
      } catch (error: any) {
        console.error('Error:', error);
        setError(error.message || 'An error occurred while loading data');
      } finally {
        setLoading(false);
      }
    };

    checkUserAndLoadData();
  }, [params.id, router]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center space-x-2">
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
          <p className="text-lg text-gray-600 dark:text-gray-300">Loading lift progression...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center">
            <Link 
              href="/dashboard" 
              className="mr-4 rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Error</h1>
          </div>
          
          <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400 dark:text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error loading lift progression</h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!liftType) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center">
            <Link 
              href="/dashboard" 
              className="mr-4 rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lift Not Found</h1>
          </div>
          
          <div className="rounded-md bg-yellow-50 p-4 dark:bg-yellow-900/20">
            <div className="flex">
              <div className="flex-shrink-0">
                <Info className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Lift type not found</h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <p>The lift type you're looking for doesn't exist or has been removed.</p>
                </div>
                <div className="mt-4">
                  <Link
                    href="/dashboard"
                    className="rounded-md bg-yellow-100 px-3 py-2 text-sm font-medium text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-200 dark:hover:bg-yellow-900/60"
                  >
                    Return to Dashboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center">
          <Link 
            href="/dashboard" 
            className="mr-4 rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center">
            <Dumbbell className="mr-3 h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{liftType.name} Progression</h1>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
            <div className="flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Personal Record</h2>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{personalRecord} lbs</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
            <div className="flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Dumbbell className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Workouts</h2>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalWorkouts}</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
            <div className="flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Calendar className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Weight</h2>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{averageWeight} lbs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Chart */}
        <div className="mb-8 overflow-hidden rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Weight Progression Over Time</h2>
          
          {progressData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={progressData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                  <XAxis 
                    dataKey="formattedDate" 
                    stroke="#6B7280"
                    tick={{ fill: '#6B7280' }}
                  />
                  <YAxis 
                    stroke="#6B7280"
                    tick={{ fill: '#6B7280' }}
                    label={{ 
                      value: 'Weight (lbs)', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { fill: '#6B7280' }
                    }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: 'none',
                      borderRadius: '0.375rem',
                      color: '#F9FAFB'
                    }}
                    itemStyle={{ color: '#F9FAFB' }}
                    labelStyle={{ color: '#F9FAFB', fontWeight: 'bold' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="maxWeight" 
                    name="Max Weight (lbs)"
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-60 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
              <Dumbbell className="mb-2 h-10 w-10 text-gray-400 dark:text-gray-600" />
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">No progression data yet</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Start logging workouts with this lift to see your progress over time.
              </p>
            </div>
          )}
        </div>

        {/* Recent Workouts */}
        <div className="overflow-hidden rounded-lg bg-white shadow-sm dark:bg-gray-800">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Recent Workouts with {liftType.name}</h2>
          </div>
          
          {recentWorkouts.length > 0 ? (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentWorkouts.map((workout) => (
                <li key={workout.id} className="px-6 py-4">
                  <Link 
                    href={`/workouts/${workout.id}`}
                    className="block hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          {workout.name || `Workout on ${formatDate(workout.date)}`}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(workout.date)}
                        </p>
                      </div>
                      <div className="flex items-center">
                        {workout.exercises.map(exercise => {
                          const maxWeight = exercise.sets.reduce((max, set) => 
                            set.completed && set.weight > max ? set.weight : max, 0);
                          
                          return maxWeight > 0 ? (
                            <div key={exercise.id} className="ml-4 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                              {maxWeight} lbs
                            </div>
                          ) : null;
                        })}
                        <div className={`ml-4 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          workout.completed 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {workout.completed ? 'Completed' : 'In Progress'}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <Dumbbell className="mb-2 h-10 w-10 text-gray-400 dark:text-gray-600" />
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">No workouts found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Start logging workouts with this lift to see them here.
              </p>
              <Link
                href="/workouts/new"
                className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                Start New Workout
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
