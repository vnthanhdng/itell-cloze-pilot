'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { getUser, getTestResults, updateUser } from '../../lib/firebase';
import { getCurrentTest } from '../../lib/userProgress';

export default function CompletePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [showThanks, setShowThanks] = useState(false);
  const [annotationCount, setAnnotationCount] = useState(0);
  const [testResultsNum, setTestResultsNum] = useState(0);
  const [nextTest, setNextTest] = useState<{method: string, passageId: number} | null>(null);

  useEffect(() => {
    if (hasCheckedStatus) return;
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get user data
          const userData = await getUser(user.uid);
          console.log('CompletePage - userData:', userData);
          setUserData(userData);
          
          if (!userData) {
            console.log('CompletePage - No user data found');
            setLoading(false);
            setHasCheckedStatus(true);
            return;
          }
          
          // Get test results to count
          const testResults = await getTestResults(user.uid);
          console.log('CompletePage - testResults:', testResults);
          setTestResultsNum(testResults.length);
          
          // Calculate total annotations
          const totalAnnotations = testResults.reduce((sum, result) => {
            // Check if annotations exists and is an object
            if (!result.annotations || typeof result.annotations !== 'object') {
              return sum;
            }
            
            // Filter out any non-string entries that might cause counting errors
            const validAnnotations = Object.entries(result.annotations)
              .filter(([key, value]) => 
                // Only count numeric keys with valid annotation values
                /^\d+$/.test(key) && 
                typeof value === 'string' && 
                ['sentence', 'passage', 'source', 'unpredictable'].includes(value as string)
              );
            
            console.log(`Test ${result.testId || 'unknown'}: Found ${validAnnotations.length} valid annotations`);
            
            return sum + validAnnotations.length;
          }, 0);
          
          console.log(`Total valid annotations: ${totalAnnotations}`);
          setAnnotationCount(totalAnnotations);
          
          // Check if user has completed enough tests
          const completed = testResultsNum >= 6;
          
          if (completed) {
            // User has completed at least 6 tests, show thank you page
            setShowThanks(true);
            
            // Mark the user as complete if not already done
            if (!userData.endTime) {
              await updateUser(user.uid, { endTime: new Date() });
            }
          } else {
            // User hasn't completed enough tests, show error
            setError(`You need to complete more tests before completing the study. 
                    Current progress: ${testResultsNum}/6 tests completed.`);
                    
            // Get the next test for the user
            try {
              const progress = await getCurrentTest(user.uid);
              if (progress.currentTest) {
                setNextTest({
                  method: progress.currentTest.method,
                  passageId: progress.currentTest.passageId
                });
              }
            } catch (e) {
              console.error("Error getting next test:", e);
            }
          }
        } catch (err) {
          console.error('Error checking completion status:', err);
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
          setError(`Error retrieving your data: ${errorMessage}`);
        } finally {
          setLoading(false);
          setHasCheckedStatus(true);
        }
      } else {
        // Not logged in
        console.log('CompletePage - Not logged in, redirecting');
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [hasCheckedStatus, router]);

  // Function to return to tests - with improved routing
  const handleReturnToTests = () => {
    if (nextTest) {
      // If we have the next test information, go directly to that test
      router.push(`/test/${nextTest.method}/${nextTest.passageId}`);
    } else {
      // Otherwise, go to the router, which will determine the next test
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