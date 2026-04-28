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
import { SECTION_CLASS } from './components/styles';

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
          . Поддерживается markdown: **жирный**, *курсив*, [ссылки](https://...).
        </p>
      </header>

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
