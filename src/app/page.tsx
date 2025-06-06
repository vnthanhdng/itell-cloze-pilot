'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { getUser, getTestResults } from '../lib/firebase';
import { getCurrentTest, hasCompletedEnoughAnnotations } from '../lib/userProgress';
import Registration from '../components/Registration';

export default function HomePage() {
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
            setLoading(false);
            return;
          }
          
          const progress = await getCurrentTest(user.uid);
          
          if (progress.complete) {
            // User has completed 10+ annotations
            router.push('/complete');
          } else {
            // Get the next test
            if (progress.currentTest) {
              // Redirect to current test with standardized method name
              router.push(`/test/${progress.currentTest.method}/${progress.currentTest.passageId}`);
            }
          }
        } catch (err) {
          console.error('Error checking user progress:', err);
          setError('Failed to retrieve your progress. Please try again.');
        } finally {
          setLoading(false);
        }
      } else {
        // Not logged in
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleRegistrationComplete = (uid: string) => {
    // Let the system determine the first test URL from the counterbalancing
    // No hardcoded redirect to /test/A/1 anymore
    router.push('/test'); // This will redirect to the appropriate test
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <p className="text-lg mb-2">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <p>{error}</p>
        </div>
      )}
      
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-4">iTELL Cloze Test Study</h1>
        <p className="text-lg text-gray-700 mb-6">
          Welcome to our study on different methods for generating fill-in-the-blank tests in educational texts.
        </p>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Study Information</h2>
        <div className="space-y-4">
          <p>
            In this study, you will read passages and complete fill-in-the-blank tests.
            You'll need to complete at least 6 annotations across various tests.
          </p>
          <p>
            The entire study should take approximately 30-45 minutes to complete.
            Your participation helps us understand which methods are most effective for learning.
          </p>
          <p>
            Your responses will be kept confidential and used only for research purposes.
          </p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Get Started</h2>
          <Registration onComplete={handleRegistrationComplete} />
        </div>
      </div>
    </div>
  );
}