export interface TestResult {
  id?: string;
  userId: string;
  testId: string;
  testTitle: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  completedAt: Date;
  timeSpent?: number; // в секундах
}

export interface TestAttemptSummary {
  testId: string;
  testTitle: string;
  attempts: number;
  bestScore: number;
  bestPercentage: number;
  lastAttemptDate: Date;
  averageScore: number;
}
