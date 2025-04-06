'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import AddLiftTypeForm from './AddLiftTypeForm';
import { cn } from '@/lib/utils';

interface AddLiftTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newLiftType: { id: string; name: string }) => void;
}

export default function AddLiftTypeModal({
  isOpen,
  onClose,
  onSuccess
}: AddLiftTypeModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        overlayRef.current && 
        event.target instanceof Node &&
        overlayRef.current.contains(event.target) && 
        event.target === overlayRef.current
      ) {
        onClose();
      }
    };

    // Handle escape key to close modal
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      // Prevent scrolling when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
      // Restore scrolling when modal is closed
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Don't render anything if the modal is not open
  if (!isOpen) return null;

  // Use createPortal to render the modal at the end of the document body
  return createPortal(
    <div 
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
    >
      <div 
        className={cn(
          "w-full max-w-md transform overflow-hidden rounded-lg bg-gray-800 p-0 shadow-xl transition-all",
          "animate-in fade-in zoom-in-95 duration-300"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <AddLiftTypeForm 
          onCancel={onClose} 
          onSuccess={(newLiftType) => {
            if (onSuccess) {
              onSuccess(newLiftType);
            }
            onClose();
          }}
        />
      </div>
    </div>,
    document.body
  );
}
