'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddLiftTypeFormProps {
  onSuccess?: (newLiftType: { id: string; name: string }) => void;
  onCancel?: () => void;
  className?: string;
}

export default function AddLiftTypeForm({
  onSuccess,
  onCancel,
  className
}: AddLiftTypeFormProps) {
  const [liftTypeName, setLiftTypeName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!liftTypeName.trim()) {
      setError('Please enter a lift type name');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Insert the new lift type into the database
      const { data, error: insertError } = await supabase
        .from('lift_types')
        .insert([{ name: liftTypeName.trim() }])
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') { // Unique violation
          setError('This lift type already exists');
        } else {
          setError(insertError.message || 'Failed to add lift type');
        }
        return;
      }

      // Success
      setSuccessMessage(`Added new lift type: ${liftTypeName}`);
      setLiftTypeName('');
      
      // Call the onSuccess callback if provided
      if (onSuccess && data) {
        onSuccess(data);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Error adding lift type:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("bg-gray-800 rounded-md p-4 border border-gray-700", className)}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-100">Add New Lift Type</h3>
        {onCancel && (
          <button 
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-300"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="liftTypeName" className="block text-sm font-medium text-gray-300 mb-1">
            Lift Type Name
          </label>
          <input
            type="text"
            id="liftTypeName"
            value={liftTypeName}
            onChange={(e) => setLiftTypeName(e.target.value)}
            className="w-full rounded-md border-0 bg-gray-700 py-1.5 px-3 text-gray-100 ring-1 ring-inset ring-gray-600 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm"
            placeholder="e.g., Barbell Bench Press"
            disabled={isSubmitting}
          />
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-900/30 border border-red-800 rounded text-red-200 text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-2 bg-green-900/30 border border-green-800 rounded text-green-200 text-sm">
            {successMessage}
          </div>
        )}

        <div className="flex justify-end space-x-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md bg-gray-700 px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add Lift Type'}
          </button>
        </div>
      </form>
    </div>
  );
}
