'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, ChevronUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type LiftType = {
  id: string;
  name: string;
};

interface LiftTypeSelectorProps {
  liftTypes: LiftType[];
  selectedLiftType: string;
  onSelect: (liftTypeId: string) => void;
  placeholder?: string;
  className?: string;
}

export default function LiftTypeSelector({
  liftTypes,
  selectedLiftType,
  onSelect,
  placeholder = 'Select Lift Type',
  className
}: LiftTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter lift types based on search term
  const filteredLiftTypes = liftTypes.filter(liftType =>
    liftType.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get the name of the currently selected lift type
  const selectedLiftTypeName = liftTypes.find(lt => lt.id === selectedLiftType)?.name || '';

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus the search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (liftTypeId: string) => {
    onSelect(liftTypeId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm('');
    }
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect('');
    setSearchTerm('');
  };

  return (
    <div 
      className={cn(
        "relative w-full",
        className
      )}
      ref={dropdownRef}
    >
      {/* Selected value / trigger button */}
      <button
        type="button"
        onClick={toggleDropdown}
        className="flex w-full items-center justify-between rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-left text-base font-medium text-gray-100 shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center truncate">
          {selectedLiftType ? (
            <span className="truncate">{selectedLiftTypeName}</span>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center">
          {selectedLiftType && (
            <button
              type="button"
              onClick={clearSelection}
              className="mr-1 rounded-full p-1 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
          {/* Search input */}
          <div className="sticky top-0 z-10 bg-gray-800 px-3 py-2">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                ref={inputRef}
                type="text"
                className="block w-full rounded-md border-0 bg-gray-700 py-1.5 pl-10 pr-3 text-gray-100 ring-1 ring-inset ring-gray-600 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                placeholder="Search lift types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Options list */}
          <ul
            className="max-h-48 overflow-y-auto py-1"
            role="listbox"
          >
            {filteredLiftTypes.length > 0 ? (
              filteredLiftTypes.map((liftType) => (
                <li
                  key={liftType.id}
                  className={cn(
                    "relative cursor-pointer select-none py-2 pl-3 pr-9 text-gray-100",
                    liftType.id === selectedLiftType 
                      ? "bg-indigo-600" 
                      : "hover:bg-gray-700"
                  )}
                  role="option"
                  aria-selected={liftType.id === selectedLiftType}
                  onClick={() => handleSelect(liftType.id)}
                >
                  <span className="block truncate font-medium">
                    {liftType.name}
                  </span>
                </li>
              ))
            ) : (
              <li className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-400">
                No lift types found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
