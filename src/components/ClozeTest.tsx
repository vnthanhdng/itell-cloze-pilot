import React, { useState, useEffect, useRef } from 'react';
import { GapItem, MethodId } from '../utils/types';
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { Errorbox } from ".//ui/callout";
import { SendHorizontalIcon, ArrowLeftIcon } from "lucide-react";
import { toast } from "sonner";

interface ClozeTestProps {
  passage: string;
  methodId: string | MethodId;
  passageId: number;
  user: any; // Replace with your user type
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
  user,
  onComplete 
}: ClozeTestProps) {
  const [gaps, setGaps] = useState<GapItem[]>([]);
  const [clozeText, setClozeText] = useState<string>('');
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [uiState, setUiState] = useState<
    "initial" | "showingAnswers" | "showingContinue"
  >("initial");
  const [results, setResults] = useState<{
    answers: Array<{ word: string; isCorrect: boolean }>;
    score: number;
  } | null>(null);
  
  const startTimeRef = useRef<Date>(new Date());
  const formRef = useRef<HTMLFormElement>(null);

  // Load the cloze test data (keeping your original gap loading logic)
  useEffect(() => {
    const loadGaps = async () => {
      try {
        const response = await fetch(`/api/gap-methods/${methodId}?passageId=${passageId}`);
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        setGaps(data.gaps);
        setClozeText(data.clozeText);
        
        // Initialize user answers
        const initialAnswers: Record<string, string> = {};
        data.gaps.forEach((gap, index) => {
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
  }, [methodId, passageId]);

  // Visual feedback effect (like in the CTest component)
  useEffect(() => {
    if (results && uiState === "initial") {
      applyVisualFeedback();
      setUiState("showingAnswers");
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
      const userInput = targetInputs.map(input => input.value).join('');
      const isCorrect = userInput === word.slice(inputs.length - targetInputs.length);

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
      "Test finished, please take some time reviewing the correct answers before continuing"
    );
  };

  // Handle final submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (uiState === "showingContinue") {
      const timeSpent = (new Date().getTime() - startTimeRef.current.getTime()) / 1000;
      
      // Convert answers to the format expected by onComplete
      const answerMap: Record<string, string> = {};
      results?.answers.forEach((item, index) => {
        answerMap[index.toString()] = item.word;
      });
      
      onComplete({
        score: results?.score || 0,
        timeSpent,
        answers: answerMap
      });
    }
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
            showLetter={0} // For cloze test, show 0 letters (completely hidden)
            isTarget={true}
            gapIndex={gapIndex}
          />
        );
      }
      
      // Regular text
      return <span key={`text-${index}`}>{part}</span>;
    });
  };

  // WordItem component adapted for cloze test
  function WordItem({ word, showLetter, isTarget, gapIndex }: { 
    word: string, 
    showLetter: number, 
    isTarget: boolean,
    gapIndex: number
  }) {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [isRevealed, setIsRevealed] = useState(false);

    if (!isTarget) {
      return <span className="py-0.5">{word}</span>;
    }

    const letters = word.split("");
    const revealedLetters = letters.slice(0, showLetter);
    const hiddenLetters = letters.slice(showLetter);

    const focusInput = (index: number) => {
      if (inputRefs.current[index]) {
        inputRefs.current[index]?.focus();
      }
    };

    const handleNext = async (currentIndex: number) => {
      const nextIndex = currentIndex + 1;
      if (nextIndex < hiddenLetters.length) {
        focusInput(nextIndex);
      }

      if (nextIndex === hiddenLetters.length) {
        // Find the next word's input
        let parent = inputRefs.current[currentIndex]?.parentElement?.parentElement;
        if (parent) {
          while (parent?.nextElementSibling) {
            const nextSibling = parent.nextElementSibling as HTMLElement;
            if (nextSibling?.classList.contains("word-item")) {
              const input = nextSibling.querySelector(
                "input[data-is-target='true']"
              ) as HTMLInputElement;
              if (input) {
                input.focus();
                break;
              }
            }
            parent = nextSibling;
          }
        }
      }
    };

    const handlePrev = async (currentIndex: number, clearPrev: boolean = false) => {
      const prevIndex = currentIndex - 1;
      if (prevIndex >= 0) {
        if (clearPrev && inputRefs.current[prevIndex]) {
          inputRefs.current[prevIndex].value = "";
        }
        focusInput(prevIndex);
      } else if (currentIndex === 0) {
        // Find the previous word's last input
        let parent = inputRefs.current[currentIndex]?.parentElement?.parentElement;
        if (parent) {
          while (parent?.previousElementSibling) {
            const prevSibling = parent.previousElementSibling as HTMLElement;
            if (prevSibling?.classList.contains("word-item")) {
              const input = prevSibling.querySelector(
                "input[data-is-target='true']:last-of-type"
              ) as HTMLInputElement;
              if (input) {
                if (clearPrev) {
                  input.value = "";
                }
                input.focus();
                break;
              }
            }
            parent = prevSibling;
          }
        }
      }
    };

    const setInputRef = (index: number) => (el: HTMLInputElement | null) => {
      inputRefs.current[index] = el;
    };

    // Handle input change to update user answers
    const handleInputChange = (letterIndex: number, value: string) => {
      // Update the user's answer for this gap
      const currentAnswer = userAnswers[gapIndex] || '';
      const answerArray = currentAnswer.split('');
      answerArray[letterIndex] = value;
      
      setUserAnswers(prev => ({
        ...prev,
        [gapIndex]: answerArray.join('')
      }));
    };

    if (isRevealed) {
      return (
        <span className="word-item inline-block whitespace-nowrap py-0.5">
          <span className="text-green-600 font-medium px-1">{word}</span>
        </span>
      );
    }

    return (
      <span className="word-item inline-block whitespace-nowrap py-0.5">
        <fieldset
          data-target-word={word}
          className="inline-flex items-center px-1 transition-opacity duration-300"
        >
          {revealedLetters.map((letter, index) => (
            <Letter
              key={index}
              letter={letter}
              className="rounded-none px-1 py-1 first-of-type:rounded-l-md focus-visible:ring-1"
            />
          ))}

          {hiddenLetters.map((letter, index) => (
            <LetterInput
              className="rounded-none px-1 py-1 last-of-type:rounded-r-lg focus-visible:ring-1"
              letter={letter}
              key={index}
              ref={setInputRef(index)}
              onNext={() => handleNext(index)}
              onPrev={(clearPrev) => handlePrev(index, clearPrev)}
              letterIndex={showLetter + index}
              onChange={(value) => handleInputChange(index, value)}
              disabled={uiState !== "initial"}
              value={userAnswers[gapIndex]?.[index] || ''}
            />
          ))}
        </fieldset>
      </span>
    );
  }

  // Letter component (non-editable)
  function Letter({ letter, className }: { letter: string, className?: string }) {
    return (
      <input
        className={`size-7 bg-muted text-center text-base text-muted-foreground xl:text-lg ${className || ''}`}
        type="text"
        defaultValue={letter}
        data-is-target={false}
        readOnly
      />
    );
  }

  // LetterInput component (editable)
  function LetterInput({
    letter,
    onNext,
    onPrev,
    ref,
    className,
    letterIndex,
    onChange,
    disabled,
    value
  }: {
    letter: string,
    onNext?: () => void,
    onPrev?: (clearPrev?: boolean) => void,
    ref: (_: HTMLInputElement) => void,
    className?: string,
    letterIndex: number,
    onChange: (value: string) => void,
    disabled?: boolean,
    value: string
  }) {
    const [isCorrect, setIsCorrect] = useState<boolean | undefined>(undefined);
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onPrev?.();
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        onNext?.();
        return;
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        const value = e.currentTarget.value;
        if (value === "") {
          onPrev?.(true);
        } else {
          e.currentTarget.value = "";
          setIsCorrect(undefined);
          onChange("");
        }
        return;
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      if (newValue === "") {
        setIsCorrect(undefined);
        onChange("");
        return;
      }
      setIsCorrect(newValue.toLowerCase() === letter.toLowerCase());
      onChange(newValue);
      onNext?.();
    };

    return (
      <input
        required
        data-is-target={true}
        data-letter-index={letterIndex}
        ref={ref}
        type="text"
        maxLength={1}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`size-7 border bg-background text-center text-base focus-visible:border-2 focus-visible:border-info xl:text-lg ${className || ''}`}
      />
    );
  }

  // No admin functionality

  return (
    <div className="space-y-8">
      <Alert variant="info">
        <AlertDescription>
          Fill in each blank with the appropriate word that fits the context. 
          Use the context of the passage to help you determine the missing words.
        </AlertDescription>
      </Alert>
      
      {/* No admin functionality */}
      {error && <Errorbox title={error.message} />}

      <form
        id="cloze-form"
        className="flex flex-col gap-4 rounded-lg"
        ref={formRef}
        onSubmit={handleSubmit}
      >
        <div className="space-y-3 leading-relaxed xl:text-lg">
          {/* Render your passage with gaps using the WordItem component */}
          {renderPassageWithGaps()}
        </div>
        
        <div className="flex gap-4">
          {uiState === "initial" ? (
            <Button type="button" onClick={handleShowAnswers} className="w-48">
              <span className="inline-flex items-center gap-2">
                <SendHorizontalIcon className="size-3" />
                Show Answers
              </span>
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={uiState === "showingAnswers"}
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
          </div>
        )}
      </form>
    </div>
  );
}