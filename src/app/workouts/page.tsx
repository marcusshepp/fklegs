'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, Plus, Calendar, Dumbbell, Clock, MoreVertical, Pencil, Trash2, X, AlertTriangle, BarChart2, Search, ArrowRight } from 'lucide-react';

type Workout = {
  id: string;
  date: string;
  completed: boolean;
  created_at: string;
  totalSets: number;
};

// Toast component
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => {
  return (
    <div className={`fixed bottom-4 right-4 z-50 rounded-md p-4 shadow-lg ${type === 'success' ? 'bg-green-900' : 'bg-red-900'}`}>
      <div className="flex items-center">
        <span className={`mr-2 text-sm font-medium ${type === 'success' ? 'text-green-200' : 'text-red-200'}`}>
          {message}
        </span>
        <button
          onClick={onClose}
          className={`ml-4 rounded-full p-1 ${type === 'success' ? 'text-green-200 hover:bg-green-800' : 'text-red-200 hover:bg-red-800'}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// Confirmation Dialog component
const ConfirmationDialog = ({ 
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
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-gray-800 p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-medium text-gray-100">{title}</h3>
        <p className="mb-6 text-sm text-gray-300">{message}</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Workouts() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
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
        console.log("Loading workouts for user:", data.user.id);
        
        // Get all workouts - ensure we get distinct workouts
        const { data: workoutsData, error: workoutsError } = await supabase
          .from('workouts')
          .select(`
            id,
            date,
            completed,
            created_at,
            exercises:exercises(
              id,
              sets:sets(id)
            )
          `)
          .eq('user_id', data.user.id)
          .order('date', { ascending: sortOrder === 'oldest' });
        
        if (workoutsError) throw workoutsError;
        
        console.log("Raw workouts data from database:", workoutsData);
        
        // Ensure we have unique workouts by ID
        const uniqueWorkouts = Array.from(
          new Map(workoutsData.map((workout: any) => [workout.id, workout])).values()
        );
        
        console.log("Unique workouts after deduplication:", uniqueWorkouts);
        
        const formattedWorkouts = uniqueWorkouts.map((workout: any) => {
          // Calculate total sets
          let totalSets = 0;
          if (workout.exercises && workout.exercises.length > 0) {
            workout.exercises.forEach((exercise: any) => {
              if (exercise.sets) {
                totalSets += exercise.sets.length;
              }
            });
          }
          
          return {
            id: workout.id,
            date: new Date(workout.date).toLocaleDateString(),
            completed: workout.completed,
            created_at: workout.created_at,
            totalSets: totalSets
          };
        });
        
        setWorkouts(formattedWorkouts);
      } catch (error: any) {
        console.error('Error loading workouts:', error);
        setError(error.message || 'Failed to load workouts');
      } finally {
        setLoading(false);
      }
    };

    checkUserAndLoadWorkouts();
  }, [router, sortOrder]);

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
    
    // Find the workout
    const workout = workouts.find(w => w.id === workoutId);
    if (!workout) return;
    
    // Open confirmation dialog
    setConfirmDialog({
      isOpen: true,
      workoutId,
      workoutName: `Workout on ${workout.date}`
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

  // Handle sort order change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOrder(e.target.value as 'newest' | 'oldest');
  };

  return (
    <div className="min-h-screen bg-gray-900 pb-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-100">Workouts</h1>
          <div className="flex space-x-4">
            <Link
              href="/workouts/stats"
              className="flex items-center rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              <BarChart2 className="mr-2 h-4 w-4" />
              Stats
            </Link>
            <Link
              href="/workouts/new"
              className="flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Workout
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search workouts..."
              className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 bg-gray-800 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-700 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm"
              value=""
              onChange={(e) => {}}
            />
          </div>
          <div>
            <select
              className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 bg-gray-800 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm"
              value={sortOrder}
              onChange={handleSortChange}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Workouts List */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-indigo-500"></div>
              <span className="mt-2 text-sm text-gray-400">Loading workouts...</span>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-lg bg-red-900/20 p-4 text-red-400">
            <p className="text-center">{error}</p>
          </div>
        ) : workouts.length === 0 ? (
          <div className="rounded-lg bg-gray-800 p-8 text-center border border-gray-700 shadow-md">
            <Dumbbell className="mx-auto h-12 w-12 text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No Workouts Found</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              You haven't recorded any workouts yet.
            </p>
            <Link
              href="/workouts/new"
              className="mt-4 inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Workout
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {workouts.map((workout) => (
              <div key={workout.id} className="relative rounded-lg bg-gray-800 border border-gray-700 shadow-md hover:bg-gray-700/80 transition-colors duration-200">
                {/* Menu Button */}
                <div className="absolute top-2 right-2 z-10">
                  <button
                    onClick={(e) => toggleMenu(workout.id, e)}
                    className="rounded-full p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none"
                    aria-label="Workout options"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {activeMenu === workout.id && (
                    <div 
                      ref={(el) => {
                        if (el) {
                          menuRefs.current[workout.id] = el;
                        }
                      }}
                      className="absolute right-0 mt-1 w-48 rounded-md bg-gray-700 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20"
                    >
                      <div className="py-1">
                        <button
                          onClick={() => handleEdit(workout.id)}
                          className="flex w-full items-center px-4 py-2 text-sm text-gray-200 hover:bg-gray-600"
                        >
                          <Pencil className="mr-3 h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteConfirmation(workout.id)}
                          className="flex w-full items-center px-4 py-2 text-sm text-red-400 hover:bg-gray-600"
                        >
                          <Trash2 className="mr-3 h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                <Link
                  href={`/workouts/${workout.id}`}
                  className="block"
                >
                  <div className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-100">
                        {formatDate(workout.date)}
                      </h2>
                      <span className="inline-flex items-center rounded-full bg-indigo-900/20 px-2.5 py-0.5 text-xs font-medium text-indigo-400">
                        {new Date(workout.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    <div className="mb-4 flex items-center text-gray-400">
                      <Clock className="mr-1.5 h-4 w-4" />
                      <span className="text-sm">
                        {formatDate(workout.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-gray-400">
                        <Dumbbell className="mr-1.5 h-4 w-4" />
                        <span className="text-sm">{workout.totalSets} {workout.totalSets === 1 ? 'set' : 'sets'}</span>
                      </div>
                      <div className="flex items-center text-gray-400">
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={handleDelete}
        title="Delete Workout"
        message={`Are you sure you want to delete "${confirmDialog.workoutName}"? This action cannot be undone.`}
      />
      
      {/* Toast Notification */}
      {toast.isOpen && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, isOpen: false })}
        />
      )}
    </div>
  );
}
