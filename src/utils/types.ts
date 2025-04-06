export interface User {
  uid: string;
  email: string;
  displayName?: string;
  demographics: Demographics;
  methodOrder: string[]; // ['A', 'B', 'C', 'D'] in a specific order
  progress: number; // from 0 to 4
  startTime: Date;
  endTime?: Date;
}

export interface Demographics {
  age?: string;
  gender?: string;
  education?: string;
  englishProficiency?: string;
  readingFrequency?: string;
}

export interface GapItem {
    // Core properties (required)
    start_idx: number;    // Start index in the text
    end_idx: number;      // End index in the text
    word: string;         // The word that was removed
    context: string;      // Short context around the gap
  
    // Method-specific properties (optional)
    difficulty?: number;  // Estimated difficulty (1-5)
    type?: string;        // Type of gap (e.g., 'noun', 'verb')
    
    // Properties for advanced gap generation methods
    method?: GapGenerationMethod;  // Which method generated this gap
    confidence?: number;           // Confidence score (0-1) from ML model
    reason?: string;               // Rationale for selecting this gap
    keywords?: {                   // For keyness metrics
      score: number;               // Keyness score
      comparison?: string;         // What corpus it was compared against
    };
    alternatives?: string[];       // Acceptable alternative answers
    hints?: string[];              // Optional hints that could be provided
    
    // For human-generated gaps
    annotator?: string;            // Who created this gap (for human-generated)
    
    // For analysis and metrics
    metadata?: Record<string, any>; // Any additional method-specific data
  }

export interface TestResult {
  testId: string;
  userId: string;
  methodId: string;
  passageId: number;
  score: number;
  timeSpent: number;
  answers: Record<string, string>; // key: gapindex, value: user's answer
  timeStamp?: Date;
}

export interface SurveyResponse {
  responseId: string;
  userId: string;
  testId: string;
  methodId: string;
  responses: {
    difficulty: number; // 1-5 Likert scale
    engagement: number; // 1-5 Likert scale
    helpfulness: number; // 1-5 Likert scale
    likelihood: number; // 1-5 Likert scale
  };
  comments?: string;
  timestamp: Date;
}

export interface FinalSurvey {
  userId: string;
  methodRanking: string[]; // ['A', 'B', 'C', 'D'] ranked by preference
  mostEngaging: string; // Method ID
  mostHelpful: string; // Method ID
  feedback?: string;
  timestamp: Date;
}

export enum MethodId {
  A = "A",
  B = "B",
  C = "C",
  D = "D",
}

export enum GapGenerationMethod {
    FINE_TUNED = "fine-tuned",     // Fine-tuned on CLOTH dataset
    RATIONAL = "rational",         // Rational deletions based on MLM probabilities
    KEYNESS = "keyness",           // Keyness metrics/keyword extraction
    HUMAN = "human",               // Human-generated gaps
    FALLBACK = "fallback"          // Simple fallback method
  }
  
  // Helper interface for gap generation API responses
  export interface GapGenerationResponse {
    gaps: GapItem[];
    metadata?: {
      method: GapGenerationMethod;
      modelVersion?: string;
      parameters?: Record<string, any>;
      processingTime?: number;
    };
  }

  export interface TestAnalytics {
    totalTimeSpent: number;           // Total time in seconds
    gapTimeDistribution: number[];    // Time spent on each gap
    editCounts: number[];             // Number of edits per gap
    focusEvents: number[];            // Times user focused on each gap
    typingSpeed: number;              // Average chars per second
    pausePatterns: [number, number][]; // [timestamp, duration] of pauses
  }

  export interface TestResult {
    testId: string;
    userId: string;
    methodId: string;
    passageId: number;
    score: number;
    timeSpent: number;
    answers: Record<string, string>;
    correctAnswers: string[];
    incorrectAnswers: string[];
    analytics?: TestAnalytics;        
    timeStamp?: Date;
  }

  export interface AnnotationType {
    source: 'sentence' | 'passage' | 'source' | 'unpredictable';
    notes?: string;
  }
  
  export interface ClozeTestResults {
    passageId: number;
    methodId: MethodId | string;
    score: number;
    timeSpent: number;
    answers: Record<string, string>;
    annotations: Record<string, AnnotationType>;
  }
  
  export enum InformationSource {
    SENTENCE = 'sentence',
    PASSAGE = 'passage',
    SOURCE = 'source',
    UNPREDICTABLE = 'unpredictable'
  }

