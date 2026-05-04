import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { SITE_NAME } from '../routes';

const CARD_CLASS =
  'block rounded-2xl border border-[#DDE5EE] bg-white p-5 transition hover:border-[#2F6DB5] hover:bg-[#F4F9FF]';

export default function CoAdmin() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Helmet>
        <title>Со-админ — {SITE_NAME}</title>
      </Helmet>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2C3E50] sm:text-3xl">
            Панель со-админа
          </h1>
          <p className="text-sm text-[#556476]">
            Редактирование страниц DOM Academy.
          </p>
        </div>
        <div className="text-sm text-[#8A97AB]">{user?.email}</div>
      </header>

      <section className="space-y-3">
        <Link to="/superadmin/pages" className={CARD_CLASS}>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-[#2C3E50]">📝 Страницы</div>
              <div className="text-xs text-[#556476]">
                «О нас» и страницы проектов академии (/about, /projects/:slug)
              </div>
            </div>
            <span className="text-xl text-[#2F6DB5]">→</span>
          </div>
        </Link>
      </section>
    </div>
  );
}
