import type {
  SearchResult,
  ContentSearchResult,
  TestSearchResult,
  CourseType,
  ContentMatchField,
  TestMatchField,
} from '../types';

interface ContentSearchResultsProps {
  results: SearchResult[];
  query: string;
  onResultClick: (path: string) => void;
}

const COURSE_LABELS: Record<CourseType, { label: string; color: string; icon: string }> = {
  development: {
    label: 'Психология развития',
    color: 'bg-blue-100 text-blue-800',
    icon: '👶',
  },
  clinical: {
    label: 'Клиническая психология',
    color: 'bg-purple-100 text-purple-800',
    icon: '🧠',
  },
  general: {
    label: 'Общая психология',
    color: 'bg-green-100 text-green-800',
    icon: '📚',
  },
};

const CONTENT_MATCH_LABELS: Record<ContentMatchField, string> = {
  title: 'заголовок',
  subtitle: 'подзаголовок',
  concepts: 'понятия',
  authors: 'авторы',
  literature: 'литература',
  videos: 'видео',
  leisure: 'досуг',
};

const TEST_MATCH_LABELS: Record<TestMatchField, string> = {
  testTitle: 'название теста',
  question: 'вопрос',
  answer: 'ответ',
  explanation: 'объяснение',
};

function getContentPath(result: ContentSearchResult): string {
  switch (result.course) {
    case 'development':
      return `/${result.period}`;
    case 'clinical':
      return `/clinical/${result.period}`;
    case 'general':
      return `/general/${result.period}`;
  }
}

function getTestPath(result: TestSearchResult): string {
  return `/tests/dynamic/${result.testId}`;
}

function isContentResult(result: SearchResult): result is ContentSearchResult {
  return result.type === 'content';
}

function isTestResult(result: SearchResult): result is TestSearchResult {
  return result.type === 'test';
}

export function ContentSearchResults({
  results,
  query,
  onResultClick,
}: ContentSearchResultsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">
          Найдено: <span className="font-medium text-fg">{results.length}</span>
        </span>
      </div>

      <ul className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
        {results.map((result) => {
          if (isContentResult(result)) {
            return (
              <ContentResultItem
                key={result.id}
                result={result}
                query={query}
                onResultClick={onResultClick}
              />
            );
          }
          if (isTestResult(result)) {
            return (
              <TestResultItem
                key={result.id}
                result={result}
                query={query}
                onResultClick={onResultClick}
              />
            );
          }
          return null;
        })}
      </ul>
    </div>
  );
}

interface ContentResultItemProps {
  result: ContentSearchResult;
  query: string;
  onResultClick: (path: string) => void;
}

function ContentResultItem({ result, query, onResultClick }: ContentResultItemProps) {
  const courseInfo = COURSE_LABELS[result.course];
  const path = getContentPath(result);

  return (
    <li>
      <button
        onClick={() => onResultClick(path)}
        className="w-full text-left rounded-lg border border-border bg-card p-4 hover:border-accent/40 hover:shadow-sm transition-all group"
      >
        <div className="flex items-start gap-3">
          <span className="text-xl" aria-hidden>
            {courseInfo.icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${courseInfo.color}`}
              >
                {courseInfo.label}
              </span>
            </div>
            <h3 className="font-medium text-fg group-hover:text-accent transition-colors line-clamp-1">
              {highlightMatch(result.title, query)}
            </h3>
            {result.subtitle && (
              <p className="text-sm text-muted mt-0.5 line-clamp-1">
                {highlightMatch(result.subtitle, query)}
              </p>
            )}
            <p className="text-xs text-muted mt-2">
              Найдено в:{' '}
              {result.matchedIn.map((field) => CONTENT_MATCH_LABELS[field]).join(', ')}
            </p>
          </div>
          <ChevronIcon />
        </div>
      </button>
    </li>
  );
}

interface TestResultItemProps {
  result: TestSearchResult;
  query: string;
  onResultClick: (path: string) => void;
}

function TestResultItem({ result, query, onResultClick }: TestResultItemProps) {
  const courseInfo = COURSE_LABELS[result.course];
  const path = getTestPath(result);

  return (
    <li>
      <button
        onClick={() => onResultClick(path)}
        className="w-full text-left rounded-lg border border-amber-200 bg-amber-50 p-4 hover:border-amber-400 hover:shadow-sm transition-all group"
      >
        <div className="flex items-start gap-3">
          <span className="text-xl" aria-hidden>
            📝
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-200 text-amber-900">
                Тест
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${courseInfo.color}`}
              >
                {courseInfo.label}
              </span>
            </div>
            <h3 className="font-medium text-fg group-hover:text-amber-700 transition-colors line-clamp-1">
              {highlightMatch(result.title, query)}
            </h3>
            {result.matchedQuestion && (
              <p className="text-sm text-muted mt-0.5 line-clamp-2">
                {highlightMatch(result.matchedQuestion, query)}
              </p>
            )}
            <p className="text-xs text-muted mt-2">
              Найдено в:{' '}
              {result.matchedIn.map((field) => TEST_MATCH_LABELS[field]).join(', ')}
            </p>
          </div>
          <ChevronIcon />
        </div>
      </button>
    </li>
  );
}

function ChevronIcon() {
  return (
    <svg
      className="w-5 h-5 text-muted group-hover:text-accent transition-colors flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

/**
 * Подсвечивает совпадения в тексте
 */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const words = query.trim().toLowerCase().split(/\s+/);
  const regex = new RegExp(`(${words.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) => {
    const isMatch = words.some((word) => part.toLowerCase() === word);
    if (isMatch) {
      return (
        <mark key={index} className="bg-yellow-200 text-yellow-900 rounded px-0.5">
          {part}
        </mark>
      );
    }
    return part;
  });
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
