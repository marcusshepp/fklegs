'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  Plus, 
  Copy, 
  Trash2, 
  CheckCircle, 
  Circle, 
  ChevronDown, 
  ChevronUp, 
  Dumbbell, 
  Save, 
  ArrowLeft,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Define types for our workout data
type Exercise = {
  id: string;
  name: string | null;
  liftTypeId: string;
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

// Extend Window interface to include our custom properties
declare global {
  interface Window {
    updateSetTimeout: ReturnType<typeof setTimeout> | null;
  }
}

export default function NewWorkout() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formattedDate, setFormattedDate] = useState<string>('');
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string | null>(null);

  // Get current date in format "April 5, 2025"
  const getFormattedDate = () => {
    const date = new Date();
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Get current date in format "Workout Apr 5, 2025" for default workout name
  const getDefaultWorkoutName = () => {
    const date = new Date();
    return `Workout ${date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })}`;
  };

  const [workoutName, setWorkoutName] = useState<string>('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedLiftType, setSelectedLiftType] = useState<string>('');
  const [liftTypes, setLiftTypes] = useState<LiftType[]>([]);
  const [newExerciseSets, setNewExerciseSets] = useState<Set[]>([{ id: crypto.randomUUID(), weight: 0, reps: 0, completed: false }]);

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
      
      // Set the current date and formatted date
      const defaultName = getDefaultWorkoutName();
      const formatted = getFormattedDate();
      setWorkoutName(defaultName);
      setFormattedDate(formatted);
      
      // Create initial workout
      try {
        const { data: workoutData, error: workoutError } = await supabase
          .from('workouts')
          .insert([
            {
              name: defaultName,
              user_id: data.user.id,
              date: new Date().toISOString(),
              completed: false
            }
          ])
          .select()
          .single();

        if (workoutError) throw workoutError;
        setWorkoutId(workoutData.id);
      } catch (error: any) {
        console.error('Error creating initial workout:', error);
        setError('Failed to create workout. Please try again.');
      }
      
      setLoading(false);
    };

    checkUserAndLoadLiftTypes();
  }, [router]);

  // Auto-save workout name when it changes
  useEffect(() => {
    const saveWorkoutName = async () => {
      if (!workoutId || !user) return;
      
      try {
        setAutoSaveStatus('Saving...');
        await supabase
          .from('workouts')
          .update({ name: workoutName })
          .eq('id', workoutId);
        
        setAutoSaveStatus('Saved');
        
        // Clear status after 2 seconds
        setTimeout(() => {
          setAutoSaveStatus(null);
        }, 2000);
      } catch (error) {
        console.error('Error saving workout name:', error);
        setAutoSaveStatus('Save failed');
        
        // Clear status after 2 seconds
        setTimeout(() => {
          setAutoSaveStatus(null);
        }, 2000);
      }
    };
    
    // Use debounce to avoid too many saves while typing
    const timeoutId = setTimeout(() => {
      if (workoutId && workoutName.trim()) {
        saveWorkoutName();
      }
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [workoutName, workoutId, user]);

  const addSet = () => {
    setNewExerciseSets([...newExerciseSets, { id: crypto.randomUUID(), weight: 0, reps: 0, completed: false }]);
  };

  const duplicateSet = () => {
    if (newExerciseSets.length === 0) {
      addSet();
      return;
    }
    
    const lastSet = newExerciseSets[newExerciseSets.length - 1];
    setNewExerciseSets([
      ...newExerciseSets, 
      { 
        id: crypto.randomUUID(), 
        weight: lastSet.weight, 
        reps: lastSet.reps, 
        completed: false 
      }
    ]);
  };

  const removeSet = (setId: string) => {
    if (newExerciseSets.length <= 1) return; // Don't remove the last set
    const updatedSets = newExerciseSets.filter(set => set.id !== setId);
    setNewExerciseSets(updatedSets);
  };

  const updateSetValue = (setId: string, field: 'weight' | 'reps', value: number) => {
    const updatedSets = [...newExerciseSets];
    const setIndex = updatedSets.findIndex(set => set.id === setId);
    if (setIndex !== -1) {
      updatedSets[setIndex] = { ...updatedSets[setIndex], [field]: value };
      setNewExerciseSets(updatedSets);
    }
  };

  const addExercise = async () => {
    if (!selectedLiftType) {
      setError('Please select a lift type');
      return;
    }
    
    if (!workoutId) {
      setError('Workout not initialized yet. Please try again.');
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
            workout_id: workoutId,
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
        completed: set.completed
      }));
      
      const { data: setsData, error: setsError } = await supabase
        .from('sets')
        .insert(setsToInsert)
        .select();
      
      if (setsError) throw setsError;
      
      // Update local state
      const newExercise: Exercise = {
        id: exerciseData.id,
        name: liftType?.name || null,
        liftTypeId: selectedLiftType,
        sets: setsData.map((set: any) => ({
          id: set.id,
          weight: set.weight,
          reps: set.reps,
          completed: set.completed
        }))
      };
      
      setExercises([...exercises, newExercise]);
      setSelectedLiftType('');
      setNewExerciseSets([{ id: crypto.randomUUID(), weight: 0, reps: 0, completed: false }]);
      setError(null);
      
      // Show success message
      setAutoSaveStatus('Exercise added');
      setTimeout(() => {
        setAutoSaveStatus(null);
      }, 2000);
    } catch (error: any) {
      console.error('Error adding exercise:', error);
      setError('Failed to add exercise: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const removeExercise = async (exerciseId: string) => {
    setSaving(true);
    
    try {
      // Delete from database
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', exerciseId);
      
      if (error) throw error;
      
      // Update local state
      setExercises(exercises.filter(exercise => exercise.id !== exerciseId));
      
      // Show success message
      setAutoSaveStatus('Exercise removed');
      setTimeout(() => {
        setAutoSaveStatus(null);
      }, 2000);
    } catch (error: any) {
      console.error('Error removing exercise:', error);
      setError('Failed to remove exercise: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const addSetToExercise = async (exerciseId: string) => {
    setSaving(true);
    
    try {
      const newSet: Set = {
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
      const updatedExercises = [...exercises];
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
        
        setExercises(updatedExercises);
      }
      
      // Show success message
      setAutoSaveStatus('Set added');
      setTimeout(() => {
        setAutoSaveStatus(null);
      }, 2000);
    } catch (error: any) {
      console.error('Error adding set:', error);
      setError('Failed to add set: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateExerciseSet = async (exerciseId: string, setId: string, field: 'weight' | 'reps', value: number) => {
    // Update local state immediately
    const updatedExercises = exercises.map(exercise => {
      if (exercise.id === exerciseId) {
        const updatedSets = exercise.sets.map(set => {
          if (set.id === setId) {
            return { ...set, [field]: value };
          }
          return set;
        });
        return { ...exercise, sets: updatedSets };
      }
      return exercise;
    });
    
    setExercises(updatedExercises);
    
    // Debounced update to database
    const updateDatabase = async () => {
      try {
        setAutoSaveStatus('Saving...');
        const { error } = await supabase
          .from('sets')
          .update({ [field]: value })
          .eq('id', setId);
        
        if (error) throw error;
        
        setAutoSaveStatus('Saved');
        // Clear status after 2 seconds
        setTimeout(() => {
          setAutoSaveStatus(null);
        }, 2000);
      } catch (error: any) {
        console.error(`Error updating set ${field}:`, error);
        // Revert local state if database update fails
        setError(`Failed to update set: ${error.message}`);
        setAutoSaveStatus('Error saving');
      }
    };
    
    // Debounce the database update
    if (window.updateSetTimeout) {
      clearTimeout(window.updateSetTimeout);
    }
    
    window.updateSetTimeout = setTimeout(updateDatabase, 500);
  };

  const removeExerciseSet = async (exerciseId: string, setId: string) => {
    const exercise = exercises.find(ex => ex.id === exerciseId);
    if (!exercise || exercise.sets.length <= 1) return; // Don't remove the last set
    
    setSaving(true);
    
    try {
      // Delete from database
      const { error } = await supabase
        .from('sets')
        .delete()
        .eq('id', setId);
      
      if (error) throw error;
      
      // Update local state
      const updatedExercises = [...exercises];
      const exerciseIndex = updatedExercises.findIndex(ex => ex.id === exerciseId);
      
      updatedExercises[exerciseIndex] = {
        ...updatedExercises[exerciseIndex],
        sets: updatedExercises[exerciseIndex].sets.filter(set => set.id !== setId)
      };
      
      setExercises(updatedExercises);
      
      // Show success message
      setAutoSaveStatus('Set removed');
      setTimeout(() => {
        setAutoSaveStatus(null);
      }, 2000);
    } catch (error: any) {
      console.error('Error removing set:', error);
      setError('Failed to remove set: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const duplicateExerciseSet = async (exerciseId: string) => {
    const updatedExercises = [...exercises];
    const exerciseIndex = updatedExercises.findIndex(ex => ex.id === exerciseId);
    
    if (exerciseIndex === -1 || updatedExercises[exerciseIndex].sets.length === 0) {
      return addSetToExercise(exerciseId);
    }
    
    setSaving(true);
    
    try {
      const exercise = updatedExercises[exerciseIndex];
      const lastSet = exercise.sets[exercise.sets.length - 1];
      
      // Add to database
      const { data: setData, error: setError } = await supabase
        .from('sets')
        .insert([
          {
            exercise_id: exerciseId,
            weight: lastSet.weight,
            reps: lastSet.reps,
            completed: false
          }
        ])
        .select()
        .single();
      
      if (setError) throw setError;
      
      // Update local state
      const newSet: Set = {
        id: setData.id,
        weight: setData.weight,
        reps: setData.reps,
        completed: setData.completed
      };
      
      updatedExercises[exerciseIndex] = {
        ...exercise,
        sets: [...exercise.sets, newSet]
      };
      
      setExercises(updatedExercises);
      
      // Show success message
      setAutoSaveStatus('Set duplicated');
      setTimeout(() => {
        setAutoSaveStatus(null);
      }, 2000);
    } catch (error: any) {
      console.error('Error duplicating set:', error);
      setError('Failed to duplicate set: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 bg-white shadow-sm dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/workouts"
                className="rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Workout</h1>
            </div>
            <div className="flex-1 mx-4">
              <input
                type="text"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                className="w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-500 sm:text-sm"
                placeholder="Workout Name"
              />
            </div>
            <div className="flex items-center">
              {autoSaveStatus && (
                <span className={cn(
                  "text-xs font-medium mr-2 px-2 py-1 rounded-full",
                  autoSaveStatus === 'Saving...' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
                  autoSaveStatus === 'Saved' && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
                  autoSaveStatus === 'Error saving' && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                )}>
                  {autoSaveStatus === 'Saving...' && 'Saving...'}
                  {autoSaveStatus === 'Saved' && 'Saved'}
                  {autoSaveStatus === 'Error saving' && 'Error'}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4 dark:bg-red-900">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <X className="h-5 w-5 text-red-400 dark:text-red-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                    <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Add exercise form */}
            <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4 shadow dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Add Exercise</h3>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-grow">
                  <select
                    value={selectedLiftType}
                    onChange={(e) => setSelectedLiftType(e.target.value)}
                    className="block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Select Lift Type</option>
                    {liftTypes.map((liftType) => (
                      <option key={liftType.id} value={liftType.id}>
                        {liftType.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <button
                  onClick={addExercise}
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Exercise
                </button>
              </div>
            </div>

            {/* Exercises list */}
            {exercises.length > 0 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Exercises</h3>
                  <ul className="mt-4 space-y-6">
                    {exercises.map((exercise) => {
                      // Find the lift type name
                      const liftType = liftTypes.find(lt => lt.id === exercise.liftTypeId);
                      
                      return (
                        <li key={exercise.id} className="rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-800">
                          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                            <div className="flex items-center">
                              <Dumbbell className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                              <h4 className="text-md font-medium text-gray-900 dark:text-white">
                                {liftType?.name || 'Unknown Exercise'}
                              </h4>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => removeExercise(exercise.id)}
                                className="rounded-full p-1 text-red-600 hover:bg-red-100 hover:text-red-800 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                                aria-label="Remove exercise"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="p-4">
                            <div className="overflow-x-auto sm:overflow-visible">
                              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="hidden sm:table-header-group">
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
                                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                      Actions
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
                                          <button
                                            onClick={() => removeExerciseSet(exercise.id, set.id)}
                                            className="rounded-full p-1.5 text-red-600 hover:bg-red-100 hover:text-red-800 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                                            disabled={exercise.sets.length <= 1}
                                            aria-label="Remove set"
                                          >
                                            <Trash2 className="h-5 w-5" />
                                          </button>
                                        </div>
                                        <div className="flex items-center space-x-6">
                                          <div className="flex flex-col">
                                            <span className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Weight</span>
                                            <input
                                              type="number"
                                              inputMode="decimal"
                                              pattern="[0-9]*"
                                              value={set.weight || ''}
                                              onChange={(e) => updateExerciseSet(exercise.id, set.id, 'weight', Number(e.target.value))}
                                              className="block w-24 rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-500 sm:text-sm"
                                              min="0"
                                              step="2.5"
                                              aria-label="Weight in pounds"
                                              placeholder="Weight"
                                            />
                                          </div>
                                          <div className="flex flex-col">
                                            <span className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Reps</span>
                                            <input
                                              type="number"
                                              inputMode="numeric"
                                              pattern="[0-9]*"
                                              value={set.reps || ''}
                                              onChange={(e) => updateExerciseSet(exercise.id, set.id, 'reps', Number(e.target.value))}
                                              className="block w-24 rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-500 sm:text-sm"
                                              min="0"
                                              aria-label="Number of repetitions"
                                              placeholder="Reps"
                                            />
                                          </div>
                                        </div>
                                      </td>
                                      
                                      {/* Desktop layout - traditional table */}
                                      <td className="hidden sm:table-cell whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-900 dark:text-white">
                                        {index + 1}
                                      </td>
                                      <td className="hidden sm:table-cell whitespace-nowrap px-3 py-2 text-sm text-gray-900 dark:text-white">
                                        <input
                                          type="number"
                                          inputMode="decimal"
                                          pattern="[0-9]*"
                                          value={set.weight || ''}
                                          onChange={(e) => updateExerciseSet(exercise.id, set.id, 'weight', Number(e.target.value))}
                                          className="block w-24 rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-500 sm:text-sm"
                                          min="0"
                                          step="2.5"
                                          aria-label="Weight in pounds"
                                          placeholder="Weight"
                                        />
                                      </td>
                                      <td className="hidden sm:table-cell whitespace-nowrap px-3 py-2 text-sm text-gray-900 dark:text-white">
                                        <input
                                          type="number"
                                          inputMode="numeric"
                                          pattern="[0-9]*"
                                          value={set.reps || ''}
                                          onChange={(e) => updateExerciseSet(exercise.id, set.id, 'reps', Number(e.target.value))}
                                          className="block w-24 rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:focus:ring-blue-500 sm:text-sm"
                                          min="0"
                                          aria-label="Number of repetitions"
                                          placeholder="Reps"
                                        />
                                      </td>
                                      <td className="hidden sm:table-cell whitespace-nowrap px-3 py-2 text-sm text-gray-900 dark:text-white">
                                        <button
                                          onClick={() => removeExerciseSet(exercise.id, set.id)}
                                          className="rounded-full p-1.5 text-red-600 hover:bg-red-100 hover:text-red-800 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                                          disabled={exercise.sets.length <= 1}
                                          aria-label="Remove set"
                                        >
                                          <Trash2 className="h-5 w-5" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            <div className="mt-8 flex items-center space-x-6">
                              <button
                                onClick={() => addSetToExercise(exercise.id)}
                                className="rounded-full p-3 text-blue-600 hover:bg-blue-100 hover:text-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
                                aria-label="Add set"
                              >
                                <Plus className="h-6 w-6" />
                              </button>
                              
                              <button
                                onClick={() => duplicateExerciseSet(exercise.id)}
                                className="rounded-full p-3 text-blue-600 hover:bg-blue-100 hover:text-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
                                aria-label="Duplicate last set"
                              >
                                <Copy className="h-6 w-6" />
                              </button>
                              
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                <span className="hidden sm:inline">Add or duplicate set</span>
                                <span className="sm:hidden">Add / duplicate set</span>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}

            {/* Link to go back to workouts list */}
            <div className="mt-8">
              <Link 
                href="/workouts" 
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <ArrowLeft className="h-4 w-4 inline mr-1" />
                Back to Workouts
              </Link>
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
          </>
        )}
      </main>
    </div>
  );
}
