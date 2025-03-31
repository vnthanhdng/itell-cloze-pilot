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
  wordIndex: number;
  word: string;
  context: string;
  startIndex: number;
  endIndex: number;
}

export interface TestResult {
  testId: string;
  userId: string;
  methodId: string;
  passageId: number;
  score: number;
  timeSpent: number;
  answers: Record<string, string>; // key: gapindex, value: user's answer
  timeStamp: Date;
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
