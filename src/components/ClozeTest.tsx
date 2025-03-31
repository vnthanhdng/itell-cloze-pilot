import React, { useState, useEffect, useRef } from 'react';
import { GapItem } from '../utils/types';

interface ClozeTestProps {
  passage: string;
  methodId: string;
  passageId: number;
  onComplete: (results: {
    score: number;
    timeSpent: number;
    answers: Record<string, string>;
  }) => void;
}

export default function ClozeTest({ 
  passage, 
  methodId, 
  passageId, 
  onComplete 
}: ClozeTestProps) {
  const [gaps, setGaps] = useState<GapItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const startTimeRef = useRef<Date>(new Date());

  // Load the gaps based on the method
  useEffect(() => {
    const loadGaps = async () => {
      try {
        // In a real app, this would fetch from a server-side API
        const response = await fetch(`/api/gap-methods/${methodId.toLowerCase()}?passageId=${passageId}`);
        const data = await response.json();
        setGaps(data.gaps);
      } catch (error) {
        console.error('Error loading gaps:', error);
        // Fallback to a simple gap generation method
        const words = passage.split(/\s+/);
        const simpleGaps = words
          .map((word, index) => ({ 
            word, 
            wordIndex: index,
            startIndex: passage.indexOf(word),
            endIndex: passage.indexOf(word) + word.length,
            context: `...${word}...`
          }))
          .filter((_, index) => index % 7 === 3) // Every 7th word starting from the 4th
          .map(gap => ({
            ...gap,
            word: gap.word.replace(/[.,;:!?]$/, '') // Remove punctuation
          }));
        
        setGaps(simpleGaps);
      } finally {
        setLoading(false);
      }
    };

    loadGaps();
  }, [methodId, passageId, passage]);

  // Handle answer input change
  const handleAnswerChange = (gapIndex: number, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [gapIndex]: value
    }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate time spent
    const endTime = new Date();
    const timeSpent = (endTime.getTime() - startTimeRef.current.getTime()) / 1000; // in seconds
    
    // Calculate score
    let correctCount = 0;
    
    gaps.forEach((gap, index) => {
      const userAnswer = answers[index]?.trim().toLowerCase() || '';
      const correctAnswer = gap.word.toLowerCase();
      
      if (userAnswer === correctAnswer) {
        correctCount++;
      }
    });
    
    const score = gaps.length > 0 ? (correctCount / gaps.length) * 100 : 0;
    
    // Call the completion handler
    onComplete({
      score,
      timeSpent,
      answers
    });
  };

  if (loading) {
    return <div className="flex justify-center py-8">Preparing test...</div>;
  }

  // Render the passage with gaps
  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Fill in the blanks</h2>
        <p className="text-gray-600">
          Fill in each blank with the appropriate word that fits the context.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="prose prose-lg max-w-none">
          {renderPassageWithGaps(passage, gaps, answers, handleAnswerChange)}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Submit Answers
          </button>
        </div>
      </form>
    </div>
  );
}

// Helper function to render the passage with gaps
function renderPassageWithGaps(
  passage: string,
  gaps: GapItem[],
  answers: Record<string, string>,
  handleAnswerChange: (gapIndex: number, value: string) => void
) {
  if (!gaps.length) return <p>{passage}</p>;

  // Sort gaps by their position in the text (start index)
  const sortedGaps = [...gaps].sort((a, b) => a.startIndex - b.startIndex);
  
  // Split the passage into segments
  let lastIndex = 0;
  const segments: JSX.Element[] = [];

  sortedGaps.forEach((gap, gapIndex) => {
    // Add text before the gap
    if (gap.startIndex > lastIndex) {
      segments.push(
        <span key={`text-${gapIndex}`}>
          {passage.slice(lastIndex, gap.startIndex)}
        </span>
      );
    }

    // Add the gap as an input field
    segments.push(
      <input
        key={`gap-${gapIndex}`}
        type="text"
        value={answers[gapIndex] || ''}
        onChange={(e) => handleAnswerChange(gapIndex, e.target.value)}
        className="mx-1 px-2 py-1 border-b-2 border-gray-300 focus:border-blue-500 outline-none text-center"
        style={{ width: `${Math.max(gap.word.length * 10, 60)}px` }}
        placeholder="____"
        required
      />
    );

    lastIndex = gap.endIndex;
  });

  // Add any remaining text
  if (lastIndex < passage.length) {
    segments.push(
      <span key="text-end">
        {passage.slice(lastIndex)}
      </span>
    );
  }

  return <p>{segments}</p>;
}