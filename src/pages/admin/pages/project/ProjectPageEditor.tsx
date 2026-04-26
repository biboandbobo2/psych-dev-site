import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SITE_NAME } from '../../../../routes';
import { PageLoader } from '../../../../components/ui';
import { useProjectPageEditor } from './useProjectPageEditor';

const INPUT_CLASS =
  'w-full rounded-lg border border-[#DDE5EE] bg-white px-3 py-2 text-sm text-[#2C3E50] outline-none transition focus:border-[#2F6DB5] focus:ring-2 focus:ring-[#2F6DB5]/20';
const LABEL_CLASS = 'text-xs font-semibold uppercase tracking-wide text-[#8A97AB]';
const SECTION_CLASS = 'rounded-2xl border border-[#DDE5EE] bg-white p-5 space-y-3';

export default function ProjectPageEditor() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const editor = useProjectPageEditor(slug ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!slug) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p>Не указан slug проекта.</p>
        <Link to="/superadmin/pages" className="text-[#2F6DB5] underline">
          ← К списку страниц
        </Link>
      </div>
    );
  }

  if (editor.loading) {
    return <PageLoader />;
  }

  const { form } = editor;

  const updateParagraph = (idx: number, value: string) => {
    editor.setForm((prev) => ({
      ...prev,
      paragraphs: prev.paragraphs.map((p, i) => (i === idx ? value : p)),
    }));
  };
  const addParagraph = () =>
    editor.setForm((prev) => ({ ...prev, paragraphs: [...prev.paragraphs, ''] }));
  const removeParagraph = (idx: number) =>
    editor.setForm((prev) => ({
      ...prev,
      paragraphs: prev.paragraphs.filter((_, i) => i !== idx),
    }));

  const updateImage = (idx: number, patch: Partial<(typeof form.images)[number]>) => {
    editor.setForm((prev) => ({
      ...prev,
      images: prev.images.map((img, i) => (i === idx ? { ...img, ...patch } : img)),
    }));
  };
  const addImage = () =>
    editor.setForm((prev) => ({
      ...prev,
      images: [...prev.images, { src: '', alt: '', caption: '' }],
    }));
  const removeImage = (idx: number) =>
    editor.setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx),
    }));

  const ctaEnabled = !!form.cta;
  const toggleCta = () => {
    editor.setForm((prev) => ({
      ...prev,
      cta: prev.cta ? null : { label: '', to: '/home' },
    }));
  };
  const updateCta = (patch: Partial<NonNullable<typeof form.cta>>) => {
    editor.setForm((prev) => ({
      ...prev,
      cta: prev.cta ? { ...prev.cta, ...patch } : prev.cta,
    }));
  };

  const handleSave = async () => {
    const ok = await editor.save();
    if (ok) navigate('/superadmin/pages');
  };

  const handleDelete = async () => {
    const ok = await editor.remove();
    if (ok) navigate('/superadmin/pages');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <Helmet>
        <title>Проект «{form.title || slug}» — {SITE_NAME}</title>
      </Helmet>

      <header className="space-y-1">
        <Link to="/superadmin/pages" className="text-sm text-[#2F6DB5] hover:underline">
          ← К списку страниц
        </Link>
        <h1 className="text-2xl font-bold text-[#2C3E50] sm:text-3xl">
          📄 Проект: <span className="font-mono text-base text-[#556476]">{slug}</span>
        </h1>
        <p className="text-sm text-[#556476]">
          Будет показан на{' '}
          <Link to={`/projects/${slug}`} className="text-[#2F6DB5] underline">
            /projects/{slug}
          </Link>
          .
        </p>
        {editor.notFound ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
            Документ ещё не существует — будет создан при первом сохранении.
          </p>
        ) : null}
      </header>

      <section className={SECTION_CLASS}>
        <div>
          <label className={LABEL_CLASS}>Заголовок</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => editor.setForm((p) => ({ ...p, title: e.target.value }))}
            className={`${INPUT_CLASS} mt-1`}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Подзаголовок (опционально)</label>
          <input
            type="text"
            value={form.subtitle}
            onChange={(e) => editor.setForm((p) => ({ ...p, subtitle: e.target.value }))}
            className={`${INPUT_CLASS} mt-1`}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>Intro</label>
          <textarea
            value={form.intro}
            onChange={(e) => editor.setForm((p) => ({ ...p, intro: e.target.value }))}
            rows={3}
            className={`${INPUT_CLASS} mt-1`}
          />
        </div>
      </section>

      <section className={SECTION_CLASS}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#2C3E50]">Абзацы</h2>
          <button
            type="button"
            onClick={addParagraph}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
          >
            + Абзац
          </button>
        </div>
        {form.paragraphs.length === 0 ? (
          <p className="text-sm text-[#8A97AB]">Пока нет абзацев.</p>
        ) : (
          <ul className="space-y-2">
            {form.paragraphs.map((p, idx) => (
              <li key={idx} className="flex gap-2">
                <textarea
                  value={p}
                  onChange={(e) => updateParagraph(idx, e.target.value)}
                  rows={3}
                  className={INPUT_CLASS}
                />
                <button
                  type="button"
                  onClick={() => removeParagraph(idx)}
                  className="self-start rounded bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={SECTION_CLASS}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#2C3E50]">Картинки</h2>
            <p className="text-xs text-[#8A97AB]">URL картинки + alt-текст. Подпись — опционально.</p>
          </div>
          <button
            type="button"
            onClick={addImage}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
          >
            + Картинка
          </button>
        </div>
        {form.images.length === 0 ? (
          <p className="text-sm text-[#8A97AB]">Пока нет картинок.</p>
        ) : (
          <ul className="space-y-3">
            {form.images.map((img, idx) => (
              <li key={idx} className="rounded-lg border border-[#E5ECF3] bg-[#FAFCFE] p-3 space-y-2">
                <div className="flex items-start gap-3">
                  {img.src ? (
                    <img
                      src={img.src}
                      alt={img.alt}
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-[#E5ECF3] text-xs text-[#8A97AB]">
                      нет картинки
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <input
                      type="url"
                      value={img.src}
                      onChange={(e) => updateImage(idx, { src: e.target.value })}
                      placeholder="URL картинки (https://…)"
                      className={INPUT_CLASS}
                    />
                    <input
                      type="text"
                      value={img.alt}
                      onChange={(e) => updateImage(idx, { alt: e.target.value })}
                      placeholder="Alt-текст (что на картинке)"
                      className={INPUT_CLASS}
                    />
                    <input
                      type="text"
                      value={img.caption ?? ''}
                      onChange={(e) =>
                        updateImage(idx, { caption: e.target.value || undefined })
                      }
                      placeholder="Подпись (опционально)"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="rounded bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100"
                  >
                    Удалить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={SECTION_CLASS}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#2C3E50]">Кнопка-действие (CTA)</h2>
          <button
            type="button"
            onClick={toggleCta}
            className="rounded-md bg-[#EEF2F7] px-3 py-1.5 text-sm text-[#2C3E50] hover:bg-[#DDE5EE]"
          >
            {ctaEnabled ? 'Убрать кнопку' : '+ Добавить кнопку'}
          </button>
        </div>
        {ctaEnabled && form.cta ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLASS}>Текст</label>
              <input
                type="text"
                value={form.cta.label}
                onChange={(e) => updateCta({ label: e.target.value })}
                className={`${INPUT_CLASS} mt-1`}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Внутренний путь (например, /home)</label>
              <input
                type="text"
                value={form.cta.to ?? ''}
                onChange={(e) =>
                  updateCta({ to: e.target.value || undefined, href: undefined })
                }
                className={`${INPUT_CLASS} mt-1`}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS}>…или внешняя ссылка (https://…)</label>
              <input
                type="url"
                value={form.cta.href ?? ''}
                onChange={(e) =>
                  updateCta({ href: e.target.value || undefined, to: undefined })
                }
                className={`${INPUT_CLASS} mt-1`}
              />
              <p className="mt-1 text-xs text-[#8A97AB]">
                Заполните только одно из двух — внутренний путь или внешнюю ссылку.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#8A97AB]">Кнопки нет.</p>
        )}
      </section>

      {editor.error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {editor.error}
        </div>
      ) : null}

      <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DDE5EE] bg-white p-3">
        <div className="text-xs text-[#8A97AB]">
          {editor.dirty ? 'Есть несохранённые изменения' : 'Без изменений'}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {confirmDelete ? (
            <>
              <span className="text-sm text-rose-700">Точно удалить страницу?</span>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-md bg-[#EEF2F7] px-3 py-2 text-sm text-[#2C3E50] hover:bg-[#DDE5EE]"
              >
                Нет
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={editor.saving}
                className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-40"
              >
                Удалить
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={editor.saving}
              className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100 disabled:opacity-40"
            >
              Удалить страницу
            </button>
          )}
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
