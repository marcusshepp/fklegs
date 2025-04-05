'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { CheckCircle, Circle, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type WorkoutData = {
  id: string;
  name: string;
  date: string;
  completed: boolean;
  exercises: ExerciseData[];
};

type ExerciseData = {
  id: string;
  name: string;
  liftTypeId: string | null;
  liftTypeName: string | null;
  sets: SetData[];
};

type SetData = {
  id: string;
  weight: number;
  reps: number;
  completed: boolean;
};

type LiftType = {
  id: string;
  name: string;
};

export default function WorkoutDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [liftTypes, setLiftTypes] = useState<LiftType[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkUserAndLoadWorkout = async () => {
      // Check if user is authenticated
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        router.push('/auth/login');
        return;
      }
      
      setUser(userData.user);
      
      // Load lift types
      try {
        const { data: liftTypesData, error: liftTypesError } = await supabase
          .from('lift_types')
          .select('*')
          .order('name');
        
        if (liftTypesError) throw liftTypesError;
        
        setLiftTypes(liftTypesData);
      } catch (error: any) {
        console.error('Error loading lift types:', error);
      }
      
      // Load workout data
      try {
        // Get workout details
        const { data: workoutData, error: workoutError } = await supabase
          .from('workouts')
          .select('*')
          .eq('id', params.id)
          .single();
        
        if (workoutError) throw workoutError;
        
        // Get exercises for this workout
        const { data: exercisesData, error: exercisesError } = await supabase
          .from('exercises')
          .select('*')
          .eq('workout_id', params.id);
        
        if (exercisesError) throw exercisesError;
        
        // Get sets for all exercises
        const exerciseIds = exercisesData.map((exercise: any) => exercise.id);
        
        let setsData: any[] = [];
        if (exerciseIds.length > 0) {
          const { data: setsResult, error: setsError } = await supabase
            .from('sets')
            .select('*')
            .in('exercise_id', exerciseIds);
          
          if (setsError) throw setsError;
          setsData = setsResult;
        }
        
        // Organize data into nested structure
        const exercises = exercisesData.map((exercise: any) => {
          const exerciseSets = setsData
            .filter((set: any) => set.exercise_id === exercise.id)
            .map((set: any) => ({
              id: set.id,
              weight: set.weight,
              reps: set.reps,
              completed: set.completed
            }));
          
          // Find lift type name if lift_type_id exists
          const liftType = exercise.lift_type_id 
            ? liftTypes.find((lt: any) => lt.id === exercise.lift_type_id) 
            : null;
          
          return {
            id: exercise.id,
            name: exercise.name,
            liftTypeId: exercise.lift_type_id,
            liftTypeName: liftType ? liftType.name : null,
            sets: exerciseSets
          };
        });
        
        setWorkout({
          id: workoutData.id,
          name: workoutData.name,
          date: workoutData.date,
          completed: workoutData.completed,
          exercises: exercises
        });
      } catch (error: any) {
        setError(error.message || 'Failed to load workout');
      } finally {
        setLoading(false);
      }
    };
    
    checkUserAndLoadWorkout();
  }, [params.id, router]);

  const updateSetValue = async (exerciseId: string, setId: string, field: 'weight' | 'reps', value: number) => {
    if (!workout) return;
    
    try {
      setSaving(true);
      
      // Update in database
      const { error: updateError } = await supabase
        .from('sets')
        .update({ [field]: value })
        .eq('id', setId);
      
      if (updateError) throw updateError;
      
      // Update local state
      setWorkout(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          exercises: prev.exercises.map(e => {
            if (e.id !== exerciseId) return e;
            
            return {
              ...e,
              sets: e.sets.map(s => {
                if (s.id !== setId) return s;
                return { ...s, [field]: value };
              })
            };
          })
        };
      });
    } catch (error: any) {
      console.error(`Error updating set ${field}:`, error);
      setError(error.message || 'Failed to update set');
    } finally {
      setSaving(false);
    }
  };

  const completeWorkout = async () => {
    if (!workout) return;
    
    try {
      setSaving(true);
      
      // Update in database
      const { error: updateError } = await supabase
        .from('workouts')
        .update({ completed: true })
        .eq('id', workout.id);
      
      if (updateError) throw updateError;
      
      // Update local state
      setWorkout(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          completed: true
        };
      });
    } catch (error: any) {
      console.error('Error completing workout:', error);
      setError(error.message || 'Failed to complete workout');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
          <p>Loading workout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg bg-red-50 p-6 text-center">
          <h2 className="mb-2 text-xl font-bold text-red-700">Error</h2>
          <p className="text-red-600">{error}</p>
          <div className="mt-4">
            <Link href="/workouts" className="text-blue-600 hover:underline">
              Back to Workouts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-bold">Workout Not Found</h2>
          <p>The workout you're looking for doesn't exist or you don't have access to it.</p>
          <div className="mt-4">
            <Link href="/workouts" className="text-blue-600 hover:underline">
              Back to Workouts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/workouts"
            className="rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {workout.name || `Workout ${new Date(workout.date).toLocaleDateString()}`}
          </h1>
        </div>
      </div>
      
      <div className="mb-6">
        <p className="text-gray-600">Date: {new Date(workout.date).toLocaleDateString()}</p>
        <p className="text-gray-600">
          Status: {workout.completed ? (
            <span className="font-medium text-green-600">Completed</span>
          ) : (
            <span className="font-medium text-blue-600">In Progress</span>
          )}
        </p>
      </div>
      
      {!workout.completed && (
        <div className="mb-8">
          <button
            onClick={completeWorkout}
            className="rounded-md bg-green-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500 focus:ring-offset-2"
          >
            Mark Workout as Complete
          </button>
        </div>
      )}
      
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Exercises</h2>
        
        <div className="grid gap-6 md:grid-cols-2">
          {workout.exercises.map(exercise => (
            <div key={exercise.id} className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-4">
                <h2 className="text-xl font-medium dark:text-white">{exercise.name}</h2>
                {exercise.liftTypeName && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Type: {exercise.liftTypeName}
                  </p>
                )}
              </div>
              
              <div className="overflow-x-auto sm:overflow-visible">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="hidden sm:table-header-group bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Set
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Weight
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Reps
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {exercise.sets.map((set, index) => (
                      <tr key={set.id}>
                        {/* Mobile layout - grid style */}
                        <td className="sm:hidden py-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">Set {index + 1}</span>
                          </div>
                          <div className="flex items-center space-x-6">
                            <div className="flex flex-col">
                              <span className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Weight</span>
                              {workout.completed ? (
                                <span className="py-1.5 text-sm dark:text-white">{set.weight}</span>
                              ) : (
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  pattern="[0-9]*"
                                  min="0"
                                  step="2.5"
                                  value={set.weight || ''}
                                  onChange={(e) => updateSetValue(exercise.id, set.id, 'weight', parseFloat(e.target.value) || 0)}
                                  className="block w-24 rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-500 sm:text-sm"
                                  aria-label="Weight in pounds"
                                  placeholder="Weight"
                                />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Reps</span>
                              {workout.completed ? (
                                <span className="py-1.5 text-sm dark:text-white">{set.reps}</span>
                              ) : (
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  min="0"
                                  value={set.reps || ''}
                                  onChange={(e) => updateSetValue(exercise.id, set.id, 'reps', parseInt(e.target.value) || 0)}
                                  className="block w-24 rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-500 sm:text-sm"
                                  aria-label="Number of repetitions"
                                  placeholder="Reps"
                                />
                              )}
                            </div>
                          </div>
                        </td>
                        
                        {/* Desktop layout - traditional table */}
                        <td className="hidden sm:table-cell whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-900 dark:text-white">
                          {index + 1}
                        </td>
                        <td className="hidden sm:table-cell whitespace-nowrap px-3 py-2 text-sm text-gray-900 dark:text-white">
                          {workout.completed ? (
                            set.weight
                          ) : (
                            <input
                              type="number"
                              inputMode="decimal"
                              pattern="[0-9]*"
                              min="0"
                              step="2.5"
                              value={set.weight || ''}
                              onChange={(e) => updateSetValue(exercise.id, set.id, 'weight', parseFloat(e.target.value) || 0)}
                              className="block w-24 rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-500 sm:text-sm"
                              aria-label="Weight in pounds"
                              placeholder="Weight"
                            />
                          )}
                        </td>
                        <td className="hidden sm:table-cell whitespace-nowrap px-3 py-2 text-sm text-gray-900 dark:text-white">
                          {workout.completed ? (
                            set.reps
                          ) : (
                            <input
                              type="number"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              min="0"
                              value={set.reps || ''}
                              onChange={(e) => updateSetValue(exercise.id, set.id, 'reps', parseInt(e.target.value) || 0)}
                              className="block w-24 rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-500 sm:text-sm"
                              aria-label="Number of repetitions"
                              placeholder="Reps"
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-8 flex justify-center">
        <Link
          href="/workouts"
          className="flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Workouts
        </Link>
      </div>
    </div>
  );
}
