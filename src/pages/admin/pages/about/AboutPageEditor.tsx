import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { SITE_NAME } from '../../../../routes';
import { PageLoader } from '../../../../components/ui';
import { useAboutPageEditor } from './useAboutPageEditor';
import { TextTabEditor } from './TextTabEditor';
import { PlaceholderTabEditor } from './PlaceholderTabEditor';
import { OfflineTabEditor } from './OfflineTabEditor';
import { PartnersTabEditor } from './PartnersTabEditor';

export default function AboutPageEditor() {
  const editor = useAboutPageEditor();
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);

  if (editor.loading) {
    return <PageLoader />;
  }

  const activeTab = editor.form.tabs[activeIndex];

  const handleSave = async () => {
    const ok = await editor.save();
    if (ok) {
      navigate('/superadmin/pages');
    }
  };

  const renderTabEditor = () => {
    if (!activeTab) return null;
    switch (activeTab.kind) {
      case 'text':
        return (
          <TextTabEditor
            tab={activeTab}
            onChange={(patch) => editor.updateTab(activeIndex, patch)}
          />
        );
      case 'placeholder':
        return (
          <PlaceholderTabEditor
            tab={activeTab}
            onChange={(patch) => editor.updateTab(activeIndex, patch)}
          />
        );
      case 'offline':
        return (
          <OfflineTabEditor
            tab={activeTab}
            onChange={(patch) => editor.updateTab(activeIndex, patch)}
          />
        );
      case 'partners':
        return (
          <PartnersTabEditor
            tab={activeTab}
            partners={editor.form.partners}
            onTabChange={(patch) => editor.updateTab(activeIndex, patch)}
            onPartnersChange={editor.setPartners}
          />
        );
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <Helmet>
        <title>Редактор «О нас» — {SITE_NAME}</title>
      </Helmet>

      <header className="space-y-1">
        <Link to="/superadmin/pages" className="text-sm text-[#2F6DB5] hover:underline">
          ← К списку страниц
        </Link>
        <h1 className="text-2xl font-bold text-[#2C3E50] sm:text-3xl">📝 Редактор «О нас»</h1>
        <p className="text-sm text-[#556476]">
          Контент страницы{' '}
          <Link to="/about" className="text-[#2F6DB5] underline">
            /about
          </Link>
          . Структура вкладок зафиксирована — редактируется только содержимое.
        </p>
      </header>

      <div className="rounded-2xl border border-[#DDE5EE] bg-white p-2">
        <nav role="tablist" className="flex flex-wrap gap-1">
          {editor.form.tabs.map((tab, idx) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeIndex === idx}
              onClick={() => setActiveIndex(idx)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                activeIndex === idx
                  ? 'bg-[#2F6DB5] text-white'
                  : 'text-[#2C3E50] hover:bg-[#EEF2F7]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <section className="rounded-2xl border border-[#DDE5EE] bg-white p-5 space-y-4">
        {activeTab ? (
          <>
            <div className="text-xs font-semibold uppercase tracking-wide text-[#8A97AB]">
              Тип вкладки: {activeTab.kind} · ID: <span className="font-mono">{activeTab.id}</span>
            </div>
            {renderTabEditor()}
          </>
        ) : null}
      </section>

      {editor.error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {editor.error}
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
