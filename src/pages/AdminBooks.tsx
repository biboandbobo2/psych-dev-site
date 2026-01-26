/**
 * Админ-страница управления библиотекой книг для RAG
 * Доступна только admin / super-admin
 */
import { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';
import { debugLog, debugError } from '../lib/debug';
import { MAX_BOOK_FILE_SIZE } from '../constants/books';
import {
  BookCreateForm,
  BookEditModal,
  JobStatusPanel,
  BookTableRow,
  apiCall,
  type BookListItem,
  type JobStatus,
} from './admin/books';

export default function AdminBooks() {
  const { isAdmin } = useAuth();

  // State
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Forms
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBook, setEditingBook] = useState<BookListItem | null>(null);

  // Upload state
  const [uploadBookId, setUploadBookId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Job status
  const [watchingJobId, setWatchingJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);

  // Action states
  const [togglingBookId, setTogglingBookId] = useState<string | null>(null);
  const [deletingBookId, setDeletingBookId] = useState<string | null>(null);

  // ============================================================================
  // LOAD BOOKS
  // ============================================================================

  const loadBooks = useCallback(async () => {
    if (!isAdmin) return;
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
  }, [isAdmin]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  // ============================================================================
  // UPLOAD FILE
  // ============================================================================

  const handleFileSelect = async (bookId: string, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

      setBooks((prev) =>
        prev.map((b) => (b.id === bookId ? { ...b, status: 'uploaded' } : b))
      );

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
  // ACTIONS
  // ============================================================================

  const handleStartIngestion = async (bookId: string) => {
    setError(null);
    try {
      const data = await apiCall<{ jobId: string }>('/api/admin/books', {
        method: 'POST',
        body: JSON.stringify({ action: 'startIngestion', bookId }),
      });

      debugLog('[AdminBooks] Ingestion started:', data.jobId);

      setBooks((prev) =>
        prev.map((b) => (b.id === bookId ? { ...b, status: 'processing' } : b))
      );

      setWatchingJobId(data.jobId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start ingestion';
      setError(msg);
      debugError('[AdminBooks] startIngestion error:', e);
    }
  };

  const handleToggleActive = async (bookId: string) => {
    setTogglingBookId(bookId);
    setError(null);

    try {
      const data = await apiCall<{ active: boolean }>('/api/admin/books', {
        method: 'POST',
        body: JSON.stringify({ action: 'manage', subAction: 'toggleActive', bookId }),
      });

      debugLog('[AdminBooks] Book active toggled:', bookId, data.active);
      setBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, active: data.active } : b)));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to toggle active';
      setError(msg);
      debugError('[AdminBooks] toggleActive error:', e);
    } finally {
      setTogglingBookId(null);
    }
  };

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
  // EDIT HANDLERS
  // ============================================================================

  const handleEditSaved = (updates: Partial<BookListItem>) => {
    if (!editingBook) return;
    setBooks((prev) =>
      prev.map((b) => (b.id === editingBook.id ? { ...b, ...updates } : b))
    );
    setEditingBook(null);
  };

  // ============================================================================
  // WATCH JOB STATUS
  // ============================================================================

  useEffect(() => {
    if (!watchingJobId) return;

    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;

      try {
        const data = await apiCall<{ job: JobStatus }>(
          `/api/admin/books?action=jobStatus&jobId=${watchingJobId}`
        );

        if (cancelled) return;
        setJobStatus(data.job);

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

  if (!isAdmin) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Доступ запрещён</h1>
        <p className="text-muted">Эта страница доступна только администраторам.</p>
        <Link to="/admin" className="text-accent mt-4 inline-block">
          ← Вернуться в админку
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Библиотека книг</h1>
          <p className="text-sm text-muted mt-1">Управление книгами для RAG-поиска</p>
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
        <BookCreateForm
          onCreated={() => {
            setShowCreateForm(false);
            loadBooks();
          }}
          onCancel={() => setShowCreateForm(false)}
          onError={setError}
        />
      )}

      {/* Edit Modal */}
      {editingBook && (
        <BookEditModal
          book={editingBook}
          onSaved={handleEditSaved}
          onCancel={() => setEditingBook(null)}
          onError={setError}
        />
      )}

      {/* Job Status */}
      {jobStatus && (
        <JobStatusPanel job={jobStatus} onClose={() => setJobStatus(null)} />
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
                <BookTableRow
                  key={book.id}
                  book={book}
                  uploadBookId={uploadBookId}
                  uploadProgress={uploadProgress}
                  onFileSelect={handleFileSelect}
                  onStartIngestion={handleStartIngestion}
                  onToggleActive={handleToggleActive}
                  onEdit={setEditingBook}
                  onDelete={handleDeleteBook}
                  togglingBookId={togglingBookId}
                  deletingBookId={deletingBookId}
                />
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
