'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

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

  const toggleSetCompletion = async (exerciseId: string, setId: string) => {
    if (!workout) return;
    
    // Update local state
    const updatedWorkout = {
      ...workout,
      exercises: workout.exercises.map(exercise => {
        if (exercise.id === exerciseId) {
          return {
            ...exercise,
            sets: exercise.sets.map(set => {
              if (set.id === setId) {
                return {
                  ...set,
                  completed: !set.completed
                };
              }
              return set;
            })
          };
        }
        return exercise;
      })
    };
    
    setWorkout(updatedWorkout);
    
    // Update in database
    try {
      const setToUpdate = updatedWorkout.exercises
        .find(e => e.id === exerciseId)?.sets
        .find(s => s.id === setId);
      
      if (setToUpdate) {
        await supabase
          .from('sets')
          .update({ completed: setToUpdate.completed })
          .eq('id', setId);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update set');
    }
  };

  const updateSetValue = async (exerciseId: string, setId: string, field: 'weight' | 'reps', value: number) => {
    if (!workout) return;
    
    // Update local state
    const updatedWorkout = {
      ...workout,
      exercises: workout.exercises.map(exercise => {
        if (exercise.id === exerciseId) {
          return {
            ...exercise,
            sets: exercise.sets.map(set => {
              if (set.id === setId) {
                return {
                  ...set,
                  [field]: value
                };
              }
              return set;
            })
          };
        }
        return exercise;
      })
    };
    
    setWorkout(updatedWorkout);
    
    // Update in database
    try {
      const setToUpdate = updatedWorkout.exercises
        .find(e => e.id === exerciseId)?.sets
        .find(s => s.id === setId);
      
      if (setToUpdate) {
        await supabase
          .from('sets')
          .update({ [field]: value })
          .eq('id', setId);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update set');
    }
  };

  const completeWorkout = async () => {
    if (!workout) return;
    
    setSaving(true);
    
    try {
      // Check if all sets are completed
      const allSetsCompleted = workout.exercises.every(exercise => 
        exercise.sets.every(set => set.completed)
      );
      
      if (!allSetsCompleted) {
        if (!confirm('Not all sets are marked as completed. Complete workout anyway?')) {
          setSaving(false);
          return;
        }
      }
      
      // Update workout status
      await supabase
        .from('workouts')
        .update({ completed: true })
        .eq('id', workout.id);
      
      // Update local state
      setWorkout({
        ...workout,
        completed: true
      });
      
      // Redirect to dashboard
      router.push('/dashboard?message=Workout completed successfully!');
    } catch (error: any) {
      setError(error.message || 'Failed to complete workout');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg">Loading workout...</p>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p className="text-lg">Workout not found or you don't have permission to view it.</p>
        <Link
          href="/dashboard"
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{workout.name}</h1>
            <p className="text-sm text-gray-600">
              {new Date(workout.date).toLocaleDateString()} • 
              {workout.completed ? ' Completed' : ' In Progress'}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to Dashboard
            </Link>
            {!workout.completed && (
              <button
                onClick={completeWorkout}
                disabled={saving}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Complete Workout'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {workout.completed && (
          <div className="mb-6 rounded-md bg-green-50 p-4 text-sm text-green-700">
            This workout has been completed.
          </div>
        )}

        <div className="space-y-6">
          {workout.exercises.map((exercise) => (
            <div key={exercise.id} className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-xl font-medium">{exercise.name}</h2>
                {exercise.liftTypeName && (
                  <p className="text-sm text-gray-500">
                    Type: {exercise.liftTypeName}
                  </p>
                )}
              </div>
              
              <div className="mb-4 overflow-x-auto">
                <table className="w-full min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Set
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Weight (lbs)
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Reps
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Completed
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {exercise.sets.map((set, index) => (
                      <tr key={set.id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {workout.completed ? (
                            set.weight
                          ) : (
                            <input
                              type="number"
                              min="0"
                              value={set.weight}
                              onChange={(e) => updateSetValue(exercise.id, set.id, 'weight', parseFloat(e.target.value) || 0)}
                              className="w-20 rounded-md border border-gray-300 px-2 py-1 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                            />
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {workout.completed ? (
                            set.reps
                          ) : (
                            <input
                              type="number"
                              min="0"
                              value={set.reps}
                              onChange={(e) => updateSetValue(exercise.id, set.id, 'reps', parseInt(e.target.value) || 0)}
                              className="w-20 rounded-md border border-gray-300 px-2 py-1 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                            />
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          <input
                            type="checkbox"
                            checked={set.completed}
                            onChange={() => !workout.completed && toggleSetCompletion(exercise.id, set.id)}
                            disabled={workout.completed}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                          />
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
    </div>
  );
}
