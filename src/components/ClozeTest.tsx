import React, { useState, useEffect, useRef } from 'react';
import { GapItem, MethodId } from '../utils/types';

interface ClozeTestProps {
  passage: string;
  methodId: string | MethodId;
  passageId: number;
  onComplete: (results: {
    score: number;
    timeSpent: number;
    answers: Record<string, string>;
  }) => void;
}

// Represents a single letter in a gapped word
interface LetterState {
  letter: string;
  isVisible: boolean;
  userInput: string;
}

// Represents a word with its gapping state
interface WordState {
  originalWord: string;
  letters: LetterState[];
  isTarget: boolean;
  isCorrect?: boolean;
  alternatives?: string[]; // Possible alternative correct answers
  gapId?: number;         // Reference to the original gap
}

export default function ClozeTest({ 
  passage, 
  methodId, 
  passageId, 
  onComplete 
}: ClozeTestProps) {
  const [gaps, setGaps] = useState<GapItem[]>([]);
  const [processedWords, setProcessedWords] = useState<WordState[]>([]);
  const [loading, setLoading] = useState(true);
  const [showingAnswers, setShowingAnswers] = useState(false);
  const [feedbackStage, setFeedbackStage] = useState<'input' | 'feedback' | 'complete'>('input');
  const startTimeRef = useRef<Date>(new Date());
  const formRef = useRef<HTMLFormElement>(null);

  // Load the gaps based on the method
  useEffect(() => {
    const loadGaps = async () => {
      try {
        // Fetch from the server-side API
        const response = await fetch(`/api/gap-methods/${methodId.toLowerCase()}?passageId=${passageId}`);
        const data = await response.json();
        setGaps(data.gaps);
        
        // Process gaps to create the word state structure
        processPassageWithGaps(passage, data.gaps);
      } catch (error) {
        console.error('Error loading gaps:', error);
        // Fallback to a simple gap generation method
        const words = passage.split(/\s+/);
        
        // Create simplified gaps that match your GapItem interface
        const simpleGaps: GapItem[] = words
          .map((word, index) => {
            const startIndex = passage.indexOf(word);
            const cleanWord = word.replace(/[.,;:!?]$/, ''); // Remove punctuation
            return { 
              word: cleanWord, 
              start_idx: startIndex,
              end_idx: startIndex + cleanWord.length,
              context: `...${cleanWord}...`,
              type: 'fallback'
            };
          })
          .filter((_, index) => index % 7 === 3) // Every 7th word starting from the 4th
        
        setGaps(simpleGaps);
        processPassageWithGaps(passage, simpleGaps);
      } finally {
        setLoading(false);
      }
    };

    loadGaps();
  }, [methodId, passageId, passage]);

  // Helper to determine how many letters to show based on method and word
  const getLetterVisibility = (word: string, gap?: GapItem): boolean[] => {
    const len = word.length;
    
    // Initialize with all letters hidden
    const visibility = new Array(len).fill(false);
    
    // Apply method-specific logic
    switch (methodId) {
      case MethodId.A: // Fine-tuned on CLOTH dataset - no hints
        // No letters visible
        break;
        
      case MethodId.B: // Rational deletions - show first letter
        visibility[0] = true;
        break;
        
      case MethodId.C: // Keyness metrics - show first and last letters
        if (len > 1) {
          visibility[0] = true;
          visibility[len - 1] = true;
        }
        break;
        
      case MethodId.D: // Human gaps - show half the word (c-test style)
        const halfLen = Math.ceil(len / 2);
        for (let i = 0; i < halfLen; i++) {
          visibility[i] = true;
        }
        break;
        
      default:
        // Default behavior - first letter visible
        if (len > 0) visibility[0] = true;
    }
    
    // Override with gap-specific hints if available
    if (gap?.hints) {
      const hintPattern = gap.hints[0]; // Use first hint as pattern
      if (hintPattern && hintPattern.length === len) {
        return hintPattern.split('').map(h => h !== '_');
      }
    }
    
    return visibility;
  };

  // Process the passage with gaps to create the word state structure
  const processPassageWithGaps = (text: string, gaps: GapItem[]) => {
    // Map gaps to positions in the text
    // We need to locate each gap in the text
    const tokenInfo: {
      token: string;
      startIdx: number;
      endIdx: number;
      isGap: boolean;
      gap?: GapItem;
      wordIndex: number;
    }[] = [];
    
    // First tokenize the text and store positions
    let currentWordIndex = 0;
    const tokens = text.split(/(\s+|[.!?,;:])/);
    let position = 0;
    
    tokens.forEach((token) => {
      if (!token) return;
      
      const tokenStart = text.indexOf(token, position);
      if (tokenStart === -1) return; // Skip if not found
      
      const tokenEnd = tokenStart + token.length;
      
      // Keep track of position for next search
      position = tokenEnd;
      
      // Determine if this is a word or separatorq
      const isWord = !/^\s+$/.test(token) && !/^[.!?,;:]$/.test(token);
      
      // If it's a word, check if it matches any gaps
      let isGap = false;
      let matchingGap: GapItem | undefined;
      
      if (isWord) {
        // Find if this token overlaps with any gap
        matchingGap = gaps.find(gap => {
          // Allow for some position flexibility (±3 characters)
          return Math.abs(gap.start_idx - tokenStart) <= 3 &&
                 Math.abs(gap.end_idx - tokenEnd) <= 3;
        });
        
        isGap = !!matchingGap;
        currentWordIndex += isWord ? 1 : 0;
      }
      
      tokenInfo.push({
        token,
        startIdx: tokenStart,
        endIdx: tokenEnd,
        isGap,
        gap: matchingGap,
        wordIndex: isWord ? currentWordIndex - 1 : -1
      });
    });
    
    // Now process tokens into word states
    const processedWords: WordState[] = [];
    
    tokenInfo.forEach((info, index) => {
      const { token, isGap, gap } = info;
      
      // Skip empty tokens
      if (!token) return;
      
      // Check if it's a word or a separator
      if (/^\s+$/.test(token) || /^[.!?,;:]$/.test(token)) {
        // This is a separator, not a target
        processedWords.push({
          originalWord: token,
          letters: token.split('').map(letter => ({
            letter,
            isVisible: true,
            userInput: ''
          })),
          isTarget: false
        });
        return;
      }
      
      // This is a word
      if (isGap && gap) {
        // This word should be gapped
        const word = token.replace(/[.,;:!?]$/, ''); // Remove punctuation
        const punctuation = token.slice(word.length);
        
        // Get letter visibility based on method and/or gap hints
        const letterVisibility = getLetterVisibility(word, gap);
        
        // Create letter states
        const letters: LetterState[] = word.split('').map((letter, letterIndex) => ({
          letter,
          isVisible: letterVisibility[letterIndex] || false,
          userInput: ''
        }));
        
        // Add any punctuation as visible
        if (punctuation) {
          letters.push(...punctuation.split('').map(p => ({
            letter: p,
            isVisible: true,
            userInput: ''
          })));
        }
        
        processedWords.push({
          originalWord: word + punctuation,
          letters,
          isTarget: true,
          alternatives: gap.alternatives,
          gapId: index // Store index for reference
        });
      } else {
        // This word is not gapped, show all letters
        processedWords.push({
          originalWord: token,
          letters: token.split('').map(letter => ({
            letter,
            isVisible: true,
            userInput: ''
          })),
          isTarget: false
        });
      }
    });
    
    setProcessedWords(processedWords);
  };

  // Handle letter input change
  const handleLetterChange = (wordIndex: number, letterIndex: number, value: string) => {
    setProcessedWords(prev => {
      const newWords = [...prev];
      const word = { ...newWords[wordIndex] };
      const letters = [...word.letters];
      letters[letterIndex] = { ...letters[letterIndex], userInput: value };
      word.letters = letters;
      newWords[wordIndex] = word;
      return newWords;
    });
  };

  // Handle keyboard navigation between inputs
  const handleLetterKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    wordIndex: number, 
    letterIndex: number
  ) => {
    const word = processedWords[wordIndex];
    
    switch (e.key) {
      case 'ArrowRight':
        // Move to next letter or next word
        e.preventDefault();
        if (letterIndex < word.letters.length - 1 && !word.letters[letterIndex + 1].isVisible) {
          // Focus next letter in same word
          const nextInput = formRef.current?.querySelector(
            `input[data-word-index="${wordIndex}"][data-letter-index="${letterIndex + 1}"]`
          ) as HTMLInputElement;
          nextInput?.focus();
        } else {
          // Find next word with input
          let nextWordIndex = wordIndex + 1;
          while (nextWordIndex < processedWords.length) {
            if (processedWords[nextWordIndex].isTarget) {
              const nextInput = formRef.current?.querySelector(
                `input[data-word-index="${nextWordIndex}"][data-letter-index="0"]`
              ) as HTMLInputElement;
              nextInput?.focus();
              break;
            }
            nextWordIndex++;
          }
        }
        break;
        
      case 'ArrowLeft':
        // Move to previous letter or previous word
        e.preventDefault();
        if (letterIndex > 0 && !word.letters[letterIndex - 1].isVisible) {
          // Focus previous letter in same word
          const prevInput = formRef.current?.querySelector(
            `input[data-word-index="${wordIndex}"][data-letter-index="${letterIndex - 1}"]`
          ) as HTMLInputElement;
          prevInput?.focus();
        } else {
          // Find previous word with input
          let prevWordIndex = wordIndex - 1;
          while (prevWordIndex >= 0) {
            if (processedWords[prevWordIndex].isTarget) {
              const prevWord = processedWords[prevWordIndex];
              const lastInputIndex = prevWord.letters.findLastIndex(l => !l.isVisible);
              if (lastInputIndex !== -1) {
                const prevInput = formRef.current?.querySelector(
                  `input[data-word-index="${prevWordIndex}"][data-letter-index="${lastInputIndex}"]`
                ) as HTMLInputElement;
                prevInput?.focus();
                break;
              }
            }
            prevWordIndex--;
          }
        }
        break;
        
      case 'Backspace':
        // Handle backspace - clear current or go to previous
        if (e.currentTarget.value === '') {
          e.preventDefault();
          if (letterIndex > 0 && !word.letters[letterIndex - 1].isVisible) {
            // Go to previous letter in same word
            const prevInput = formRef.current?.querySelector(
              `input[data-word-index="${wordIndex}"][data-letter-index="${letterIndex - 1}"]`
            ) as HTMLInputElement;
            prevInput?.focus();
          } else {
            // Find previous word with input
            let prevWordIndex = wordIndex - 1;
            while (prevWordIndex >= 0) {
              if (processedWords[prevWordIndex].isTarget) {
                const prevWord = processedWords[prevWordIndex];
                const lastInputIndex = prevWord.letters.findLastIndex(l => !l.isVisible);
                if (lastInputIndex !== -1) {
                  const prevInput = formRef.current?.querySelector(
                    `input[data-word-index="${prevWordIndex}"][data-letter-index="${lastInputIndex}"]`
                  ) as HTMLInputElement;
                  prevInput?.focus();
                  break;
                }
              }
              prevWordIndex--;
            }
          }
        }
        break;
    }
  };

  // Helper to get whole word input from letters
  const getWordInput = (word: WordState): string => {
    const inputLetters = word.letters
      .map(letter => letter.isVisible ? letter.letter : letter.userInput);
    return inputLetters.join('');
  };

  // Check answers and provide feedback
  const checkAnswers = () => {
    const targetWords = processedWords.filter(word => word.isTarget);
    let correctCount = 0;
    
    // Mark each word as correct or not
    const checkedWords = processedWords.map(word => {
      if (!word.isTarget) return word;
      
      const userWord = getWordInput(word);
      
      // Check against original word and alternatives
      const isCorrect = word.alternatives ? 
        [word.originalWord, ...word.alternatives].includes(userWord) : 
        userWord === word.originalWord;
      
      if (isCorrect) correctCount++;
      
      return {
        ...word,
        isCorrect
      };
    });
    
    setProcessedWords(checkedWords);
    setShowingAnswers(true);
    setFeedbackStage('feedback');
    
    // Calculate score
    const score = targetWords.length > 0 ? (correctCount / targetWords.length) * 100 : 0;
    const timeSpent = (new Date().getTime() - startTimeRef.current.getTime()) / 1000;
    
    // Build answers object
    const answers: Record<string, string> = {};
    targetWords.forEach((word, index) => {
      answers[index] = getWordInput(word);
    });
    
    // Wait 3 seconds before offering to continue
    setTimeout(() => {
      setFeedbackStage('complete');
    }, 3000);
    
    // Return results
    return {
      score,
      timeSpent,
      answers
    };
  };

  // Handle submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const results = checkAnswers();
    
    // We don't call onComplete here - we wait for the user to click Continue
    // after reviewing their answers
  };
  
  // Handle continue after feedback
  const handleContinue = () => {
    // Build the final results object
    const targetWords = processedWords.filter(word => word.isTarget);
    let correctCount = 0;
    
    targetWords.forEach(word => {
      if (word.isCorrect) correctCount++;
    });
    
    const score = targetWords.length > 0 ? (correctCount / targetWords.length) * 100 : 0;
    const timeSpent = (new Date().getTime() - startTimeRef.current.getTime()) / 1000;
    
    // Build answers object
    const answers: Record<string, string> = {};
    targetWords.forEach((word, index) => {
      answers[index] = getWordInput(word);
    });
    
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

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Fill in the blanks</h2>
        <p className="text-gray-600 mb-4">
          Fill in each blank with the appropriate word that fits the context.
        </p>
        
        {feedbackStage === 'feedback' && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
            <p className="text-blue-700">
              Review your answers below. Correct answers are shown in green, incorrect answers in red.
            </p>
          </div>
        )}
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <div className="prose prose-lg max-w-none leading-relaxed">
          {/* Render words with gaps as needed */}
          <p>
            {processedWords.map((word, wordIndex) => (
              <span 
                key={`word-${wordIndex}`} 
                className={`${word.isTarget ? 'relative inline-block' : 'inline'} ${
                  word.isTarget && showingAnswers ? (
                    word.isCorrect ? 'bg-green-100' : 'bg-red-100'
                  ) : ''
                }`}
              >
                {word.letters.map((letter, letterIndex) => {
                  if (letter.isVisible) {
                    // Regular visible letter
                    return <span key={`letter-${wordIndex}-${letterIndex}`}>{letter.letter}</span>;
                  } else {
                    // Letter that needs an input
                    return (
                      <input
                        key={`input-${wordIndex}-${letterIndex}`}
                        type="text"
                        maxLength={1}
                        size={1}
                        value={letter.userInput}
                        onChange={(e) => handleLetterChange(wordIndex, letterIndex, e.target.value)}
                        onKeyDown={(e) => handleLetterKeyDown(e, wordIndex, letterIndex)}
                        disabled={showingAnswers}
                        data-word-index={wordIndex}
                        data-letter-index={letterIndex}
                        className={`w-6 h-8 text-center inline-block border-b-2 mx-px focus:outline-none focus:border-blue-500 ${
                          showingAnswers ? (
                            word.isCorrect ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500'
                          ) : 'border-gray-300'
                        }`}
                        required
                      />
                    );
                  }
                })}
                {/* If showing answers and the word is incorrect, show the correct word */}
                {word.isTarget && showingAnswers && !word.isCorrect && (
                  <span className="absolute -bottom-5 left-0 text-xs text-red-600 font-medium">
                    {word.originalWord}
                  </span>
                )}
                {/* Add appropriate spacing */}
                {word.originalWord.match(/^\s+$/) ? null : ' '}
              </span>
            ))}
          </p>
        </div>

        <div className="mt-8 flex justify-end">
          {feedbackStage === 'input' ? (
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Check Answers
            </button>
          ) : feedbackStage === 'complete' ? (
            <button
              type="button"
              onClick={handleContinue}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="px-6 py-2 bg-gray-400 text-white rounded-md cursor-not-allowed"
            >
              Please review your answers...
            </button>
          )}
        </div>
      </form>
    </div>
  );
}