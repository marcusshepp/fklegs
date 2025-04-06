'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, Plus, Calendar, Dumbbell, Clock, Pencil, Trash2, AlertTriangle, Timer, Weight, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import LiftTypeSelector from '@/components/LiftTypeSelector';

type WorkoutData = {
  id: string;
  date: string;
  completed: boolean;
  notes?: string;
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

export default function WorkoutDetail() {
  const router = useRouter();
  const params = useParams();
  const workoutId = params.id as string;
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [liftTypes, setLiftTypes] = useState<LiftType[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedLiftType, setSelectedLiftType] = useState<string>('');
  const [newExerciseSets, setNewExerciseSets] = useState<SetData[]>([{ id: crypto.randomUUID(), weight: 0, reps: 0, completed: false }]);

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
          .eq('id', workoutId)
          .single();
        
        if (workoutError) throw workoutError;
        
        // Get exercises for this workout
        const { data: exercisesData, error: exercisesError } = await supabase
          .from('exercises')
          .select('*')
          .eq('workout_id', workoutId);
        
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
          date: workoutData.date,
          completed: workoutData.completed,
          notes: workoutData.notes,
          exercises: exercises
        });
      } catch (error: any) {
        setError(error.message || 'Failed to load workout');
      } finally {
        setLoading(false);
      }
    };
    
    checkUserAndLoadWorkout();
  }, [workoutId, router]);

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
    
    setSaving(true);
    
    try {
      // Update workout in database
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
      
      // Exit edit mode when completing workout
      setEditMode(false);
    } catch (error: any) {
      console.error('Error completing workout:', error);
      setError(error.message || 'Failed to complete workout');
    } finally {
      setSaving(false);
    }
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
  };

  const addExercise = async () => {
    if (!workout || !selectedLiftType) {
      setError('Please select a lift type');
      return;
    }
    
    setSaving(true);
    
    try {
      // Find the lift type name for display purposes
      const liftType = liftTypes.find(lt => lt.id === selectedLiftType);
      
      // Create exercise in database
      const { data: exerciseData, error: exerciseError } = await supabase
        .from('exercises')
        .insert([
          {
            name: liftType?.name || null,
            workout_id: workout.id,
            lift_type_id: selectedLiftType
          }
        ])
        .select()
        .single();
      
      if (exerciseError) throw exerciseError;
      
      // Create sets in database
      const setsToInsert = newExerciseSets.map(set => ({
        exercise_id: exerciseData.id,
        reps: set.reps,
        weight: set.weight,
        completed: false
      }));
      
      const { data: setsData, error: setsError } = await supabase
        .from('sets')
        .insert(setsToInsert)
        .select();
      
      if (setsError) throw setsError;
      
      // Update local state
      const newExercise: ExerciseData = {
        id: exerciseData.id,
        name: liftType?.name || 'Unknown Exercise',
        liftTypeId: selectedLiftType,
        liftTypeName: liftType?.name || null,
        sets: setsData.map((set: any) => ({
          id: set.id,
          weight: set.weight,
          reps: set.reps,
          completed: false
        }))
      };
      
      setWorkout(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          exercises: [...prev.exercises, newExercise]
        };
      });
      
      setSelectedLiftType('');
      setNewExerciseSets([{ id: crypto.randomUUID(), weight: 0, reps: 0, completed: false }]);
    } catch (error: any) {
      console.error('Error adding exercise:', error);
      setError('Failed to add exercise: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const addSetToExercise = async (exerciseId: string) => {
    if (!workout) return;
    
    setSaving(true);
    
    try {
      const newSet: SetData = {
        id: crypto.randomUUID(), // Temporary ID
        weight: 0,
        reps: 0,
        completed: false
      };
      
      // Add to database
      const { data: setData, error: setError } = await supabase
        .from('sets')
        .insert([
          {
            exercise_id: exerciseId,
            weight: newSet.weight,
            reps: newSet.reps,
            completed: newSet.completed
          }
        ])
        .select()
        .single();
      
      if (setError) throw setError;
      
      // Update local state
      setWorkout(prev => {
        if (!prev) return prev;
        
        const updatedExercises = [...prev.exercises];
        const exerciseIndex = updatedExercises.findIndex(ex => ex.id === exerciseId);
        
        if (exerciseIndex !== -1) {
          updatedExercises[exerciseIndex] = {
            ...updatedExercises[exerciseIndex],
            sets: [
              ...updatedExercises[exerciseIndex].sets,
              {
                id: setData.id,
                weight: setData.weight,
                reps: setData.reps,
                completed: setData.completed
              }
            ]
          };
        }
        
        return {
          ...prev,
          exercises: updatedExercises
        };
      });
    } catch (error: any) {
      console.error('Error adding set:', error);
      setError('Failed to add set: ' + error.message);
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
    <div className="min-h-screen bg-gray-900 pb-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center">
            <Link
              href="/workouts"
              className="mr-4 flex items-center rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Workouts
            </Link>
            <h1 className="text-2xl font-bold text-gray-100">
              {new Date(workout.date).toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleEditMode}
              className="flex items-center rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </button>
          </div>
        </div>

        {/* Workout Info */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-gray-800 p-6 border border-gray-700 shadow-md">
            <h2 className="mb-4 text-lg font-medium text-gray-200">Workout Details</h2>
            <div className="space-y-3">
              <div className="flex items-center text-gray-300">
                <Calendar className="mr-2 h-5 w-5 text-gray-400" />
                <span>{new Date(workout.date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center text-gray-300">
                <Clock className="mr-2 h-5 w-5 text-gray-400" />
                <span>
                  {new Date(workout.date).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-gray-800 p-6 border border-gray-700 shadow-md">
            <h2 className="mb-4 text-lg font-medium text-gray-200">Workout Summary</h2>
            <div className="space-y-3">
              <div className="flex items-center text-gray-300">
                <Dumbbell className="mr-2 h-5 w-5 text-gray-400" />
                <span>{workout.exercises.length} Exercises</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-gray-800 p-6 border border-gray-700 shadow-md">
            <h2 className="mb-4 text-lg font-medium text-gray-200">Notes</h2>
            {workout.notes ? (
              <p className="text-gray-300 whitespace-pre-line">{workout.notes}</p>
            ) : (
              <p className="text-gray-400 italic">No notes for this workout</p>
            )}
          </div>
        </div>

        {/* Exercises */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-100">Exercises</h2>
        </div>

        {workout.exercises.length === 0 ? (
          <div className="rounded-lg bg-gray-800 p-8 text-center border border-gray-700 shadow-md">
            <Dumbbell className="mx-auto h-12 w-12 text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No Exercises Yet</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              Start adding exercises to track your workout progress.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {workout.exercises.map((exercise, index) => (
              <div 
                key={exercise.id} 
                className="rounded-lg bg-gray-800 border border-gray-700 shadow-md overflow-hidden"
              >
                <div className="bg-gray-800 p-6 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-100">{exercise.name}</h3>
                      {exercise.liftTypeName && (
                        <span className="mt-1 inline-block text-sm text-gray-400">
                          {exercise.liftTypeName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sets */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-900">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
                        >
                          Set
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
                        >
                          Weight
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
                        >
                          Reps
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 bg-gray-800">
                      {exercise.sets.map((set, setIndex) => (
                        <tr key={set.id} className="hover:bg-gray-700">
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">
                            {setIndex + 1}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-100">
                            {set.weight} lbs
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-300">
                            {set.reps}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-gray-800 px-6 py-4 border-t border-gray-700">
                  {!workout.completed && editMode && (
                    <button
                      onClick={() => addSetToExercise(exercise.id)}
                      className="flex items-center rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Set
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Exercise */}
      {!workout.completed && editMode && (
        <div className="mb-8 rounded-lg border bg-gray-800 p-6 shadow-md">
          <h3 className="mb-4 text-lg font-medium text-gray-100">Add New Exercise</h3>
          
          <div className="mb-4">
            <label htmlFor="liftType" className="mb-2 block text-sm font-medium text-gray-300">
              Select Lift Type
            </label>
            <LiftTypeSelector
              liftTypes={liftTypes}
              selectedLiftType={selectedLiftType}
              onSelect={setSelectedLiftType}
              placeholder="Select Lift Type"
              className="w-full"
            />
          </div>
          
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Initial Set
            </label>
            <div className="flex space-x-4">
              <div>
                <label htmlFor="weight" className="mb-1 block text-xs font-medium text-gray-500">
                  Weight
                </label>
                <input
                  type="number"
                  id="weight"
                  min="0"
                  step="2.5"
                  value={newExerciseSets[0].weight || ''}
                  onChange={(e) => setNewExerciseSets([{...newExerciseSets[0], weight: parseFloat(e.target.value) || 0}])}
                  className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="Weight"
                />
              </div>
              <div>
                <label htmlFor="reps" className="mb-1 block text-xs font-medium text-gray-500">
                  Reps
                </label>
                <input
                  type="number"
                  id="reps"
                  min="0"
                  value={newExerciseSets[0].reps || ''}
                  onChange={(e) => setNewExerciseSets([{...newExerciseSets[0], reps: parseInt(e.target.value) || 0}])}
                  className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="Reps"
                />
              </div>
            </div>
          </div>
          
          <button
            onClick={addExercise}
            disabled={!selectedLiftType}
            className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Add Exercise
          </button>
        </div>
      )}
    </div>
  );
}
