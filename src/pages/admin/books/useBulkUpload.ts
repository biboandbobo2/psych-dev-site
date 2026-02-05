/**
 * Hook для массовой загрузки книг (до 20 PDF за раз)
 */
import { useState, useCallback, useRef } from 'react';
import { debugLog, debugError } from '../../../lib/debug';
import { MAX_BOOK_FILE_SIZE } from '../../../constants/books';
import type { BookLanguage, BookTag } from '../../../types/books';
import { apiCall } from './api';
import type { BulkUploadFileItem, BulkUploadResult } from './types';

const MAX_BULK_FILES = 20;

/** Валидирует PDF файл; возвращает строку ошибки или null */
function validatePdfFile(file: File): string | null {
  if (file.size > MAX_BOOK_FILE_SIZE) {
    const maxMB = Math.round(MAX_BOOK_FILE_SIZE / 1024 / 1024);
    return `Файл слишком большой (макс. ${maxMB} MB)`;
  }
  if (file.type !== 'application/pdf') return 'Только PDF файлы поддерживаются';
  if (!file.name.toLowerCase().endsWith('.pdf')) return 'Файл должен иметь расширение .pdf';
  return null;
}

/** Извлекает название книги из имени PDF файла */
function titleFromFilename(filename: string): string {
  return filename.replace(/\.pdf$/i, '').trim().slice(0, 500);
}

/** Загружает файл в Storage через resumable URL с отслеживанием прогресса */
function uploadFileWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', 'application/pdf');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(file);
  });
}

interface UseBulkUploadOptions {
  language: BookLanguage;
  tags: BookTag[];
  onComplete: () => void;
}

export function useBulkUpload({ language, tags, onComplete }: UseBulkUploadOptions) {
  const [files, setFiles] = useState<BulkUploadFileItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const languageRef = useRef(language);
  const tagsRef = useRef(tags);
  languageRef.current = language;
  tagsRef.current = tags;

  const addFiles = useCallback((fileList: FileList) => {
    const newFiles: BulkUploadFileItem[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const error = validatePdfFile(file);

      newFiles.push({
        file,
        title: titleFromFilename(file.name),
        status: error ? 'error' : 'pending',
        progress: 0,
        bookId: null,
        error,
      });
    }

    setFiles((prev) => {
      const combined = [...prev, ...newFiles];
      if (combined.length > MAX_BULK_FILES) {
        return combined.slice(0, MAX_BULK_FILES);
      }
      return combined;
    });
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateTitle = useCallback((index: number, title: string) => {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, title } : f)));
  }, []);

  const updateFile = useCallback((index: number, updates: Partial<BulkUploadFileItem>) => {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  }, []);

  const processOneFile = useCallback(
    async (
      item: BulkUploadFileItem,
      index: number,
    ): Promise<{ status: 'done' } | { status: 'error'; error: string }> => {
      if (item.status === 'error') {
        return { status: 'error', error: item.error ?? 'Невалидный файл' };
      }

      try {
        // Step 1: Create book record
        updateFile(index, { status: 'creating', progress: 10 });

        const createData = await apiCall<{ bookId: string }>('/api/admin/books', {
          method: 'POST',
          body: JSON.stringify({
            action: 'create',
            title: item.title.trim(),
            authors: ['Неизвестен'],
            language: languageRef.current,
            tags: tagsRef.current,
          }),
        });

        const bookId = createData.bookId;
        updateFile(index, { bookId, status: 'uploading', progress: 25 });
        debugLog('[BulkUpload] Book created:', bookId, item.title);

        // Step 2: Get upload URL
        const urlData = await apiCall<{ uploadUrl: string }>('/api/admin/books', {
          method: 'POST',
          body: JSON.stringify({
            action: 'uploadUrl',
            bookId,
            contentType: 'application/pdf',
            fileSize: item.file.size,
          }),
        });

        // Step 3: Upload file to Storage
        await uploadFileWithProgress(urlData.uploadUrl, item.file, (percent) => {
          updateFile(index, { progress: 25 + Math.round(percent * 0.5) });
        });

        debugLog('[BulkUpload] Upload complete:', bookId, item.title);

        // Step 4: Start ingestion (chunking + embeddings)
        updateFile(index, { status: 'processing', progress: 80 });

        await apiCall<{ jobId: string }>('/api/admin/books', {
          method: 'POST',
          body: JSON.stringify({ action: 'startIngestion', bookId }),
        });

        updateFile(index, { status: 'done', progress: 100 });
        debugLog('[BulkUpload] Ingestion started:', bookId, item.title);
        return { status: 'done' };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Неизвестная ошибка';
        updateFile(index, { status: 'error', error: msg });
        debugError('[BulkUpload] Error processing:', item.title, e);
        return { status: 'error', error: msg };
      }
    },
    [updateFile],
  );

  const startUpload = useCallback(async () => {
    setIsRunning(true);
    setResult(null);

    const currentFiles = files.filter((f) => f.status === 'pending');
    let success = 0;
    let failed = files.filter((f) => f.status === 'error').length;
    const resultItems: BulkUploadResult['items'] = [];

    // Pre-failed files
    for (const f of files) {
      if (f.status === 'error') {
        resultItems.push({ title: f.title, status: 'error', error: f.error ?? undefined });
      }
    }

    // Process sequentially
    for (const item of currentFiles) {
      const index = files.indexOf(item);
      const outcome = await processOneFile(item, index);

      if (outcome.status === 'done') {
        success++;
        resultItems.push({ title: item.title, status: 'done' });
      } else {
        failed++;
        resultItems.push({ title: item.title, status: 'error', error: outcome.error });
      }
    }

    const finalResult: BulkUploadResult = {
      total: files.length,
      success,
      failed,
      items: resultItems,
    };

    setResult(finalResult);
    setIsRunning(false);
    debugLog('[BulkUpload] Complete:', finalResult);

    if (success > 0) onComplete();
  }, [files, processOneFile, onComplete]);

  const reset = useCallback(() => {
    setFiles([]);
    setResult(null);
    setIsRunning(false);
  }, []);

  const validCount = files.filter((f) => f.status === 'pending').length;

  return {
    files,
    isRunning,
    result,
    validCount,
    addFiles,
    removeFile,
    updateTitle,
    startUpload,
    reset,
  };
}
