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

// ============================================================================
// BULK UPLOAD
// ============================================================================

export type BulkUploadFileStatus = 'pending' | 'creating' | 'uploading' | 'done' | 'error';

export interface BulkUploadFileItem {
  file: File;
  title: string;
  status: BulkUploadFileStatus;
  /** 0-100 */
  progress: number;
  bookId: string | null;
  error: string | null;
}

export interface BulkUploadResult {
  total: number;
  success: number;
  failed: number;
  items: Array<{ title: string; status: 'done' | 'error'; error?: string }>;
}
