
import React, { useState, useEffect } from 'react';
import ClozeTest from './ClozeTest';
import { saveTestResult, auth, getTestResults } from '../lib/firebase';
import ReactMarkdown from 'react-markdown';

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
  const [totalAnnotations, setTotalAnnotations] = useState<number>(0);


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
    
    // Also check the user's current annotation count
    const checkAnnotationCount = async () => {
      if (auth.currentUser) {
        try {
          const testResults = await getTestResults(auth.currentUser.uid);
          const count = testResults.reduce((sum, result) => {
            return sum + (result.annotations ? Object.keys(result.annotations).length : 0);
          }, 0);
          setTotalAnnotations(count);
          console.log(`Current annotation count: ${count}`);
        } catch (error) {
          console.error('Error checking annotation count:', error);
        }
      }
    };
    
    checkAnnotationCount();
    
  }, [method, passageId]);

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
    correctAnswers: Record<string, string>;
    annotations: Record<string, string>;
    holisticScore: number;
  }) => {
    // Check if user is authenticated
    if (!auth.currentUser) {
      console.error("No authenticated user found");
      // Handle not authenticated - perhaps redirect to login
      return;
    }
  
    const userId = auth.currentUser.uid;
    console.log("Test complete with results:", results);
    
    // Calculate how many annotations were just added
    const newAnnotationCount = Object.keys(results.annotations).length;
    const updatedTotalAnnotations = totalAnnotations + newAnnotationCount;
    
    saveTestResult({
      userId,
      method,
      passageId,
      score: results.score,
      timeSpent: results.timeSpent,
      answers: results.answers,
      correctAnswers: results.correctAnswers,
      annotations: results.annotations,
      holisticScore: results.holisticScore
    }).then(() => {
      console.log("Test result saved successfully");
      console.log(`Total annotations after this test: ${updatedTotalAnnotations}`);
      
      // Update the local state
      setTotalAnnotations(updatedTotalAnnotations);
      
      // Continue to next test
      onComplete();
    }).catch(error => {
      console.error("Error saving test result:", error);
      // Show error message to user
      alert("Failed to save your test results. Please try again or contact support.");
    });
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
      
      {/* Display the annotation progress */}
      <div className="bg-blue-50 p-3 mb-4 rounded-md">
        <p>Annotations progress: <strong>{totalAnnotations}/6</strong></p>
        {totalAnnotations >=6 && (
          <p className="text-green-600 mt-1">You've reached the target number of annotations! After completing this test, you'll be marked as finished.</p>
        )}
      </div>

      <div className="prose prose-lg max-w-none">
        <div>
      <ReactMarkdown 
          components={{
            h1: ({node, ...props}) => <h1 className="text-3xl font-bold mb-4 mt-6" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-2xl font-bold mb-3 mt-5" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-xl font-bold mb-2 mt-4" {...props} />,
            p: ({node, ...props}) => <p className="mb-4 leading-relaxed" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4" {...props} />,
            li: ({node, ...props}) => <li className="mb-1" {...props} />,
            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic" {...props} />,
          
          }}
        >
          {passage}
        </ReactMarkdown>
      </div>
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