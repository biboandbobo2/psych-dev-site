/**
 * Типы для страницы управления книгами
 */
import type { BookLanguage, BookTag, BookStatus, IngestionStep } from '../../../types/books';

export interface BookListItem {
  id: string;
  title: string;
  authors: string[];
  language: string;
  year: number | null;
  tags: string[];
  status: BookStatus;
  active: boolean;
  chunksCount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobStatus {
  id: string;
  bookId: string;
  status: string;
  step: IngestionStep;
  stepLabel: string;
  progress: { done: number; total: number };
  progressPercent: number;
  logs: string[];
  error: { message: string; step: string } | null;
}

export interface BookFormData {
  title: string;
  authors: string;
  language: BookLanguage;
  year: string;
  tags: BookTag[];
}
