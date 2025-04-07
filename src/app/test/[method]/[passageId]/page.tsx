'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../../lib/firebase';
import { saveTestResult } from '../../../../lib/firebase';
import { advanceUserProgress } from '../../../../lib/userProgress';
import ReadingPassage from '../../../../components/ReadingPassage';
import ClozeTest from '../../../../components/ClozeTest';
import { GapItem } from '../../../../utils/types';
import { getUIMethodCode } from '@/src/utils/methodMapping';
enum TestStage {
  LOADING,
  IN_PROGRESS,
  COMPLETE
}

// This function runs on the client side
export default function TestPage({
  params
}: {
  params: { method: string; passageId: string }
}) {
  const router = useRouter();
  
  // Extract method and passageId from the route params object directly
  const  method = use(params).method;
  const passageId = parseInt(use(params).passageId, 10);
  
  // Log params for debugging (only in development)
  console.log('TestPage params:', { 
    method, 
    passageId,
    isApiMethod: ['contextuality', 'contextuality_plus', 'keyword'].includes(method)
  });
  const uiMethod = getUIMethodCode(method);
  const [userId, setUserId] = useState<string | null>(null);
  const [stage, setStage] = useState<TestStage>(TestStage.LOADING);

  const [testId, setTestId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Auth & initialization
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        setStage(TestStage.IN_PROGRESS);
      } else {
        // Not logged in, redirect to login
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, []);



  // Handle test completion
  const handleTestComplete = async () => {
    if (!userId) return;

    try {
      const progress = await advanceUserProgress(userId);
      setStage(TestStage.COMPLETE);
      
      if (progress.complete) {
        // All tests done, go to final survey
        router.push('/complete');
      } else if (progress.nextTest) {
        // Go to the next test
        router.push(`/test/${progress.nextTest.apiMethod}/${progress.nextTest.passageId}`);
      }
    } catch (err) {
      console.error('Error updating user progress:', err);
      setError('Failed to save your progress. Please try again.');
    }
  };

  // Render different stages
  const renderStage = () => {
    switch (stage) {
      case TestStage.LOADING:
        return <div className="flex justify-center py-8">Loading...</div>;
        
      case TestStage.IN_PROGRESS:
        return (
          <ReadingPassage 
            passageId={passageId}
            method={method} 
            onComplete={handleTestComplete} 
          />
        );
      
        
      case TestStage.COMPLETE:
        return <div className="flex justify-center py-8">Proceeding to next test...</div>;
        
      default:
        return null;
    }
  };

  // Show error if any
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

  return (
    <div>
      {/* Debug info - visible only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-100 p-2 text-xs">
          <p>Method: {uiMethod || 'Not set'}</p>
          <p>Passage ID: {passageId || 'Not set'}</p>
        </div>
      )}
      
      <header className="bg-gray-100 p-4 mb-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-bold">Test {passageId}</h1>
          <p className="text-gray-600">
            Read the passage carefully and then complete the cloze test.
          </p>
        </div>
      </header>

      {renderStage()}
    </div>
  );
}