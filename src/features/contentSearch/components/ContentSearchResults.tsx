import type {
  SearchResult,
  ContentSearchResult,
  TestSearchResult,
  TranscriptSearchResult,
  CourseType,
  ContentMatchField,
} from '../types';
import type { CoreCourseType } from '../../../types/tests';
import { isCoreCourse } from '../../../constants/courses';

interface ContentSearchResultsProps {
  results: SearchResult[];
  query: string;
  onResultClick: (path: string) => void;
}

const COURSE_LABELS: Record<CoreCourseType, { label: string; color: string; icon: string }> = {
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
const DEFAULT_COURSE_BADGE = { label: 'Курс', color: 'bg-slate-100 text-slate-700', icon: '🎓' };

const CONTENT_MATCH_LABELS: Record<ContentMatchField, string> = {
  title: 'заголовок',
  subtitle: 'подзаголовок',
  concepts: 'понятия',
  authors: 'авторы',
  literature: 'литература',
  videos: 'видео',
  leisure: 'досуг',
};

function getContentPath(result: ContentSearchResult): string {
  switch (result.course) {
    case 'development':
      return `/${result.period}`;
    case 'clinical':
      return `/clinical/${result.period}`;
    case 'general':
      return `/general/${result.period}`;
    default:
      return `/course/${result.course}/${result.period}`;
  }
}

function getTestPath(result: TestSearchResult): string {
  return `/tests/dynamic/${result.testId}`;
}

export function ContentSearchResults({
  results,
  query,
  onResultClick,
}: ContentSearchResultsProps) {
  // Разделяем результаты на контент и тесты
  const contentResults = results.filter((r): r is ContentSearchResult => r.type === 'content');
  const transcriptResults = results.filter((r): r is TranscriptSearchResult => r.type === 'transcript');
  const testResults = results.filter((r): r is TestSearchResult => r.type === 'test');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">
          Найдено: <span className="font-medium text-fg">{results.length}</span>
        </span>
      </div>

      <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1 space-y-4">
        {/* Результаты по контенту */}
        {contentResults.length > 0 && (
          <ul className="space-y-2">
            {contentResults.map((result) => (
              <ContentResultItem
                key={result.id}
                result={result}
                query={query}
                onResultClick={onResultClick}
              />
            ))}
          </ul>
        )}

        {transcriptResults.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted mb-2 uppercase tracking-wide">Транскрипты лекций</p>
            <ul className="space-y-2">
              {transcriptResults.map((result) => (
                <TranscriptResultItem
                  key={result.id}
                  result={result}
                  query={query}
                  onResultClick={onResultClick}
                />
              ))}
            </ul>
          </div>
        )}

        {/* Результаты по тестам */}
        {testResults.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted mb-2 uppercase tracking-wide">Тесты</p>
            <div className="flex flex-wrap gap-2">
              {testResults.map((result) => (
                <TestResultItem
                  key={result.id}
                  result={result}
                  onResultClick={onResultClick}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ContentResultItemProps {
  result: ContentSearchResult;
  query: string;
  onResultClick: (path: string) => void;
}

function ContentResultItem({ result, query, onResultClick }: ContentResultItemProps) {
  const courseInfo = isCoreCourse(result.course) ? COURSE_LABELS[result.course] : DEFAULT_COURSE_BADGE;
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
  onResultClick: (path: string) => void;
}

function TestResultItem({ result, onResultClick }: TestResultItemProps) {
  const path = getTestPath(result);
  const icon = result.icon || '📝';

  return (
    <button
      onClick={() => onResultClick(path)}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:border-accent/40 hover:shadow-sm transition-all text-sm"
      title={result.title}
    >
      <span className="text-lg" aria-hidden>
        {icon}
      </span>
      <span className="text-fg font-medium truncate max-w-[180px]">
        {result.title}
      </span>
    </button>
  );
}

interface TranscriptResultItemProps {
  result: TranscriptSearchResult;
  query: string;
  onResultClick: (path: string) => void;
}

function TranscriptResultItem({ result, query, onResultClick }: TranscriptResultItemProps) {
  const courseInfo = isCoreCourse(result.course) ? COURSE_LABELS[result.course] : DEFAULT_COURSE_BADGE;

  return (
    <li>
      <button
        onClick={() => onResultClick(result.path)}
        className="w-full rounded-lg border border-border bg-card p-4 text-left transition-all hover:border-accent/40 hover:shadow-sm group"
      >
        <div className="flex items-start gap-3">
          <span className="text-xl" aria-hidden>
            {courseInfo.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${courseInfo.color}`}
              >
                {courseInfo.label}
              </span>
              <span className="rounded-full border border-accent/20 bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                {result.timestamps.length === 1
                  ? '1 таймкод'
                  : `${result.timestamps.length} таймкода`}
              </span>
            </div>
            <h3 className="line-clamp-1 font-medium text-fg transition-colors group-hover:text-accent">
              {result.periodTitle}
            </h3>
            <p className="mt-0.5 line-clamp-1 text-sm text-muted">
              {result.lectureTitle}
            </p>
            <p className="mt-2 line-clamp-2 text-sm text-fg/85">
              {highlightMatch(result.snippet, query)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {result.timestamps.map((timestamp) => (
                <button
                  key={`${result.id}-${timestamp.startMs}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onResultClick(timestamp.path);
                  }}
                  className="rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent transition hover:bg-accent/15"
                >
                  {timestamp.timestampLabel}
                </button>
              ))}
            </div>
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
