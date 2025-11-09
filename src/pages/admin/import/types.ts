/**
 * Types for admin import functionality
 */
import type { Period, IntroContent } from '../../../types/content';

export type { Period, IntroContent };

export interface ImportState {
  periodsFile: File | null;
  introFile: File | null;
  periodsPreview: Period[];
  introPreview: IntroContent | null;
  expectedBundle: any | null;
  parsing: boolean;
  importing: boolean;
  result: string | null;
  error: string | null;
}
