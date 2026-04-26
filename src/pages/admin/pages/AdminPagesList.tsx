import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { SITE_NAME } from '../../../routes';
import { useProjectsList } from './useProjectsList';
import { CreateProjectModal } from './CreateProjectModal';

const CARD_CLASS =
  'block rounded-2xl border border-[#DDE5EE] bg-white p-4 transition hover:border-[#2F6DB5] hover:bg-[#F4F9FF]';
const STATIC_CARD_CLASS =
  'block rounded-2xl border border-dashed border-[#DDE5EE] bg-[#FAFBFD] p-4 transition hover:bg-white';

interface StaticProject {
  title: string;
  url: string;
  note: string;
}

const STATIC_PROJECTS: StaticProject[] = [
  {
    title: 'Тёплые ключи 2',
    url: '/warm_springs2',
    note: 'Статическая страница — собрана не через шаблон ProjectPage, в админке не редактируется.',
  },
];

export default function AdminPagesList() {
  const navigate = useNavigate();
  const projects = useProjectsList();
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <Helmet>
        <title>Редактор страниц — {SITE_NAME}</title>
      </Helmet>

      <header className="space-y-1">
        <Link to="/superadmin" className="text-sm text-[#2F6DB5] hover:underline">
          ← В супер-админку
        </Link>
        <h1 className="text-2xl font-bold text-[#2C3E50] sm:text-3xl">📝 Редактор страниц</h1>
        <p className="text-sm text-[#556476]">
          Контент статических страниц сайта. Хранится в Firestore (коллекции{' '}
          <span className="font-mono">pages</span> и{' '}
          <span className="font-mono">projectPages</span>).
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-[#2C3E50]">Главные страницы</h2>
        <Link to="/superadmin/pages/about" className={CARD_CLASS}>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-[#2C3E50]">О нас</div>
              <div className="text-xs text-[#556476]">
                /about — 6 вкладок: проект, команды, история, офлайн-центр, партнёры
              </div>
            </div>
            <span className="text-xl text-[#2F6DB5]">→</span>
          </div>
        </Link>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#2C3E50]">Страницы проектов</h2>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
          >
            + Новый проект
          </button>
        </div>

        {projects.loading ? (
          <p className="text-sm text-[#8A97AB]">Загружаем…</p>
        ) : projects.error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {projects.error}
          </p>
        ) : (
          <ul className="space-y-2">
            {projects.items.map((item) => (
              <li key={item.slug}>
                <Link to={`/superadmin/pages/projects/${item.slug}`} className={CARD_CLASS}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[#2C3E50]">{item.title}</div>
                      <div className="text-xs text-[#556476]">
                        /projects/<span className="font-mono">{item.slug}</span>
                      </div>
                    </div>
                    <span className="text-xl text-[#2F6DB5]">→</span>
                  </div>
                </Link>
              </li>
            ))}
            {STATIC_PROJECTS.map((item) => (
              <li key={item.url}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={STATIC_CARD_CLASS}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-[#2C3E50]">
                        {item.title}{' '}
                        <span className="ml-1 rounded bg-[#EEF2F7] px-1.5 py-0.5 text-xs font-normal text-[#556476]">
                          без редактирования
                        </span>
                      </div>
                      <div className="text-xs text-[#556476]">
                        <span className="font-mono">{item.url}</span> — {item.note}
                      </div>
                    </div>
                    <span className="text-sm text-[#8A97AB]">↗</span>
                  </div>
                </a>
              </li>
            ))}
            {projects.items.length === 0 ? (
              <li className="text-sm text-[#8A97AB]">
                Динамических проектов ещё нет. Нажмите «+ Новый проект» чтобы создать.
              </li>
            ) : null}
          </ul>
        )}
      </section>

      <CreateProjectModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(slug) => {
          setShowCreateModal(false);
          navigate(`/superadmin/pages/projects/${slug}`);
        }}
      />
    </div>
  );
}
