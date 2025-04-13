export interface User {
  uid: string;
  email: string;
  displayName?: string;
  demographics: Demographics;
  assignedPassages: number[]; // [1, 6, 11] for example
  assignedMethods: string[]; // ['contextuality', 'contextuality_plus', 'keyword']
  progress: number; // from 0 to 3
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
  
  // Only keep essential method properties
  method?: string;      // Which method generated this gap (contextuality, contextuality_plus, keyword)
}

export interface TestResult {
  testId: string;
  userId: string;
  method: string;       // 'contextuality', 'contextuality_plus', or 'keyword'
  passageId: number;
  score: number;
  timeSpent: number;
  answers: Record<string, string>;     // key: gapIndex, value: user's answer
  correctAnswers: Record<string, string>;
  annotations: Record<string, string>; // key: gapIndex, value: annotation source
  holisticScore: number;
  timeStamp?: Date;
}

export interface FinalSurvey {
  userId: string;
  methodRanking: string[];       // ['contextuality', 'contextuality_plus', 'keyword'] ranked by preference
  mostEngaging: string;          // Method name
  mostHelpful: string;           // Method name
  feedback?: string;
  timestamp: Date;
}

// Information source categories for annotations
export enum InformationSource {
  SENTENCE = 'sentence',
  PASSAGE = 'passage',
  SOURCE = 'source',
  UNPREDICTABLE = 'unpredictable'
}

// Helper interface for gap generation API responses
export interface GapGenerationResponse {
  gaps: GapItem[];
  clozeText: string;
}