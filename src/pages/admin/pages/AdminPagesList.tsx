import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { SITE_NAME } from '../../../routes';
import { useProjectsList } from './useProjectsList';
import { CreateProjectModal } from './CreateProjectModal';

const CARD_CLASS =
  'block rounded-2xl border border-[#DDE5EE] bg-white p-4 transition hover:border-[#2F6DB5] hover:bg-[#F4F9FF]';

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
        ) : projects.items.length === 0 ? (
          <p className="text-sm text-[#8A97AB]">
            Пока нет проектов. Нажмите «+ Новый проект» чтобы создать.
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
