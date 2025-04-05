'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, Plus, Calendar, Dumbbell, Clock, MoreVertical, Pencil, Trash2, X, AlertTriangle } from 'lucide-react';

type Workout = {
  id: string;
  date: string;
  name: string;
  completed: boolean;
  created_at: string;
};

// Custom confirmation dialog component
function ConfirmationDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  message: string 
}) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-center">
          <AlertTriangle className="mr-3 h-6 w-6 text-red-500" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
        </div>
        <div className="mb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
        </div>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// Toast notification component
function Toast({ 
  message, 
  type = 'success', 
  onClose 
}: { 
  message: string; 
  type?: 'success' | 'error'; 
  onClose: () => void 
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center rounded-lg bg-white px-4 py-3 shadow-lg dark:bg-gray-800">
      <div className={`mr-3 flex h-8 w-8 items-center justify-center rounded-full ${
        type === 'success' 
          ? 'bg-green-100 text-green-500 dark:bg-green-900/30 dark:text-green-400' 
          : 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400'
      }`}>
        {type === 'success' ? '✓' : '✕'}
      </div>
      <div className="mr-4">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

export default function Workouts() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  
  // State for confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    workoutId: '',
    workoutName: ''
  });
  
  // State for toast notification
  const [toast, setToast] = useState({
    isOpen: false,
    message: '',
    type: 'success' as 'success' | 'error'
  });

  useEffect(() => {
    const checkUserAndLoadWorkouts = async () => {
      // Check if user is authenticated
      const { data } = await supabase.auth.getUser();
      
      if (!data.user) {
        router.push('/auth/login');
        return;
      }
      
      setUser(data.user);
      
      // Load workouts
      try {
        // Get all workouts
        const { data: workoutsData, error: workoutsError } = await supabase
          .from('workouts')
          .select(`
            id,
            date,
            name,
            completed,
            created_at
          `)
          .eq('user_id', data.user.id)
          .order('date', { ascending: false });
        
        if (workoutsError) throw workoutsError;
        
        const formattedWorkouts = workoutsData.map((workout: any) => ({
          id: workout.id,
          date: new Date(workout.date).toLocaleDateString(),
          name: workout.name || `Workout ${new Date(workout.date).toLocaleDateString()}`,
          completed: workout.completed,
          created_at: workout.created_at,
        }));
        
        setWorkouts(formattedWorkouts);
      } catch (error: any) {
        console.error('Error loading workouts:', error);
        setError(error.message || 'Failed to load workouts');
      } finally {
        setLoading(false);
      }
    };

    checkUserAndLoadWorkouts();
  }, [router]);

  useEffect(() => {
    // Handle clicks outside the menu
    function handleClickOutside(event: MouseEvent) {
      if (activeMenu && !menuRefs.current[activeMenu]?.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }

    // Add event listener
    document.addEventListener("mousedown", handleClickOutside);
    
    // Clean up
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeMenu]);
  
  // Auto-close toast after 3 seconds
  useEffect(() => {
    if (toast.isOpen) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, isOpen: false }));
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [toast.isOpen]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const toggleMenu = (workoutId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveMenu(activeMenu === workoutId ? null : workoutId);
  };

  const handleEdit = (workoutId: string) => {
    router.push(`/workouts/${workoutId}/edit`);
  };
  
  const openDeleteConfirmation = (workoutId: string) => {
    // Close any open menu
    setActiveMenu(null);
    
    // Find the workout name
    const workout = workouts.find(w => w.id === workoutId);
    if (!workout) return;
    
    // Open confirmation dialog
    setConfirmDialog({
      isOpen: true,
      workoutId,
      workoutName: workout.name
    });
  };

  const handleDelete = async () => {
    const { workoutId } = confirmDialog;
    
    // Close the confirmation dialog
    setConfirmDialog({
      isOpen: false,
      workoutId: '',
      workoutName: ''
    });
    
    try {
      // First delete all sets associated with exercises in this workout
      const { data: exercises, error: exercisesError } = await supabase
        .from('exercises')
        .select('id')
        .eq('workout_id', workoutId);
      
      if (exercisesError) {
        throw exercisesError;
      }
      
      if (exercises && exercises.length > 0) {
        const exerciseIds = exercises.map(ex => ex.id);
        
        const { error: setsError } = await supabase
          .from('sets')
          .delete()
          .in('exercise_id', exerciseIds);
          
        if (setsError) {
          throw setsError;
        }
      }
      
      // Then delete all exercises associated with this workout
      const { error: exerciseDeleteError } = await supabase
        .from('exercises')
        .delete()
        .eq('workout_id', workoutId);
        
      if (exerciseDeleteError) {
        throw exerciseDeleteError;
      }
      
      // Finally delete the workout itself
      const { error: workoutDeleteError } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId);
      
      if (workoutDeleteError) {
        throw workoutDeleteError;
      }
      
      // Update local state
      setWorkouts(workouts.filter(workout => workout.id !== workoutId));
      
      // Show success toast
      setToast({
        isOpen: true,
        message: 'Workout deleted successfully',
        type: 'success'
      });
    } catch (error: any) {
      console.error('Error deleting workout:', error);
      
      // Show error toast
      setToast({
        isOpen: true,
        message: `Failed to delete workout: ${error.message}`,
        type: 'error'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href="/dashboard" 
              className="rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Workouts</h1>
          </div>
          <Link
            href="/workouts/new"
            className="flex items-center justify-center rounded-full bg-blue-600 p-3 text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500"
            aria-label="New Workout"
          >
            <Plus className="h-5 w-5" />
          </Link>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
              <p className="text-lg text-gray-600 dark:text-gray-300">Loading workouts...</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400 dark:text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error loading workouts</h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        ) : workouts.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
            <Dumbbell className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No workouts yet</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new workout.</p>
            <div className="mt-6">
              <Link
                href="/workouts/new"
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Workout
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-800">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {workouts.map((workout) => (
                <li key={workout.id} className="relative">
                  <div className="group flex items-center justify-between px-6 py-4">
                    <Link
                      href={`/workouts/${workout.id}`}
                      className="flex flex-1 items-center space-x-3"
                    >
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                        workout.completed 
                          ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        <Dumbbell className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {workout.name}
                        </p>
                        <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center">
                            <Clock className="mr-1 h-3.5 w-3.5" />
                            <span>{formatDate(workout.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                    
                    <div className="flex items-center space-x-2">
                      <div className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        workout.completed 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {workout.completed ? 'Completed' : 'In Progress'}
                      </div>
                      
                      <div className="relative" ref={(el) => { menuRefs.current[workout.id] = el; }}>
                        <button 
                          onClick={(e) => toggleMenu(workout.id, e)}
                          className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                          aria-label="Workout options"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>
                        
                        {activeMenu === workout.id && (
                          <div className="absolute right-0 z-10 mt-1 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-800 dark:ring-gray-700">
                            <button
                              onClick={() => handleEdit(workout.id)}
                              className="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                              <Pencil className="mr-3 h-4 w-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => openDeleteConfirmation(workout.id)}
                              className="flex w-full items-center px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700"
                            >
                              <Trash2 className="mr-3 h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleDelete}
        title="Delete Workout"
        message={`Are you sure you want to delete "${confirmDialog.workoutName}"? This action cannot be undone and will remove all exercises and sets associated with this workout.`}
      />
      
      {/* Toast Notification */}
      {toast.isOpen && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
}
