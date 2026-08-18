import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { useAuth } from '../../../auth/AuthProvider';
import { useCourses } from '../../../hooks/useCourses';
import { SITE_NAME } from '../../../routes';
import { useCourseIntroEditor } from './useCourseIntroEditor';
import { PageLoader } from '../../../components/ui';
import { debugError } from '../../../lib/debug';
import { db } from '../../../lib/firebase';
import { useAuthStore } from '../../../stores/useAuthStore';
import { generateCourseIntroDraft, type CourseIntroDraftKind } from './api';
import { AuthorCardEditor } from './components/AuthorCardEditor';
import { MarkdownDraftSection } from './components/MarkdownDraftSection';
import { INPUT_CLASS, LABEL_CLASS, SECTION_CLASS } from './components/styles';

export default function CourseIntroEditor() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const geminiKey = useAuthStore((s) => s.geminiApiKey);
  const { courseMap, loading: coursesLoading } = useCourses({ includeUnpublished: true });
  const editor = useCourseIntroEditor(courseId ?? '');
  const [lessons, setLessons] = useState<string[]>([]);
  const [generating, setGenerating] = useState<CourseIntroDraftKind | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    (async () => {
      try {
        const snapshot = await getDocs(
          query(collection(db, 'courses', courseId, 'lessons'), orderBy('order', 'asc')),
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

  const handleGenerate = async (kind: CourseIntroDraftKind) => {
    setGenError(null);
    setGenerating(kind);
    try {
      const draft = await generateCourseIntroDraft(courseName, lessons, kind, geminiKey);
      if (!draft) {
        setGenError('Модель вернула пустой ответ.');
        return;
      }
      editor.setForm((prev) => ({ ...prev, [kind]: draft }));
    } catch (err) {
      debugError('generateCourseIntroDraft failed', err);
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
          . Поддерживается markdown: **жирный**, *курсив*, [ссылки](https://...), списки из строк «- пункт»,
          заголовки «## » и «### ».
        </p>
      </header>

      <section className={SECTION_CLASS}>
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#2C3E50]">Ключевые факты</h2>
            <p className="text-xs text-[#8A97AB]">
              Короткие пары «подпись — значение» (сроки, формат, стоимость). Показаны карточками в начале секции.
            </p>
          </div>
          <button
            type="button"
            onClick={editor.addFact}
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700"
          >
            + Добавить факт
          </button>
        </header>

        {editor.form.facts.length === 0 ? (
          <p className="text-sm text-[#8A97AB]">Фактов пока нет.</p>
        ) : (
          <ul className="space-y-2">
            {editor.form.facts.map((fact, idx) => (
              <li key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={fact.label}
                  onChange={(e) => editor.updateFact(idx, { label: e.target.value })}
                  placeholder="Сроки"
                  className={`${INPUT_CLASS} sm:w-48`}
                />
                <input
                  type="text"
                  value={fact.value}
                  onChange={(e) => editor.updateFact(idx, { value: e.target.value })}
                  placeholder="17 сентября — 17 декабря 2026"
                  className={INPUT_CLASS}
                />
                <button
                  type="button"
                  onClick={() => editor.removeFact(idx)}
                  className="self-start rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100 sm:self-auto"
                >
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <MarkdownDraftSection
        title="Идея курса"
        hint="1–2 абзаца о целях и пользе курса."
        value={editor.form.idea}
        onChange={(value) => editor.setForm((prev) => ({ ...prev, idea: value }))}
        rows={6}
        placeholder="Для кого этот курс, что он даёт, почему именно такая программа."
        aiLabel="🤖 AI-черновик"
        generating={generating === 'idea'}
        onGenerate={() => handleGenerate('idea')}
      />

      <MarkdownDraftSection
        title="Программа"
        hint="Структура курса свободным текстом."
        value={editor.form.program}
        onChange={(value) => editor.setForm((prev) => ({ ...prev, program: value }))}
        rows={8}
        placeholder={'1. Первый блок — ...\n2. Второй блок — ...\n\nИли произвольный текст с ссылками на материалы.'}
        aiLabel="🤖 AI-черновик"
        generating={generating === 'program'}
        onGenerate={() => handleGenerate('program')}
      />

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

        <div>
          <label className={LABEL_CLASS}>Заголовок секции</label>
          <input
            type="text"
            value={editor.form.authorsTitle}
            onChange={(e) => editor.setForm((prev) => ({ ...prev, authorsTitle: e.target.value }))}
            placeholder="Авторы"
            className={`${INPUT_CLASS} mt-1 sm:w-64`}
          />
          <p className="mt-1 text-xs text-[#8A97AB]">Например «Ведущие». Пусто — «Авторы».</p>
        </div>

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
        <header>
          <h2 className="text-lg font-semibold text-[#2C3E50]">Кнопка записи</h2>
          <p className="text-xs text-[#8A97AB]">
            Показана в шапке страницы и в конце секции. Пустые текст или ссылка — кнопки нет.
          </p>
        </header>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLASS}>Текст кнопки</label>
            <input
              type="text"
              value={editor.form.ctaLabel}
              onChange={(e) => editor.setForm((prev) => ({ ...prev, ctaLabel: e.target.value }))}
              placeholder="Записаться"
              className={`${INPUT_CLASS} mt-1`}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Ссылка</label>
            <input
              type="url"
              value={editor.form.ctaUrl}
              onChange={(e) => editor.setForm((prev) => ({ ...prev, ctaUrl: e.target.value }))}
              placeholder="https://t.me/..."
              className={`${INPUT_CLASS} mt-1`}
            />
          </div>
        </div>
        <div>
          <label className={LABEL_CLASS}>Подпись под кнопкой (markdown)</label>
          <input
            type="text"
            value={editor.form.ctaNote}
            onChange={(e) => editor.setForm((prev) => ({ ...prev, ctaNote: e.target.value }))}
            placeholder="Вопросы — в Telegram или на почту"
            className={`${INPUT_CLASS} mt-1`}
          />
        </div>
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
