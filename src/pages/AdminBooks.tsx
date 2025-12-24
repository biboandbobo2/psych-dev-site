/**
 * Админ-страница управления библиотекой книг для RAG
 * Доступна только superadmin
 */
import { useState, useEffect, useCallback, type FormEvent, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { ref, uploadBytesResumable } from 'firebase/storage';

import { useAuth } from '../auth/AuthProvider';
import { storage, auth } from '../lib/firebase';
import { debugLog, debugError } from '../lib/debug';
import {
  BOOK_STATUS_LABELS,
  BOOK_LANGUAGE_LABELS,
  BOOK_TAG_LABELS,
  MAX_BOOK_FILE_SIZE,
  INGESTION_STEP_LABELS,
} from '../constants/books';
import type { BookLanguage, BookTag, BookStatus, IngestionStep } from '../types/books';

// ============================================================================
// TYPES
// ============================================================================

interface BookListItem {
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

interface JobStatus {
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

// ============================================================================
// API HELPERS
// ============================================================================

async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  const res = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.error || 'API error');
  }
  return data;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function AdminBooks() {
  const { user, isSuperAdmin } = useAuth();

  // State
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formAuthors, setFormAuthors] = useState('');
  const [formLanguage, setFormLanguage] = useState<BookLanguage>('ru');
  const [formYear, setFormYear] = useState('');
  const [formTags, setFormTags] = useState<BookTag[]>([]);
  const [creating, setCreating] = useState(false);

  // Upload state
  const [uploadBookId, setUploadBookId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Job status
  const [watchingJobId, setWatchingJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);

  // ============================================================================
  // LOAD BOOKS
  // ============================================================================

  const loadBooks = useCallback(async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall<{ books: BookListItem[] }>('/api/admin/books?action=list');
      setBooks(data.books);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load books';
      setError(msg);
      debugError('[AdminBooks] loadBooks error:', e);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  // ============================================================================
  // CREATE BOOK
  // ============================================================================

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (creating) return;

    setCreating(true);
    setError(null);

    try {
      const authors = formAuthors
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      if (authors.length === 0) {
        throw new Error('Укажите хотя бы одного автора');
      }

      const data = await apiCall<{ bookId: string }>('/api/admin/books', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          title: formTitle.trim(),
          authors,
          language: formLanguage,
          year: formYear ? parseInt(formYear, 10) : undefined,
          tags: formTags,
        }),
      });

      debugLog('[AdminBooks] Book created:', data.bookId);

      // Reset form
      setFormTitle('');
      setFormAuthors('');
      setFormLanguage('ru');
      setFormYear('');
      setFormTags([]);
      setShowCreateForm(false);

      // Reload list
      await loadBooks();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create book';
      setError(msg);
      debugError('[AdminBooks] createBook error:', e);
    } finally {
      setCreating(false);
    }
  };

  // ============================================================================
  // UPLOAD FILE
  // ============================================================================

  const handleFileSelect = async (bookId: string, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (file.type !== 'application/pdf') {
      setUploadError('Только PDF файлы');
      return;
    }
    if (file.size > MAX_BOOK_FILE_SIZE) {
      setUploadError(`Файл слишком большой (макс ${Math.round(MAX_BOOK_FILE_SIZE / 1024 / 1024)} MB)`);
      return;
    }

    setUploadBookId(bookId);
    setUploadProgress(0);
    setUploadError(null);

    try {
      // Get resumable upload URL
      const urlData = await apiCall<{ uploadUrl: string; storagePath: string }>(
        '/api/admin/books',
        {
          method: 'POST',
          body: JSON.stringify({
            action: 'uploadUrl',
            bookId,
            contentType: file.type,
            fileSize: file.size,
          }),
        }
      );

      setUploadProgress(25);

      // Upload directly to Storage using resumable upload URL
      const uploadRes = await fetch(urlData.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': String(file.size),
        },
        body: file,
      });

      if (!uploadRes.ok) {
        const text = await uploadRes.text();
        throw new Error(`Upload failed: ${text}`);
      }

      setUploadProgress(100);
      debugLog('[AdminBooks] Upload complete for book:', bookId);

      // Update book status in local state
      setBooks((prev) =>
        prev.map((b) => (b.id === bookId ? { ...b, status: 'uploaded' as BookStatus } : b))
      );

      // Clear upload state after delay
      setTimeout(() => {
        setUploadBookId(null);
        setUploadProgress(0);
      }, 1500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      setUploadError(msg);
      debugError('[AdminBooks] upload error:', e);
    }
  };

  // ============================================================================
  // START INGESTION
  // ============================================================================

  const handleStartIngestion = async (bookId: string) => {
    setError(null);
    try {
      const data = await apiCall<{ jobId: string }>('/api/admin/books', {
        method: 'POST',
        body: JSON.stringify({ action: 'startIngestion', bookId }),
      });

      debugLog('[AdminBooks] Ingestion started:', data.jobId);

      // Update book status
      setBooks((prev) =>
        prev.map((b) => (b.id === bookId ? { ...b, status: 'processing' as BookStatus } : b))
      );

      // Start watching job
      setWatchingJobId(data.jobId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start ingestion';
      setError(msg);
      debugError('[AdminBooks] startIngestion error:', e);
    }
  };

  // ============================================================================
  // TOGGLE ACTIVE
  // ============================================================================

  const [togglingBookId, setTogglingBookId] = useState<string | null>(null);

  const handleToggleActive = async (bookId: string) => {
    setTogglingBookId(bookId);
    setError(null);

    try {
      const data = await apiCall<{ active: boolean }>('/api/admin/books', {
        method: 'POST',
        body: JSON.stringify({ action: 'manage', subAction: 'toggleActive', bookId }),
      });

      debugLog('[AdminBooks] Book active toggled:', bookId, data.active);

      // Update local state
      setBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, active: data.active } : b)));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to toggle active';
      setError(msg);
      debugError('[AdminBooks] toggleActive error:', e);
    } finally {
      setTogglingBookId(null);
    }
  };

  // ============================================================================
  // DELETE BOOK
  // ============================================================================

  const [deletingBookId, setDeletingBookId] = useState<string | null>(null);

  const handleDeleteBook = async (bookId: string) => {
    if (!confirm('Вы уверены? Удалятся книга, все чанки, задания и PDF файл. Это действие необратимо.')) {
      return;
    }

    setDeletingBookId(bookId);
    setError(null);

    try {
      await apiCall('/api/admin/books', {
        method: 'POST',
        body: JSON.stringify({ action: 'manage', subAction: 'delete', bookId }),
      });

      debugLog('[AdminBooks] Book deleted:', bookId);

      // Remove from local state
      setBooks((prev) => prev.filter((b) => b.id !== bookId));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete book';
      setError(msg);
      debugError('[AdminBooks] deleteBook error:', e);
    } finally {
      setDeletingBookId(null);
    }
  };

  // ============================================================================
  // WATCH JOB STATUS
  // ============================================================================

  useEffect(() => {
    if (!watchingJobId) {
      setJobStatus(null);
      return;
    }

    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;

      try {
        const data = await apiCall<{ job: JobStatus }>(
          `/api/admin/books?action=jobStatus&jobId=${watchingJobId}`
        );

        if (cancelled) return;
        setJobStatus(data.job);

        // If done or error, stop polling and reload
        if (data.job.status === 'done' || data.job.status === 'error') {
          setWatchingJobId(null);
          loadBooks();
        }
      } catch (e) {
        debugError('[AdminBooks] jobStatus poll error:', e);
      }
    };

    poll();
    const interval = setInterval(poll, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [watchingJobId, loadBooks]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Доступ запрещён</h1>
        <p className="text-muted">Эта страница доступна только супер-админам.</p>
        <Link to="/admin" className="text-accent mt-4 inline-block">
          ← Вернуться в админку
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Библиотека книг</h1>
          <p className="text-sm text-muted mt-1">
            Управление книгами для RAG-поиска
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
          >
            {showCreateForm ? 'Отмена' : '+ Добавить книгу'}
          </button>
          <button
            onClick={loadBooks}
            disabled={loading}
            className="px-4 py-2 border border-border rounded-lg hover:bg-card2 transition disabled:opacity-50"
          >
            {loading ? 'Загрузка...' : 'Обновить'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="rounded-2xl border border-border bg-card p-5 space-y-4"
        >
          <h2 className="text-lg font-semibold">Новая книга</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Название *</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-accent/30"
                placeholder="Психология развития"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Авторы * (через запятую)</label>
              <input
                type="text"
                value={formAuthors}
                onChange={(e) => setFormAuthors(e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg bg-card focus:ring-2 focus:ring-accent/30"
                placeholder="Выготский Л.С., Леонтьев А.Н."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Язык</label>
              <select
                value={formLanguage}
                onChange={(e) => setFormLanguage(e.target.value as BookLanguage)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card"
              >
                {Object.entries(BOOK_LANGUAGE_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Год издания</label>
              <input
                type="number"
                value={formYear}
                onChange={(e) => setFormYear(e.target.value)}
                min="1800"
                max={new Date().getFullYear() + 1}
                className="w-full px-3 py-2 border border-border rounded-lg bg-card"
                placeholder="2020"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Теги</label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(BOOK_TAG_LABELS) as [BookTag, string][]).map(([tag, label]) => (
                <label
                  key={tag}
                  className={`px-3 py-1 rounded-full text-sm cursor-pointer transition ${
                    formTags.includes(tag)
                      ? 'bg-accent text-white'
                      : 'bg-card2 text-muted hover:bg-card2/80'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formTags.includes(tag)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormTags([...formTags, tag]);
                      } else {
                        setFormTags(formTags.filter((t) => t !== tag));
                      }
                    }}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 border border-border rounded-lg hover:bg-card2"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={creating || !formTitle.trim() || !formAuthors.trim()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {creating ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      )}

      {/* Job Status Modal */}
      {jobStatus && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-amber-900">Обработка книги</h3>
            <span className="text-sm text-amber-700">{jobStatus.stepLabel}</span>
          </div>

          <div className="w-full bg-amber-200 rounded-full h-2">
            <div
              className="bg-amber-600 h-2 rounded-full transition-all"
              style={{ width: `${jobStatus.progressPercent}%` }}
            />
          </div>

          <p className="text-sm text-amber-800">
            Прогресс: {jobStatus.progress.done} / {jobStatus.progress.total} (
            {jobStatus.progressPercent}%)
          </p>

          {jobStatus.error && (
            <div className="text-sm text-red-800 bg-red-100 rounded p-2">
              Ошибка: {jobStatus.error.message}
            </div>
          )}

          {jobStatus.logs.length > 0 && (
            <details className="text-xs text-amber-700">
              <summary className="cursor-pointer">Логи ({jobStatus.logs.length})</summary>
              <pre className="mt-2 p-2 bg-white/50 rounded overflow-x-auto">
                {jobStatus.logs.join('\n')}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* Books Table */}
      {loading ? (
        <div className="text-center py-8 text-muted">Загрузка...</div>
      ) : books.length === 0 ? (
        <div className="text-center py-8 text-muted">
          Книги не найдены. Добавьте первую книгу.
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card2">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Название</th>
                <th className="text-left px-4 py-3 font-medium">Авторы</th>
                <th className="text-left px-4 py-3 font-medium">Статус</th>
                <th className="text-left px-4 py-3 font-medium">Чанков</th>
                <th className="text-left px-4 py-3 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book.id} className="border-t border-border hover:bg-card2/50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{book.title}</div>
                    <div className="text-xs text-muted">
                      {book.language.toUpperCase()}
                      {book.year && ` • ${book.year}`}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {book.authors.slice(0, 2).join(', ')}
                    {book.authors.length > 2 && ` +${book.authors.length - 2}`}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        book.status === 'ready'
                          ? 'bg-emerald-100 text-emerald-800'
                          : book.status === 'processing'
                            ? 'bg-amber-100 text-amber-800'
                            : book.status === 'error'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {BOOK_STATUS_LABELS[book.status] || book.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {book.chunksCount ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {/* Draft: show upload */}
                      {book.status === 'draft' && (
                        <label className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-xs cursor-pointer hover:bg-blue-200">
                          {uploadBookId === book.id ? `${uploadProgress}%` : 'Загрузить PDF'}
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={(e) => handleFileSelect(book.id, e)}
                            className="sr-only"
                            disabled={uploadBookId === book.id}
                          />
                        </label>
                      )}

                      {/* Uploaded: show start ingestion */}
                      {book.status === 'uploaded' && (
                        <button
                          onClick={() => handleStartIngestion(book.id)}
                          className="px-3 py-1 bg-amber-100 text-amber-800 rounded text-xs hover:bg-amber-200"
                        >
                          Обработать
                        </button>
                      )}

                      {/* Processing: show spinner */}
                      {book.status === 'processing' && (
                        <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded text-xs">
                          Обработка...
                        </span>
                      )}

                      {/* Error: show retry */}
                      {book.status === 'error' && (
                        <>
                          <label className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-xs cursor-pointer hover:bg-blue-200">
                            Загрузить снова
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              onChange={(e) => handleFileSelect(book.id, e)}
                              className="sr-only"
                            />
                          </label>
                        </>
                      )}

                      {/* Ready: show active toggle */}
                      {book.status === 'ready' && (
                        <button
                          onClick={() => handleToggleActive(book.id)}
                          disabled={togglingBookId === book.id}
                          className={`px-3 py-1 rounded text-xs hover:opacity-80 transition disabled:opacity-50 ${
                            book.active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                          title={book.active ? 'Скрыть из поиска' : 'Показать в поиске'}
                        >
                          {togglingBookId === book.id ? '...' : book.active ? 'Активна' : 'Скрыта'}
                        </button>
                      )}

                      {/* Delete button - always available */}
                      <button
                        onClick={() => handleDeleteBook(book.id)}
                        disabled={deletingBookId === book.id}
                        className="px-3 py-1 bg-red-100 text-red-800 rounded text-xs hover:bg-red-200 disabled:opacity-50"
                        title="Удалить книгу и все данные"
                      >
                        {deletingBookId === book.id ? '...' : 'Удалить'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Error */}
      {uploadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Ошибка загрузки: {uploadError}
        </div>
      )}

      {/* Navigation */}
      <div className="pt-4">
        <Link to="/admin" className="text-accent text-sm">
          ← Вернуться в админку
        </Link>
      </div>
    </div>
  );
}
