import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import type { TestStatus, TestRubric, CourseType } from '../types/tests';
import { AGE_RANGE_LABELS } from '../types/notes';
import { ROUTE_BY_PERIOD } from '../routes';
import { TestEditorForm } from './TestEditorForm';
import { useTestsList } from './tests/modal/hooks/useTestsList';
import { useTestsFilters } from './tests/modal/hooks/useTestsFilters';
import { useTestImportExport } from './tests/modal/hooks/useTestImportExport';
import { useTestDelete } from './tests/modal/hooks/useTestDelete';
import {
  TestsListHeader,
  TestsListTable,
  TestsFilterPanel,
  FilterButton,
  TestDeleteConfirmDialog,
  type TestListItem,
} from './tests/modal/components';

interface TestEditorModalProps {
  onClose: () => void;
  defaultCourse?: CourseType;
}

type DisplayStatus = 'published' | 'draft' | 'taken_down';

interface FeedbackState {
  type: 'success' | 'error';
  message: string;
}

const DEVELOPMENT_PERIOD_LABELS: Record<string, string> = Object.entries(ROUTE_BY_PERIOD).reduce(
  (acc, [key, config]) => {
    if (config?.navLabel) {
      acc[key] = config.navLabel;
    }
    return acc;
  },
  {} as Record<string, string>
);

function toDisplayStatus(status: TestStatus | 'taken_down'): DisplayStatus {
  if (status === 'unpublished' || status === 'taken_down') {
    return 'taken_down';
  }
  if (status === 'draft' || status === 'published') {
    return status;
  }
  return 'draft';
}

function getRubricLabel(rubric: TestRubric): string {
  if (rubric === 'full-course') {
    return 'Весь курс';
  }

  const routeLabel = DEVELOPMENT_PERIOD_LABELS[String(rubric)];
  if (routeLabel) {
    return routeLabel;
  }

  return AGE_RANGE_LABELS[rubric as keyof typeof AGE_RANGE_LABELS] ?? rubric;
}

export function TestEditorModal({ onClose, defaultCourse = 'development' }: TestEditorModalProps) {
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  // Use custom hooks
  const testsList = useTestsList();
  const filtersHook = useTestsFilters({ searchParams, setSearchParams });
  const importExport = useTestImportExport();
  const deleteHook = useTestDelete(() => {
    testsList.refreshTests();
  });

  // Filter tests by course
  const testsForCourse = useMemo(
    () =>
      testsList.tests.filter((test) => {
        const testCourse = test.course || 'development';
        return testCourse === defaultCourse;
      }),
    [testsList.tests, defaultCourse]
  );

  // Transform tests to list items
  const testItems: TestListItem[] = useMemo(
    () =>
      testsForCourse.map((test) => ({
        id: test.id,
        title: test.title,
        emoji: test.appearance?.introIcon,
        rubricLabel: getRubricLabel(test.rubric),
        questionCount: test.questionCount,
        status: toDisplayStatus(test.status),
        prerequisiteTestId: test.prerequisiteTestId,
        updatedAt: test.updatedAt,
        createdAt: test.createdAt,
      })),
    [testsForCourse]
  );

  // Calculate status counts
  const statusCounts = useMemo(() => {
    return testItems.reduce(
      (acc, item) => {
        acc[item.status] = (acc[item.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<DisplayStatus, number>
    );
  }, [testItems]);

  // Get rubric options
  const rubricOptions = useMemo(() => {
    const set = new Set<string>();
    testItems.forEach((item) => set.add(item.rubricLabel));
    return Array.from(set).sort();
  }, [testItems]);

  // Filter and sort tests
  const filteredTests = useMemo(() => {
    const queryLower = filtersHook.filters.query.trim().toLowerCase();
    const statusFilter = new Set(filtersHook.filters.statuses);
    return testItems
      .filter((item) => {
        if (
          queryLower &&
          !item.title.toLowerCase().includes(queryLower) &&
          !item.id.toLowerCase().includes(queryLower)
        ) {
          return false;
        }

        if (statusFilter.size > 0 && !statusFilter.has(item.status)) {
          return false;
        }

        if (
          filtersHook.filters.rubric !== 'all' &&
          item.rubricLabel !== filtersHook.filters.rubric
        ) {
          return false;
        }

        if (
          typeof filtersHook.filters.questionMin === 'number' &&
          item.questionCount < filtersHook.filters.questionMin
        ) {
          return false;
        }

        if (
          typeof filtersHook.filters.questionMax === 'number' &&
          item.questionCount > filtersHook.filters.questionMax
        ) {
          return false;
        }

        if (filtersHook.filters.hasNextLevel && !item.prerequisiteTestId) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (filtersHook.filters.sort) {
          case 'created-desc':
            return b.createdAt.getTime() - a.createdAt.getTime();
          case 'title-asc':
            return a.title.localeCompare(b.title);
          case 'updated-desc':
          default:
            return b.updatedAt.getTime() - a.updatedAt.getTime();
        }
      });
  }, [filtersHook.filters, testItems]);

  // Feedback timeout
  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  // Handlers
  const handleCreateNew = () => {
    setSelectedTestId('new');
  };

  const handleSelectTest = (testId: string) => {
    setSelectedTestId(testId);
  };

  const handleBackToList = () => {
    setSelectedTestId(null);
    importExport.clearImportedTest();
    testsList.refreshTests();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    importExport.handleFileChange(
      e,
      () => setSelectedTestId('new'),
      setFeedback
    );
  };

  const handleConfirmDelete = () => {
    deleteHook.handleConfirmDelete(setFeedback);
  };

  // Render test editor form
  if (selectedTestId) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
        <div className="max-h-[90vh] w-full max-w-4xl rounded-lg bg-white shadow-2xl flex flex-col overflow-hidden">
          <header className="flex items-center justify-between border-b bg-white px-6 py-4">
            <h2 className="text-xl font-bold">
              {selectedTestId === 'new'
                ? 'Создать новый тест'
                : 'Редактировать тест'}
            </h2>
            <button
              onClick={handleBackToList}
              className="text-2xl text-gray-400 transition hover:text-gray-600"
              aria-label="Назад к списку"
            >
              ×
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-6">
            <TestEditorForm
              testId={selectedTestId === 'new' ? null : selectedTestId}
              onClose={handleBackToList}
              onSaved={handleBackToList}
              existingTests={testsForCourse}
              importedData={importExport.importedTest}
              defaultCourse={defaultCourse}
            />
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Render tests list
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 className="text-xl font-bold">Управление тестами</h2>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 transition hover:text-gray-600"
            aria-label="Закрыть"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <TestsListHeader
              fileInputRef={importExport.fileInputRef}
              onCreateNew={handleCreateNew}
              onFileChange={handleFileChange}
              onDownloadTemplate={importExport.handleDownloadTestTemplate}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-gray-700 sr-only">
                Список тестов
              </h3>
              <FilterButton onClick={filtersHook.handlers.handleOpenFilters} />
            </div>

            {feedback && (
              <div
                className={`rounded-md border px-4 py-3 text-sm ${
                  feedback.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {feedback.message}
              </div>
            )}

            <TestsListTable
              tests={filteredTests}
              nextLevelCache={testsList.nextLevelCache}
              loading={testsList.loading}
              error={testsList.error}
              onSelectTest={handleSelectTest}
              onDeleteTest={deleteHook.handleRequestDelete}
              onRetry={testsList.refreshTests}
            />
          </div>
        </div>

        <footer className="sticky bottom-0 border-t bg-gray-50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md bg-gray-600 px-4 py-2 text-white transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            Закрыть
          </button>
        </footer>
      </div>

      {filtersHook.filterOpen && (
        <TestsFilterPanel
          filterDraft={filtersHook.filterDraft}
          rubricOptions={rubricOptions}
          statusCounts={statusCounts}
          onUpdateDraft={filtersHook.setFilterDraft}
          onApply={filtersHook.handlers.handleApplyFilters}
          onReset={filtersHook.handlers.handleResetFilters}
          onClose={filtersHook.handlers.handleCloseFilters}
        />
      )}

      {deleteHook.pendingDelete && (
        <TestDeleteConfirmDialog
          testTitle={deleteHook.pendingDelete.title}
          isDeleting={deleteHook.isDeleting}
          deleteConfirmRef={deleteHook.deleteConfirmRef}
          onCancel={deleteHook.handleCancelDelete}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>,
    document.body
  );
}
