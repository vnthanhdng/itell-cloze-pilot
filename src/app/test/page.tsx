'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { getUser } from '../../lib/firebase';
import { getCurrentTest } from '../../lib/userProgress';

export default function TestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Check user's progress
          const userData = await getUser(user.uid);
          
          if (!userData) {
            setError('User account not found. Please register first.');
            setLoading(false);
            return;
          }
          
          const progress = await getCurrentTest(user.uid);
          
          if (progress.complete) {
            // User has completed all tests
            router.push('/complete');
          } else if (progress.currentTest) {
            // Redirect to current test
            const { method, passageId } = progress.currentTest;
            router.push(`/test/${method}/${passageId}`);
          } else {
            setError('Failed to determine which test you should take next. Please contact support.');
          }
        } catch (err) {
          console.error('Error checking user progress:', err);
          setError('Failed to retrieve your progress. Please try again.');
        } finally {
          setLoading(false);
        }
      } else {
        // Not logged in
        router.push('/');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <p className="text-lg mb-2">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <button 
            onClick={() => router.push('/')} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="text-center">
        <p className="text-lg mb-2">Redirecting to your current test...</p>
      </div>
    </div>
  );
}