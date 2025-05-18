'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { getUser, getTestResults, updateUser,  } from '../../lib/firebase';
import { getCurrentTest } from '@/src/lib/userProgress';

export default function CompletePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testResultsNum, setTestResultsNum] = useState(0);
  const [nextTest, setNextTest] = useState<{method: string, passageId: number} | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get user data
          const userData = await getUser(user.uid);
          
          if (!userData) {
            setError('User account not found. Please register first.');
            setLoading(false);
            return;
          }
          
          // Get test results to count - IMPORTANT: Use the direct count value, not state
          const testResults = await getTestResults(user.uid);
          const actualTestCount = testResults.length;
          console.log(`Direct test count: ${actualTestCount}, User ID: ${user.uid}`);
          
          // Set state (but don't rely on it immediately)
          setTestResultsNum(actualTestCount);
          
          // Also get the user's current test status
          const progress = await getCurrentTest(user.uid);
          console.log("Progress object:", progress);
          console.log(`Progress complete flag: ${progress.complete}, Actual test count: ${actualTestCount}`);
          
          // CRITICAL: Use the direct count from testResults.length, not the state variable
          // This fixes the timing issue where state hasn't updated yet
          if (actualTestCount >= 6) {
            console.log(`User has completed ${actualTestCount} tests, showing Thank You page`);
            
            // Mark the user as complete if not already done
            if (!userData.endTime) {
              await updateUser(user.uid, { endTime: new Date() });
            }
            
            // Show the thank you page
            setLoading(false);
          } else {
            console.log(`User has only completed ${actualTestCount} tests, needs ${6-actualTestCount} more`);
            
            // Not enough tests completed - redirect to next test
            if (progress.currentTest) {
              const nextTestUrl = `/test/${progress.currentTest.method}/${progress.currentTest.passageId}`;
              console.log(`Redirecting to next test: ${nextTestUrl}`);
              router.push(nextTestUrl);
            } else {
              setError('Failed to determine which test you should take next. Please contact support.');
              setLoading(false);
            }
          }
        } catch (err) {
          console.error('Error checking completion status:', err);
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
          setError(`Error retrieving your data: ${errorMessage}`);
          setLoading(false);
        }
      } else {
        // Not logged in
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Function to return to tests - with improved routing
  const handleReturnToTests = () => {
    if (nextTest) {
      // If we have the next test information, go directly to that test
      console.log(`Redirecting to next test: /test/${nextTest.method}/${nextTest.passageId}`);
      router.push(`/test/${nextTest.method}/${nextTest.passageId}`);
    } else {
      // Otherwise, go to the router, which will determine the next test
      console.log('Redirecting to test router');
      router.push('/test');
    }
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

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="whitespace-pre-line">{error}</p>
          <div className="flex flex-wrap gap-3 mt-4">
            <button 
              onClick={handleReturnToTests} 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {nextTest ? `Continue to Test ${nextTest.passageId}` : 'Return to Tests'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Thank you message (shown when user has completed 6+ tests)
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <h1 className="text-3xl font-bold mb-6">Thank You!</h1>
        
        <div className="mb-8">
          <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <p className="text-lg text-gray-700 mb-4">
            Your participation in this study is complete.
          </p>
          
          <p className="text-gray-600 mb-4">
            You have completed {testResultsNum} tests.
          </p>
          
          <p className="text-gray-600">
            Your feedback will help us improve educational materials and better understand 
            how different fill-in-the-blank methods affect learning.
          </p>
        </div>
        
        <div className="border-t border-gray-200 pt-6">
          <p className="text-gray-500 mb-4">
            You may now close this window or sign out below.
          </p>
          
          <button
            onClick={() => auth.signOut()}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

