import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { SITE_NAME } from '../../routes';

export default function AdminAnnouncements() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <Helmet>
        <title>Кабинет объявлений — {SITE_NAME}</title>
      </Helmet>

      <Link to="/admin/content" className="text-sm text-[#2F6DB5] hover:underline">
        ← К управлению контентом
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-[#2C3E50] sm:text-3xl">📢 Кабинет объявлений</h1>
        <p className="mt-1 text-sm text-[#556476]">
          Объявления и события для групп студентов и общие анонсы на главной.
        </p>
      </header>

      <section className="rounded-2xl border border-dashed border-[#DDE5EE] bg-[#F9FBFF] p-5">
        <h2 className="text-lg font-semibold text-[#2C3E50]">Скоро здесь</h2>
        <ul className="mt-2 list-inside list-disc text-sm text-[#556476] space-y-1">
          <li>Создание объявлений для всех студентов или для конкретных групп.</li>
          <li>Календарь событий с Zoom-ссылками для групп.</li>
          <li>Просмотр опубликованных и запланированных объявлений.</li>
        </ul>
        <p className="mt-3 text-xs text-[#8A97AB]">
          Реализация в ближайших шагах (после системы групп).
        </p>
      </section>
    </div>
  );
}
