'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { getUser, getTestResults, saveFinalSurvey } from '../../lib/firebase';
import FinalSurvey from '../../components/FinalSurvey';

export default function CompletePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showSurvey, setShowSurvey] = useState(false);
  const [completedMethods, setCompletedMethods] = useState<MethodId[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get user data to check if they've completed all tests
          const userData = await getUser(user.uid);
          
          if (!userData) {
            router.push('/');
            return;
          }
          
          // Get test results to determine which methods they've completed
          const testResults = await getTestResults(user.uid);
          
          // Extract the methods they've completed
          const methods = testResults.map(result => result.methodId as MethodId);
          setCompletedMethods(methods);
          
          if (methods.length < 4) {
            // They haven't completed all tests, redirect back
            router.push('/');
          } else {
            setShowSurvey(true);
          }
        } catch (err) {
          console.error('Error checking completion status:', err);
          setError('Failed to retrieve your test results. Please try again.');
        } finally {
          setLoading(false);
        }
      } else {
        // Not logged in
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

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
      // Save the final survey
      await saveFinalSurvey({
        userId: user.uid,
        ...results
      });

      // Show thank you message
      setShowSurvey(false);
    } catch (err) {
      console.error('Error saving final survey:', err);
      setError('Failed to save your survey responses. Please try again.');
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
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded"
          >
            Try Again
          </button>
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