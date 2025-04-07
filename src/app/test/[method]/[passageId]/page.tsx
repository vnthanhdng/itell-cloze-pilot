'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../../lib/firebase';
import ReadingPassage from '../../../../components/ReadingPassage';

enum TestStage {
  LOADING,
  IN_PROGRESS,
  COMPLETE
}

// This function runs on the client side
export default function TestPage({
  params
}: {
  params:  any
}) {
  const router = useRouter();
  
  const [method, setMethod] = useState<string>('');
  const [passageId, setPassageId] = useState<number>(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [stage, setStage] = useState<TestStage>(TestStage.LOADING);
  const [error, setError] = useState<string | null>(null);

  // Parse parameters
  useEffect(() => {
    const parseParams = async () => {
      try {
        let methodValue: string;
        let passageIdValue: string;

        if (params instanceof Promise) {
          // If it's a Promise
          const resolvedParams = await params;
          methodValue = resolvedParams.method;
          passageIdValue = resolvedParams.passageId;
        } else if (typeof params === 'object' && params !== null) {
          // If it's a regular object
          methodValue = params.method;
          passageIdValue = params.passageId;
        } else {
          throw new Error('Invalid params format');
        }

        if (!methodValue || !passageIdValue) {
          throw new Error('Missing required parameters');
        }
          
        setMethod(params.method);
        setPassageId(parseInt(params.passageId, 10));
      } catch (err) {
        console.error('Error parsing parameters:', err);
        setError('Invalid test parameters. Please try again.');
      }
    };
    
    parseParams();
  }, [params]);

  // Auth & initialization
  useEffect(() => {
    if (!method || !passageId) return;
    
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
  }, [method, passageId, router]);

  // Handle test completion
  const handleTestComplete = async () => {
    if (!userId) return;

    try {
      // Import and call advanceUserProgress here to avoid circular dependencies
      const { advanceUserProgress } = await import('../../../../lib/userProgress');
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
          <p>Method: {method || 'Not set'}</p>
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