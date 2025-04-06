'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../../lib/firebase';
import { saveTestResult } from '../../../../lib/firebase';
import { advanceUserProgress } from '../../../../lib/userProgress';
import ReadingPassage from '../../../../components/ReadingPassage';
import ClozeTest from '../../../../components/ClozeTest';
import PostTestSurvey from '../../../../components/PostTestSurvey';
import { GapItem } from '../../../../utils/types';

enum TestStage {
  LOADING,
  READING,
  TESTING,
  COMPLETE
}

export default function TestPage() {
  const router = useRouter();
  const params = useParams();
  const method = params?.method as string;
  const passageId = parseInt(params?.passageId as string);
  
  const [userId, setUserId] = useState<string | null>(null);
  const [stage, setStage] = useState<TestStage>(TestStage.LOADING);
  const [passage, setPassage] = useState<string>('');
  const [testId, setTestId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Auth & initialization
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        loadPassage();
      } else {
        // Not logged in, redirect to login
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, []);

  // Load the passage content
  const loadPassage = async () => {
    try {
      const response = await fetch(`/passages/passage${passageId}.md`);
      const text = await response.text();
      setPassage(text);
      setStage(TestStage.READING);
    } catch (err) {
      console.error('Error loading passage:', err);
      setError('Failed to load reading passage. Please try again.');
    }
  };

  // Handle reading completion
  const handleReadingComplete = () => {
    setStage(TestStage.TESTING);
  };

  // Handle test completion
  const handleTestComplete = async (results: {
    score: number;
    timeSpent: number;
    answers: Record<string, string>;
    annotations: Record<string, string>;
  }) => {
    if (!userId) return;

    try {
      // Save test results
      const newTestId = await saveTestResult({
        userId,
        method,
        passageId,
        score: results.score,
        timeSpent: results.timeSpent,
        answers: results.answers,
        annotations: results.annotations
      });

      setTestId(newTestId);
      const progress = await advanceUserProgress(userId);
      setStage(TestStage.COMPLETE);
      if (progress.complete) {
        // All tests done, go to final survey
        router.push('/complete');
      } else if (progress.nextTest) {
        // Go to the next test
        router.push(`/test/${progress.nextTest.method}/${progress.nextTest.passageId}`);
      }
    } catch (err) {
      console.error('Error saving test results:', err);
      setError('Failed to save your test results. Please try again.');
    }
  };

  // Handle survey completion


  // Render different stages
  const renderStage = () => {
    switch (stage) {
      case TestStage.LOADING:
        return <div className="flex justify-center py-8">Loading...</div>;
        
      case TestStage.READING:
        return (
          <ReadingPassage 
            passageId={passageId} 
            onComplete={handleReadingComplete} 
          />
        );
        
      case TestStage.TESTING:
        return (
          <ClozeTest 
            passage={passage} 
            method={method} 
            passageId={passageId} 
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
      <header className="bg-gray-100 p-4 mb-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-bold">Test {passageId}</h1>
          {stage === TestStage.READING && (
            <p className="text-gray-600">Please read the passage carefully.</p>
          )}
          {stage === TestStage.TESTING && (
            <p className="text-gray-600">Fill in the blanks and annotate each gap.</p>
          )}
        </div>
      </header>

      {renderStage()}
    </div>
  );
}