'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import AddLiftTypeModal from './AddLiftTypeModal';
import { LiftType } from './LiftTypeSelector';

interface AddLiftTypeButtonProps {
  onLiftTypeAdded?: (newLiftType: LiftType) => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  iconOnly?: boolean;
}

export default function AddLiftTypeButton({
  onLiftTypeAdded,
  className,
  variant = 'primary',
  size = 'md',
  iconOnly = false
}: AddLiftTypeButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleSuccess = (newLiftType: LiftType) => {
    if (onLiftTypeAdded) {
      onLiftTypeAdded(newLiftType);
    }
  };

  // Button style variants
  const variantStyles = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-500',
    secondary: 'bg-gray-700 text-gray-200 hover:bg-gray-600 focus:ring-gray-500',
    outline: 'bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-800 focus:ring-gray-500'
  };

  // Button size variants
  const sizeStyles = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={cn(
          "rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 flex items-center justify-center",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
      >
        <Plus className={cn("h-4 w-4", !iconOnly && "mr-1")} />
        {!iconOnly && <span>Add Lift Type</span>}
      </button>

      <AddLiftTypeModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSuccess={handleSuccess}
      />
    </>
  );
}
