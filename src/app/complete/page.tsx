'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { getUser, getTestResults, saveFinalSurvey, updateUser } from '../../lib/firebase';
import FinalSurvey from '../../components/FinalSurvey';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';

type MethodId = string;

// Default methods to use if no test results are found
const DEFAULT_METHODS = ['contextuality', 'contextuality_plus', 'keyword'];

export default function CompletePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showSurvey, setShowSurvey] = useState(false);
  const [completedMethods, setCompletedMethods] = useState<MethodId[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [generateFakeMethods, setGenerateFakeMethods] = useState(false);

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
          
          // Get test results
          const testResults = await getTestResults(user.uid);
          console.log('CompletePage - testResults:', testResults);
          
          // SPECIAL CASE: If user has progress of 3 or more but no test results,
          // we can handle this in two ways:
          // 1. Show an error with a button to generate fake methods
          // 2. Automatically use default methods
          if (userData.progress >= 3 && (!testResults || testResults.length === 0)) {
            console.log('CompletePage - Progress indicates completion but no test results found');
            
            if (generateFakeMethods) {
              // Use default methods if user clicked the button to generate them
              setCompletedMethods(DEFAULT_METHODS);
              setShowSurvey(true);
            } else {
              // Show error with option to generate methods
              setError(`Your progress indicates you've completed all tests, but no test results were found. 
                      This might be due to a data storage issue. You can either return to complete the tests 
                      again or continue to the survey with default options.`);
            }
            
            setLoading(false);
            setHasCheckedStatus(true);
            return;
          }
          
          // Normal case - extract methods from test results
          if (testResults && testResults.length > 0) {
            const methods = testResults.map(result => {
              return result.method || null;
            }).filter(Boolean); // Remove null values
            
            // Remove duplicates
            const uniqueMethods = [...new Set(methods.filter((method): method is string => method !== null))];
            setCompletedMethods(uniqueMethods);
            
            // Check if they've completed requirements
            if (userData.progress < 3 || uniqueMethods.length < 3) {
              setError(`You need to complete more tests before accessing the final survey. 
                      Progress: ${userData.progress}/3, Methods completed: ${uniqueMethods.length}/3`);
            } else {
              setShowSurvey(true);
            }
          } else {
            // No test results found, normal flow
            setError(`You need to complete the tests before accessing the final survey.
                    Progress: ${userData.progress}/3, Methods completed: 0/3`);
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
  }, [hasCheckedStatus, generateFakeMethods, router]);

  const handleSurveyComplete = async (results: {
    methodRanking: MethodId[];
    mostEngaging: MethodId;
    mostHelpful: MethodId;
    feedback?: string;
  }) => {
    const user = auth.currentUser;
    if (!user) {
      router.push('/');
      return;
    }

    try {
      console.log('CompletePage - Saving survey results:', results);
      
      // Save the final survey
      await saveFinalSurvey({
        userId: user.uid,
        ...results
      });

      // Show thank you message
      setShowSurvey(false);
    } catch (err) {
      console.error('Error saving final survey:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Failed to save your survey responses: ${errorMessage}`);
    }
  };

  // Function to "repair" the test data by generating fake records
  const handleRepairData = async () => {
    setGenerateFakeMethods(true);
  };

  // Function to return to tests
  const handleReturnToTests = () => {
    router.push('/');
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
              Return to Tests
            </button>
            
            {userData && userData.progress >= 3 && (
              <button 
                onClick={handleRepairData} 
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Continue to Survey Anyway
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (showSurvey) {
    return <FinalSurvey completedMethods={completedMethods} onComplete={handleSurveyComplete} />;
  }

  // Thank you message after survey completion
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