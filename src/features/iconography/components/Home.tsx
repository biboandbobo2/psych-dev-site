import type { IconSummary } from '../types';
import { RecognitionQuiz } from './RecognitionQuiz';
export function Home({ icons }: { icons: IconSummary[] }) {
  return <RecognitionQuiz icons={icons} />;
}
