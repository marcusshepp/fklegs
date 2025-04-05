'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WorkoutHistory() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the main workouts page
    router.push('/workouts');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex items-center space-x-2">
        <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
        <p className="text-lg">Redirecting...</p>
      </div>
    </div>
  );
}
