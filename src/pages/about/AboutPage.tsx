import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { type AboutTab } from './aboutContent';
import type { Partner } from './partnersContent';
import { useAboutPageContent } from '../../hooks/useAboutPageContent';

const TAB_QUERY_KEY = 'tab';

function isValidTabId(
  id: string | null | undefined,
  tabs: AboutTab[]
): id is string {
  if (!id) return false;
  return tabs.some((tab) => tab.id === id);
}

function PlaceholderTab({ tab }: { tab: Extract<AboutTab, { kind: 'placeholder' }> }) {
  return (
    <div className="space-y-4">
      <p className="text-base text-fg/90">{tab.intro}</p>
      <div className="rounded-2xl border border-dashed border-border bg-card2 px-5 py-6 text-sm text-muted">
        {tab.note ?? 'Информация скоро появится.'}
      </div>
    </div>
  );
}

function TextTab({ tab }: { tab: Extract<AboutTab, { kind: 'text' }> }) {
  return (
    <div className="space-y-6">
      {tab.intro ? <p className="text-base text-fg/90">{tab.intro}</p> : null}
      {tab.sections.map((section, idx) => (
        <section key={section.heading ?? idx} className="space-y-2">
          {section.heading ? (
            <h3 className="text-lg font-semibold text-fg">{section.heading}</h3>
          ) : null}
          {section.paragraphs.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-fg/85">
              {p}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}

function OfflineTab({ tab }: { tab: Extract<AboutTab, { kind: 'offline' }> }) {
  return (
    <div className="space-y-5">
      <p className="text-base font-medium text-fg">{tab.intro}</p>
      {tab.paragraphs.map((p, i) => (
        <p key={i} className="text-sm leading-relaxed text-fg/85">
          {p}
        </p>
      ))}
      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          to={tab.bookingPath}
          className="inline-flex items-center rounded-2xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {tab.bookingLabel}
        </Link>
        <a
          href={tab.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-2xl border border-border bg-card2 px-4 py-2 text-sm font-semibold text-fg transition hover:bg-card"
        >
          {tab.instagramLabel} ↗
        </a>
      </div>
    </div>
  );
}

function PartnersTab({
  tab,
  partners,
}: {
  tab: Extract<AboutTab, { kind: 'partners' }>;
  partners: Partner[];
}) {
  return (
    <div className="space-y-5">
      <p className="text-base text-fg/90">{tab.intro}</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {partners.map((partner) => (
          <article
            key={partner.id}
            className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-brand"
          >
            <h3 className="text-lg font-semibold text-fg">{partner.name}</h3>
            <div className="mt-2 space-y-2">
              {partner.description.map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-fg/85">
                  {p}
                </p>
              ))}
            </div>
            <a
              href={partner.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto pt-3 text-sm font-semibold text-accent hover:underline"
            >
              Сайт партнёра ↗
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}

function TabContent({ tab, partners }: { tab: AboutTab; partners: Partner[] }) {
  switch (tab.kind) {
    case 'text':
      return <TextTab tab={tab} />;
    case 'placeholder':
      return <PlaceholderTab tab={tab} />;
    case 'offline':
      return <OfflineTab tab={tab} />;
    case 'partners':
      return <PartnersTab tab={tab} partners={partners} />;
  }
}

export default function AboutPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { content } = useAboutPageContent();
  const tabs = content.tabs;
  const partners = content.partners;
  const defaultTabId = tabs[0]?.id ?? '';

  const initialTabId = useMemo(() => {
    const fromUrl = searchParams.get(TAB_QUERY_KEY);
    return isValidTabId(fromUrl, tabs) ? fromUrl : defaultTabId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [activeId, setActiveId] = useState<string>(initialTabId);

  // Синхронизация state -> URL (без истории, чтобы кнопка «назад» не ломалась)
  useEffect(() => {
    const fromUrl = searchParams.get(TAB_QUERY_KEY);
    if (fromUrl === activeId) return;
    const next = new URLSearchParams(searchParams);
    if (activeId === defaultTabId) {
      next.delete(TAB_QUERY_KEY);
    } else {
      next.set(TAB_QUERY_KEY, activeId);
    }
    setSearchParams(next, { replace: true });
  }, [activeId, defaultTabId, searchParams, setSearchParams]);

  // Синхронизация URL -> state при ручном переходе (back/forward)
  useEffect(() => {
    const fromUrl = searchParams.get(TAB_QUERY_KEY);
    const target = isValidTabId(fromUrl, tabs) ? fromUrl : defaultTabId;
    if (target !== activeId) {
      setActiveId(target);
    }
  }, [searchParams, activeId, tabs, defaultTabId]);

  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  if (!activeTab) {
    return null;
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <Helmet>
        <title>О нас — DOM Academy</title>
        <meta
          name="description"
          content="DOM Academy: проект, команда, история, офлайн-центр Dom в Тбилиси и партнёры."
        />
      </Helmet>

      <div className="mx-auto max-w-[1100px] px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-3xl font-bold sm:text-4xl">О нас</h1>
          <p className="mt-2 max-w-measure text-sm text-muted sm:text-base">
            DOM Academy — образовательная платформа по психологии. Здесь — про сам проект,
            команду, историю, офлайн-центр и партнёров.
          </p>
        </header>

        {/* Десктоп: горизонтальные табы */}
        <div className="hidden md:block">
          <div role="tablist" aria-label="Разделы страницы" className="mb-6 flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const isActive = tab.id === activeId;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`about-panel-${tab.id}`}
                  id={`about-tab-${tab.id}`}
                  onClick={() => setActiveId(tab.id)}
                  className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'border-accent bg-accent-100 text-fg'
                      : 'border-border bg-card text-fg/80 hover:bg-card2'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <section
            role="tabpanel"
            id={`about-panel-${activeTab.id}`}
            aria-labelledby={`about-tab-${activeTab.id}`}
            className="rounded-2xl border border-border bg-card p-6 shadow-brand sm:p-8"
          >
            <h2 className="mb-4 text-2xl font-semibold">{activeTab.label}</h2>
            <TabContent tab={activeTab} partners={partners} />
          </section>
        </div>

        {/* Мобильный: details-аккордеон */}
        <div className="space-y-3 md:hidden">
          {tabs.map((tab) => (
            <details
              key={tab.id}
              open={tab.id === activeId}
              className="group rounded-2xl border border-border bg-card shadow-brand"
              onToggle={(e) => {
                if ((e.target as HTMLDetailsElement).open) {
                  setActiveId(tab.id);
                }
              }}
            >
              <summary className="cursor-pointer list-none rounded-2xl px-5 py-4 text-base font-semibold text-fg">
                <span className="flex items-center justify-between gap-2">
                  <span>{tab.label}</span>
                  <span
                    aria-hidden
                    className="text-muted transition group-open:rotate-180"
                  >
                    ▾
                  </span>
                </span>
              </summary>
              <div className="border-t border-border px-5 py-4">
                <TabContent tab={tab} partners={partners} />
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
