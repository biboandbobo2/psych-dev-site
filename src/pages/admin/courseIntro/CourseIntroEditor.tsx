import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { useAuth } from '../../../auth/AuthProvider';
import { useCourses } from '../../../hooks/useCourses';
import { SITE_NAME } from '../../../routes';
import { useCourseIntroEditor, type AuthorFormState } from './useCourseIntroEditor';
import { MarkdownView } from '../../../lib/MarkdownView';
import { PageLoader } from '../../../components/ui';
import { uploadCourseAuthorPhoto, validateImageFile } from '../../../utils/mediaUpload';
import { debugError } from '../../../lib/debug';
import { auth, db } from '../../../lib/firebase';
import { useAuthStore } from '../../../stores/useAuthStore';

const INPUT_CLASS =
  'w-full rounded-lg border border-[#DDE5EE] bg-white px-3 py-2 text-sm text-[#2C3E50] outline-none transition focus:border-[#2F6DB5] focus:ring-2 focus:ring-[#2F6DB5]/20';
const LABEL_CLASS = 'text-xs font-semibold uppercase tracking-wide text-[#8A97AB]';
const SECTION_CLASS = 'rounded-2xl border border-[#DDE5EE] bg-white p-5 space-y-3';

function AuthorLinksEditor({
  author,
  onChange,
}: {
  author: AuthorFormState;
  onChange: (patch: Partial<AuthorFormState>) => void;
}) {
  const updateLink = (index: number, patch: Partial<{ label: string; url: string }>) => {
    const next = author.links.map((link, i) => (i === index ? { ...link, ...patch } : link));
    onChange({ links: next });
  };
  const addLink = () => onChange({ links: [...author.links, { label: '', url: '' }] });
  const removeLink = (index: number) =>
    onChange({ links: author.links.filter((_, i) => i !== index) });

  return (
    <div className="space-y-2">
      <div className={LABEL_CLASS}>Ссылки (соцсети, сайт)</div>
      {author.links.length === 0 ? (
        <p className="text-xs text-[#8A97AB]">Пока нет ссылок.</p>
      ) : (
        <ul className="space-y-2">
          {author.links.map((link, idx) => (
            <li key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                value={link.label}
                onChange={(e) => updateLink(idx, { label: e.target.value })}
                placeholder="Название"
                className={`${INPUT_CLASS} sm:flex-1`}
              />
              <input
                type="url"
                value={link.url}
                onChange={(e) => updateLink(idx, { url: e.target.value })}
                placeholder="https://..."
                className={`${INPUT_CLASS} sm:flex-[2]`}
              />
              <button
                type="button"
                onClick={() => removeLink(idx)}
                className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100"
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={addLink}
        className="rounded-md bg-[#EEF2F7] px-3 py-1.5 text-sm text-[#2C3E50] hover:bg-[#DDE5EE]"
      >
        + Добавить ссылку
      </button>
    </div>
  );
}

function AuthorCardEditor({
  author,
  index,
  total,
  courseId,
  onUpdate,
  onRemove,
  onMove,
}: {
  author: AuthorFormState;
  index: number;
  total: number;
  courseId: string;
  onUpdate: (patch: Partial<AuthorFormState>) => void;
  onRemove: () => void;
  onMove: (direction: 'up' | 'down') => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setUploadError(validation.error ?? 'Неподдерживаемый файл.');
      e.target.value = '';
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const url = await uploadCourseAuthorPhoto(courseId, author.id, file);
      onUpdate({ photoUrl: url });
    } catch (err) {
      debugError('uploadCourseAuthorPhoto failed', err);
      setUploadError('Не удалось загрузить фото.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <li className="rounded-2xl border border-[#E5ECF3] bg-[#FAFCFE] p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-[#8A97AB]">
          Автор {index + 1}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove('up')}
            disabled={index === 0}
            aria-label="Поднять"
            className="rounded-md px-2 py-1 text-[#556476] hover:bg-[#EEF2F7] disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove('down')}
            disabled={index === total - 1}
            aria-label="Опустить"
            className="rounded-md px-2 py-1 text-[#556476] hover:bg-[#EEF2F7] disabled:opacity-30"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md bg-rose-50 px-3 py-1 text-sm text-rose-700 hover:bg-rose-100"
          >
            Удалить
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={LABEL_CLASS}>Имя</label>
          <input
            type="text"
            value={author.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Алексей Зыков"
            className={`${INPUT_CLASS} mt-1`}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Роль / должность</label>
          <input
            type="text"
            value={author.role}
            onChange={(e) => onUpdate({ role: e.target.value })}
            placeholder="Автор курса, PhD"
            className={`${INPUT_CLASS} mt-1`}
          />
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS}>Фото</label>
        <div className="mt-1 flex items-start gap-3">
          {author.photoUrl ? (
            <img
              src={author.photoUrl}
              alt=""
              className="h-16 w-16 flex-shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-[#E5ECF3] text-xs text-[#8A97AB]">
              нет фото
            </div>
          )}
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-md bg-[#2F6DB5] px-3 py-1.5 text-sm text-white hover:bg-[#1F4F86] disabled:opacity-50"
              >
                {uploading ? 'Загружаем…' : '📁 Загрузить фото'}
              </button>
              {author.photoUrl ? (
                <button
                  type="button"
                  onClick={() => onUpdate({ photoUrl: '' })}
                  className="rounded-md bg-rose-50 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-100"
                >
                  Очистить
                </button>
              ) : null}
            </div>
            <input
              type="url"
              value={author.photoUrl}
              onChange={(e) => onUpdate({ photoUrl: e.target.value })}
              placeholder="Или вставьте URL"
              className={INPUT_CLASS}
            />
            {uploadError ? (
              <p className="text-xs text-rose-700">{uploadError}</p>
            ) : (
              <p className="text-xs text-[#8A97AB]">
                JPEG / PNG / GIF / WebP, до 5 MB. Без фото — показаны инициалы.
              </p>
            )}
          </div>
        </div>
      </div>

      <div>
        <label className={LABEL_CLASS}>Биография (markdown)</label>
        <textarea
          value={author.bio}
          onChange={(e) => onUpdate({ bio: e.target.value })}
          rows={4}
          placeholder="Короткий текст о профессиональном пути. Можно использовать **жирный** и ссылки [текст](https://...)."
          className={`${INPUT_CLASS} mt-1 font-mono text-sm`}
        />
        {author.bio.trim() ? (
          <details className="mt-2 text-sm text-[#556476]">
            <summary className="cursor-pointer text-xs text-[#8A97AB]">Предпросмотр</summary>
            <MarkdownView
              source={author.bio}
              className="mt-2 space-y-2 rounded-md bg-white p-3 [&_p]:leading-relaxed"
            />
          </details>
        ) : null}
      </div>

      <AuthorLinksEditor author={author} onChange={onUpdate} />
    </li>
  );
}

async function generateDraft(
  courseName: string,
  lessons: string[],
  kind: 'idea' | 'program',
  geminiKey: string | null
): Promise<string> {
  if (!geminiKey) {
    throw new Error('Подключите свой Gemini API ключ в профиле — он бесплатный.');
  }
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) {
    throw new Error('Войдите в аккаунт, чтобы использовать AI-черновики.');
  }
  const response = await fetch('/api/assistant', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
      'X-Gemini-Api-Key': geminiKey,
    },
    body: JSON.stringify({ action: 'courseIntroDraft', courseName, lessons, kind }),
  });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return typeof data.answer === 'string' ? data.answer : '';
}

export default function CourseIntroEditor() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const geminiKey = useAuthStore((s) => s.geminiApiKey);
  const { courseMap, loading: coursesLoading } = useCourses({ includeUnpublished: true });
  const editor = useCourseIntroEditor(courseId ?? '');
  const [lessons, setLessons] = useState<string[]>([]);
  const [generating, setGenerating] = useState<'idea' | 'program' | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    (async () => {
      try {
        const snapshot = await getDocs(
          query(collection(db, 'courses', courseId, 'lessons'), orderBy('order', 'asc'))
        );
        if (cancelled) return;
        const titles = snapshot.docs
          .map((d) => {
            const data = d.data() as Record<string, unknown>;
            return typeof data.title === 'string' ? data.title.trim() : '';
          })
          .filter(Boolean);
        setLessons(titles);
      } catch (err) {
        debugError('CourseIntroEditor: failed to load lessons', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (!courseId) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p>Не указан курс.</p>
        <Link to="/admin/content" className="text-[#2F6DB5] underline">
          ← К управлению контентом
        </Link>
      </div>
    );
  }

  if (editor.loading || coursesLoading) {
    return <PageLoader />;
  }

  const course = courseMap.get(courseId);
  const courseName = course?.name ?? courseId;
  const introPath = course?.isCore ? `/${courseId}/intro` : `/course/${courseId}/intro`;

  const handleSave = async () => {
    const ok = await editor.save(user?.uid ?? null);
    if (ok) {
      navigate('/admin/content');
    }
  };

  const handleGenerate = async (kind: 'idea' | 'program') => {
    setGenError(null);
    setGenerating(kind);
    try {
      const draft = await generateDraft(courseName, lessons, kind, geminiKey);
      if (!draft) {
        setGenError('Модель вернула пустой ответ.');
        return;
      }
      editor.setForm((prev) => ({ ...prev, [kind]: draft }));
    } catch (err) {
      debugError('generateDraft failed', err);
      setGenError(err instanceof Error ? err.message : 'Не удалось сгенерировать.');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <Helmet>
        <title>Редактор «О курсе»: {courseName} — {SITE_NAME}</title>
      </Helmet>

      <header className="space-y-1">
        <Link to="/admin/content" className="text-sm text-[#2F6DB5] hover:underline">
          ← К управлению контентом
        </Link>
        <h1 className="text-2xl font-bold text-[#2C3E50] sm:text-3xl">
          {course?.icon ?? '📘'} «О курсе»: {courseName}
        </h1>
        <p className="text-sm text-[#556476]">
          Содержание будет показано на{' '}
          <Link to={introPath} className="text-[#2F6DB5] underline">
            {introPath}
          </Link>
          . Поддерживается markdown: **жирный**, *курсив*, [ссылки](https://...).
        </p>
      </header>

      <section className={SECTION_CLASS}>
        <header className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[#2C3E50]">Идея курса</h2>
            <p className="text-xs text-[#8A97AB]">1–2 абзаца о целях и пользе курса.</p>
          </div>
          <button
            type="button"
            onClick={() => handleGenerate('idea')}
            disabled={generating !== null}
            className="rounded-md bg-violet-600 px-3 py-2 text-sm text-white hover:bg-violet-700 disabled:opacity-50"
            title="Сгенерировать черновик через Gemini Flash"
          >
            {generating === 'idea' ? 'Генерируем…' : '🤖 AI-черновик'}
          </button>
        </header>
        <textarea
          value={editor.form.idea}
          onChange={(e) => editor.setForm((prev) => ({ ...prev, idea: e.target.value }))}
          rows={6}
          placeholder="Для кого этот курс, что он даёт, почему именно такая программа."
          className={`${INPUT_CLASS} font-mono text-sm`}
        />
        {editor.form.idea.trim() ? (
          <details className="text-sm text-[#556476]">
            <summary className="cursor-pointer text-xs text-[#8A97AB]">Предпросмотр</summary>
            <MarkdownView
              source={editor.form.idea}
              className="mt-2 space-y-2 rounded-md bg-[#F9FBFF] p-3 [&_p]:leading-relaxed"
            />
          </details>
        ) : null}
      </section>

      <section className={SECTION_CLASS}>
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#2C3E50]">Авторы курса</h2>
            <p className="text-xs text-[#8A97AB]">
              Преподаватели и создатели программы. Фото опционально — без него показаны инициалы.
            </p>
          </div>
          <button
            type="button"
            onClick={editor.addAuthor}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700"
          >
            + Добавить автора
          </button>
        </header>

        {editor.form.authors.length === 0 ? (
          <p className="text-sm text-[#8A97AB]">Авторы пока не добавлены.</p>
        ) : (
          <ul className="space-y-3">
            {editor.form.authors.map((author, idx) => (
              <AuthorCardEditor
                key={author.id}
                author={author}
                index={idx}
                total={editor.form.authors.length}
                courseId={courseId}
                onUpdate={(patch) => editor.updateAuthor(author.id, patch)}
                onRemove={() => editor.removeAuthor(author.id)}
                onMove={(direction) => editor.moveAuthor(author.id, direction)}
              />
            ))}
          </ul>
        )}
      </section>

      <section className={SECTION_CLASS}>
        <header className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[#2C3E50]">Программа</h2>
            <p className="text-xs text-[#8A97AB]">Структура курса свободным текстом.</p>
          </div>
          <button
            type="button"
            onClick={() => handleGenerate('program')}
            disabled={generating !== null}
            className="rounded-md bg-violet-600 px-3 py-2 text-sm text-white hover:bg-violet-700 disabled:opacity-50"
            title="Сгенерировать черновик через Gemini Flash"
          >
            {generating === 'program' ? 'Генерируем…' : '🤖 AI-черновик'}
          </button>
        </header>
        <textarea
          value={editor.form.program}
          onChange={(e) => editor.setForm((prev) => ({ ...prev, program: e.target.value }))}
          rows={8}
          placeholder={'1. Первый блок — ...\n2. Второй блок — ...\n\nИли произвольный текст с ссылками на материалы.'}
          className={`${INPUT_CLASS} font-mono text-sm`}
        />
        {editor.form.program.trim() ? (
          <details className="text-sm text-[#556476]">
            <summary className="cursor-pointer text-xs text-[#8A97AB]">Предпросмотр</summary>
            <MarkdownView
              source={editor.form.program}
              className="mt-2 space-y-2 rounded-md bg-[#F9FBFF] p-3 [&_p]:leading-relaxed"
            />
          </details>
        ) : null}
      </section>

      {editor.error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {editor.error}
        </div>
      ) : null}

      {genError ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          AI-черновик: {genError}
        </div>
      ) : null}

      <footer className="flex items-center justify-between gap-3 rounded-xl border border-[#DDE5EE] bg-white p-3">
        <div className="text-xs text-[#8A97AB]">
          {editor.dirty ? 'Есть несохранённые изменения' : 'Без изменений'}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={editor.reset}
            disabled={!editor.dirty || editor.saving}
            className="rounded-md bg-[#EEF2F7] px-4 py-2 text-sm text-[#2C3E50] hover:bg-[#DDE5EE] disabled:opacity-40"
          >
            Отменить
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!editor.dirty || editor.saving}
            className="rounded-md bg-[#2F6DB5] px-4 py-2 text-sm font-medium text-white hover:bg-[#1F4F86] disabled:opacity-40"
          >
            {editor.saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      </footer>
    </div>
  );
}
