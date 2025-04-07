import React, { useState, useEffect, useRef } from 'react';
import { GapItem } from '../utils/types';
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { Errorbox } from "./ui/callout";
import { SendHorizontalIcon, ArrowLeftIcon } from "lucide-react";
import { toast } from "sonner";
import { WordItem } from './word-item';
import AnnotationComponent from './Annotation';
import { isValidMethod } from '../utils/methodMapping';

interface ClozeTestProps {
  passage: string;
  method: string;
  passageId: number;
  onComplete: (results: {
    score: number;
    timeSpent: number;
    answers: Record<string, string>;
    annotations: Record<string, string>;
  }) => void;
}

export default function ClozeTest({ 
  passage, 
  method, 
  passageId,
  onComplete 
}: ClozeTestProps) {
  const [gaps, setGaps] = useState<GapItem[]>([]);
  const [clozeText, setClozeText] = useState<string>('');
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [annotations, setAnnotations] = useState<Record<string, string>>({});
  const [annotationsComplete, setAnnotationsComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [uiState, setUiState] = useState<
    "initial" | "showingAnswers" | "showingAnnotations" | "showingContinue"
  >("initial");
  const [results, setResults] = useState<{
    answers: Array<{ word: string; isCorrect: boolean }>;
    score: number;
  } | null>(null);
  const [showAnnotations, setShowAnnotations] = useState(false);
  
  const startTimeRef = useRef<Date>(new Date());
  const formRef = useRef<HTMLFormElement>(null);

  // Load the cloze test data
  useEffect(() => {
    const loadGaps = async () => {
      try {
        // Use the method name directly - no mapping needed anymore
        // Just validate it's a valid method
        const apiMethod = isValidMethod(method) ? method : 'contextuality';
        
        const response = await fetch(`/api/gap-methods/${apiMethod}?passageId=${passageId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to load test: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        setGaps(data.gaps);
        setClozeText(data.clozeText);
        
        // Initialize user answers
        const initialAnswers: Record<string, string> = {};
        data.gaps.forEach((gap: GapItem, index: number) => {
          initialAnswers[index] = '';
        });
        
        setUserAnswers(initialAnswers);
        
      } catch (error) {
        console.error('Error loading cloze test:', error);
        setError(error instanceof Error ? error : new Error('Failed to load test'));
      } finally {
        setLoading(false);
      }
    };
    
    loadGaps();
  }, [method, passageId]);

  // Visual feedback effect 
  useEffect(() => {
    if (results && uiState === "initial") {
      applyVisualFeedback();
      setUiState("showingAnswers");
      // Show annotations after showing answers
      setShowAnnotations(true);
    }
  }, [results, uiState]);

  useEffect(() => {
    if (uiState === "showingAnswers") {
      const timer = setTimeout(() => {
        setUiState("showingContinue");
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [uiState]);

  // Apply visual feedback to input elements
  const applyVisualFeedback = () => {
    if (!formRef.current || !results) return;

    const fields = Array.from(
      formRef.current.querySelectorAll("fieldset[data-target-word]")
    ) as HTMLFieldSetElement[];

    fields.forEach((field, index) => {
      const word = field.dataset.targetWord as string;
      const inputs = Array.from(
        field.querySelectorAll("input[type=text]")
      ) as HTMLInputElement[];

      const answer = results.answers.find((a) => a.word === word);

      if (!answer) return;

      const targetInputs = inputs.filter(
        (input) => input.dataset.isTarget === "true"
      );

      targetInputs.forEach((input) => {
        const letterIndex = input.dataset.letterIndex
          ? parseInt(input.dataset.letterIndex)
          : 0;
        const correctLetter = word[letterIndex];

        input.readOnly = true;

        if (answer.isCorrect) {
          input.style.backgroundColor = "#d1fae5";
          input.style.borderColor = "#10b981";
          input.style.color = "#047857";
        } else {
          input.style.backgroundColor = "#fee2e2";
          input.style.borderColor = "#ef4444";
          input.style.color = "#b91c1c";

          if (input.value !== correctLetter) {
            input.value = correctLetter;
          }
        }
      });
    });
  };

  // Process form data
  const processForm = () => {
    if (!formRef.current) return { correctWords: 0, totalWords: 0, answers: [], score: 0 };

    const fields = Array.from(
      formRef.current.querySelectorAll("fieldset[data-target-word]")
    ) as HTMLFieldSetElement[];

    let correctWords = 0;
    const answers: Array<{ word: string; isCorrect: boolean }> = [];

    fields.forEach((field) => {
      const word = field.dataset.targetWord as string;
      const inputs = Array.from(
        field.querySelectorAll("input[type=text]")
      ) as HTMLInputElement[];

      const targetInputs = inputs.filter(input => input.dataset.isTarget === "true");
      const userInput = targetInputs.map(input => input.value.toLowerCase()).join('');
      const isCorrect = userInput === word.toLowerCase();

      if (isCorrect) {
        correctWords++;
      }
      
      answers.push({ word, isCorrect });
    });

    const score = (correctWords / fields.length) * 100;
    
    return {
      correctWords,
      totalWords: fields.length,
      answers,
      score,
    };
  };

  // Handle "Show Answers" button click
  const handleShowAnswers = () => {
    const { answers, score } = processForm();
    setResults({ answers, score });

    toast.info(
      "Test finished. First review the correct answers, then complete annotations before continuing."
    );
  };

  const handleAnnotationChange = (newAnnotations: Record<string, string>) => {
    setAnnotations(newAnnotations);
  };

  // Handle final submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!results) {
      toast.error("Please submit your answers first.");
      return;
    }
    
    if (!annotationsComplete) {
      toast.error("Please complete all annotations before continuing.");
      return;
    }
    
    const timeSpent = (new Date().getTime() - startTimeRef.current.getTime()) / 1000;
    
    // Convert answers to the format expected by onComplete
    const answerMap: Record<string, string> = {};
    results.answers.forEach((item, index) => {
      answerMap[index.toString()] = item.word;
    });
    
    console.log("Submitting test results:", {
      score: results.score,
      timeSpent,
      answers: answerMap,
      annotations
    });
    
    onComplete({
      score: results.score,
      timeSpent,
      answers: answerMap,
      annotations
    });
  };

  if (loading) {
    return <div className="flex justify-center py-8">Preparing test...</div>;
  }

  if (error) {
    return <Errorbox title={error.message} />;
  }

  // Render the WordItem component for each word in the text
  const renderPassageWithGaps = () => {
    // This is where you'll integrate your gap generation logic with the WordItem UI
    return clozeText.split(/(_{3,})/).map((part, index) => {
      if (part.match(/_{3,}/)) {
        // This is a gap
        const gapIndex = Math.floor(index / 2);
        const gap = gaps[gapIndex];
        
        // Render the WordItem component for this gap
        return (         
          <WordItem
            key={`gap-${gapIndex}`}
            word={gap.word}
            showLetter={0} 
            isTarget={true}
            gapIndex={gapIndex}
          />     
        );
      }
      
      // Regular text
      return <span key={`text-${index}`}>{part}</span>;
    });
  };

  return (
    <div className="space-y-8">
      <Alert variant="info">
        <AlertDescription>
          Fill in each blank with the appropriate word that fits the context. 
          Use the context of the passage to help you determine the missing words.
        </AlertDescription>
      </Alert>
      
      {error && <Errorbox title={error} />}

      <form
        id="cloze-form"
        className="flex flex-col gap-4 rounded-lg"
        ref={formRef}
        onSubmit={handleSubmit}
      >
        <div className="space-y-3 leading-relaxed xl:text-lg">
          {renderPassageWithGaps()}
        </div>

        {/* Only show annotations after answers are submitted */}
        {showAnnotations && (
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold mb-3">
              Now that you've seen the correct answers, please explain why each answer fits in the context:
            </h3>
            <AnnotationComponent 
              gaps={gaps} 
              value={annotations}
              onChange={handleAnnotationChange}
              isComplete={annotationsComplete}
              setIsComplete={setAnnotationsComplete}
            />
          </div>
        )}
        
        <div className="flex gap-4">
          {uiState === "initial" ? (
            <Button type="button" onClick={handleShowAnswers} className="w-48">
              <span className="inline-flex items-center gap-2">
                <SendHorizontalIcon className="size-3" />
                Submit Answers
              </span>
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={uiState === "showingAnswers" || !annotationsComplete}
              className="w-48"
            >
              <span className="inline-flex items-center gap-2">
                <ArrowLeftIcon className="size-3" />
                Continue
              </span>
            </Button>
          )}
        </div>
        
        {results && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
            <p className="text-blue-700">
              You scored {results.score.toFixed(1)}%. {results.score >= 70 ? 'Great job!' : 'Keep practicing!'}
            </p>
           {!annotationsComplete && (
              <p className="text-blue-700 mt-2">
                Now please complete the annotations explaining why each answer fits in the context.
              </p>
            )}
          </div>
        )}
      </form>
    </div>
  );
}