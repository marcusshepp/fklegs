'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

// Define types for our workout data
type Exercise = {
  id: string;
  name: string;
  liftTypeId: string | null;
  sets: Set[];
};

type Set = {
  id: string;
  weight: number;
  reps: number;
  completed: boolean;
};

type LiftType = {
  id: string;
  name: string;
};

export default function NewWorkout() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [workoutName, setWorkoutName] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [selectedLiftType, setSelectedLiftType] = useState<string | null>(null);
  const [liftTypes, setLiftTypes] = useState<LiftType[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        console.error('Error loading lift types:', error);
      }
      
      setLoading(false);
    };

    checkUserAndLoadLiftTypes();
  }, [router]);

  const addExercise = () => {
    if (!newExerciseName.trim()) return;
    
    const newExercise: Exercise = {
      id: crypto.randomUUID(),
      name: newExerciseName,
      liftTypeId: selectedLiftType,
      sets: [
        {
          id: crypto.randomUUID(),
          weight: 0,
          reps: 0,
          completed: false
        }
      ]
    };
    
    setExercises([...exercises, newExercise]);
    setNewExerciseName('');
    setSelectedLiftType(null);
  };

  const addSet = (exerciseId: string) => {
    setExercises(
      exercises.map(exercise => {
        if (exercise.id === exerciseId) {
          return {
            ...exercise,
            sets: [
              ...exercise.sets,
              {
                id: crypto.randomUUID(),
                weight: 0,
                reps: 0,
                completed: false
              }
            ]
          };
        }
        return exercise;
      })
    );
  };

  const updateSet = (exerciseId: string, setId: string, field: 'weight' | 'reps', value: number) => {
    setExercises(
      exercises.map(exercise => {
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
    );
  };

  const toggleSetCompletion = (exerciseId: string, setId: string) => {
    setExercises(
      exercises.map(exercise => {
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
    );
  };

  const removeExercise = (exerciseId: string) => {
    setExercises(exercises.filter(exercise => exercise.id !== exerciseId));
  };

  const removeSet = (exerciseId: string, setId: string) => {
    setExercises(
      exercises.map(exercise => {
        if (exercise.id === exerciseId) {
          // Don't remove the last set
          if (exercise.sets.length <= 1) {
            return exercise;
          }
          return {
            ...exercise,
            sets: exercise.sets.filter(set => set.id !== setId)
          };
        }
        return exercise;
      })
    );
  };

  const saveWorkout = async () => {
    if (!workoutName.trim()) {
      setError('Please enter a workout name');
      return;
    }

    if (exercises.length === 0) {
      setError('Please add at least one exercise');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Create workout in Supabase
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          name: workoutName,
          date: new Date().toISOString(),
          completed: false
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Insert exercises and sets
      for (const exercise of exercises) {
        const { data: exerciseData, error: exerciseError } = await supabase
          .from('exercises')
          .insert({
            workout_id: workout.id,
            lift_type_id: exercise.liftTypeId,
            name: exercise.name
          })
          .select()
          .single();

        if (exerciseError) throw exerciseError;

        // Insert sets for this exercise
        const setsToInsert = exercise.sets.map(set => ({
          exercise_id: exerciseData.id,
          weight: set.weight,
          reps: set.reps,
          completed: set.completed
        }));

        const { error: setsError } = await supabase
          .from('sets')
          .insert(setsToInsert);

        if (setsError) throw setsError;
      }

      // Redirect to the workout detail page
      router.push(`/workouts/${workout.id}`);
    } catch (error: any) {
      setError(error.message || 'Failed to save workout');
      setSaving(false);
    }
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
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">New Workout</h1>
          <Link
            href="/dashboard"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 rounded-lg border bg-white p-6 shadow-sm">
          <div className="mb-4">
            <label htmlFor="workoutName" className="block text-sm font-medium text-gray-700">
              Workout Name
            </label>
            <input
              type="text"
              id="workoutName"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              placeholder="e.g., Leg Day, Upper Body, etc."
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Exercises</h2>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  placeholder="Exercise name"
                  className="rounded-md border border-gray-300 px-3 py-1 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
                <select
                  value={selectedLiftType || ''}
                  onChange={(e) => setSelectedLiftType(e.target.value || null)}
                  className="rounded-md border border-gray-300 px-3 py-1 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                >
                  <option value="">Select lift type</option>
                  {liftTypes.map((liftType) => (
                    <option key={liftType.id} value={liftType.id}>
                      {liftType.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={addExercise}
                  className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Add Exercise
                </button>
              </div>
            </div>
          </div>

          {exercises.length === 0 ? (
            <div className="mb-6 rounded-md bg-gray-50 p-8 text-center">
              <p className="text-gray-500">No exercises added yet. Add your first exercise above.</p>
            </div>
          ) : (
            <div className="mb-6 space-y-6">
              {exercises.map((exercise) => (
                <div key={exercise.id} className="rounded-md border border-gray-200 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">{exercise.name}</h3>
                      {exercise.liftTypeId && (
                        <p className="text-sm text-gray-500">
                          Type: {liftTypes.find(lt => lt.id === exercise.liftTypeId)?.name}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeExercise(exercise.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
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
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                            Actions
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
                              <input
                                type="number"
                                min="0"
                                value={set.weight}
                                onChange={(e) => updateSet(exercise.id, set.id, 'weight', parseInt(e.target.value) || 0)}
                                className="w-20 rounded-md border border-gray-300 px-2 py-1 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                              />
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              <input
                                type="number"
                                min="0"
                                value={set.reps}
                                onChange={(e) => updateSet(exercise.id, set.id, 'reps', parseInt(e.target.value) || 0)}
                                className="w-20 rounded-md border border-gray-300 px-2 py-1 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                              />
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              <input
                                type="checkbox"
                                checked={set.completed}
                                onChange={() => toggleSetCompletion(exercise.id, set.id)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                              <button
                                onClick={() => removeSet(exercise.id, set.id)}
                                className="text-sm text-red-600 hover:text-red-800"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    onClick={() => addSet(exercise.id)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Add Set
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={saveWorkout}
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Workout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
