// src/components/ReadingPassage.tsx

import React, { useState, useEffect } from 'react';
import ClozeTest from './ClozeTest';

interface ReadingPassageProps {
  passageId: number;
  onComplete: () => void;
  timeLimit?: number; // Time limit in seconds, optional
  method: string,
}

export default function ReadingPassage({ 
  passageId, 
  onComplete,
  timeLimit,
  method
}: ReadingPassageProps) {
  const [passage, setPassage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [timeLeft, setTimeLeft] = useState<number | null>(timeLimit || null);
  const [readingComplete, setReadingComplete] = useState<boolean>(false);


  // Load the passage
  useEffect(() => {
    const loadPassage = async () => {
      try {
        // In a real implementation, this would load from an API or file
        const response = await fetch(`/passages/passage${passageId}.md`);
        const text = await response.text();
        setPassage(text);
      } catch (error) {
        console.error('Error loading passage:', error);
        setPassage('Error loading passage. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadPassage();
  }, [passageId]);

  // Timer functionality
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, onComplete]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleReadingComplete = () => {
    setReadingComplete(true);
  
  };

  
  const handleTestComplete = (results: {
    score: number;
    timeSpent: number;
    answers: Record<string, string>;
    annotations: Record<string, string>;
  }) => {
  
    onComplete();
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading passage...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      {timeLeft !== null && (
        <div className="sticky top-0 bg-white p-2 shadow-md mb-4 flex justify-between items-center">
          <span className="text-sm">Time remaining:</span>
          <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
        </div>
      )}

      <div className="prose prose-lg max-w-none">
        {/* Render the markdown content - in real app would use a proper markdown renderer */}
        {passage.split('\n\n').map((paragraph, index) => (
          <p key={index} className="mb-4">{paragraph}</p>
        ))}
      </div>

      {!readingComplete ? (
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleReadingComplete}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {timeLeft !== null ? 'Continue' : 'I\'m Done Reading'}
          </button>
        </div>
      ) : (
        <div className="mt-12 border-t pt-8">
          <h2 className="text-xl font-bold mb-6">Complete the following gaps</h2>
          <ClozeTest 
            passage={passage} 
            method={method} 
            passageId={passageId} 
            onComplete={handleTestComplete} 
          />
        </div>
      )}

      
    </div>
  );
}