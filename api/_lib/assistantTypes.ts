// Типы для /api/assistant.

export interface AssistantHistoryItem {
  role: 'user' | 'assistant';
  message: string;
}

export interface AssistantRequest {
  message: string;
  locale?: string;
  history?: AssistantHistoryItem[];
}

export interface AssistantResponse {
  ok: true;
  answer: string;
  refused?: boolean;
  meta?: {
    tookMs: number;
    tokensUsed?: number;
  };
}

export interface AssistantErrorResponse {
  ok: false;
  error: string;
  code?: string;
}

export interface GeminiStructuredResponse {
  allowed: boolean;
  answer: string;
}

export interface CourseIntroDraftRequest {
  action: 'courseIntroDraft';
  courseName: string;
  kind: 'idea' | 'program';
  lessons?: string[];
}
