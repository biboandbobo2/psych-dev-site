import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { ProfileTab } from './ProfileSideNav';

interface ProfileOverviewProps {
  displayName: string;
  email: string | null;
  memberSince: string | null;
  roleLabel: string;
  onSelect: (tab: ProfileTab) => void;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,130px)_minmax(0,1fr)] gap-3 border-t border-border py-3 text-sm sm:grid-cols-[170px_minmax(0,1fr)]">
      <span className="text-muted">{label}</span>
      <span className="break-words text-fg">{children}</span>
    </div>
  );
}

const quickCardClass =
  'flex w-full items-center justify-between gap-3 rounded-2xl bg-accent-100 px-4 py-3 text-left text-fg transition hover:brightness-[0.97]';

export function ProfileOverview({ displayName, email, memberSince, roleLabel, onSelect }: ProfileOverviewProps) {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="rounded-[22px] border border-border bg-card p-5 sm:p-6">
        <h2 className="font-display text-2xl text-ink">Личные данные</h2>
        <p className="mb-3 mt-1 text-xs text-muted">Имя и фото приходят из вашего аккаунта Google.</p>
        <Row label="Имя">{displayName}</Row>
        {email && <Row label="Электронная почта">{email}</Row>}
        {memberSince && <Row label="На платформе">с {memberSince}</Row>}
        <Row label="Роль">{roleLabel}</Row>
      </section>

      <section className="rounded-[22px] border border-border bg-card p-5">
        <h2 className="font-display text-2xl text-ink">Настройки</h2>
        <p className="mb-4 mt-1 text-xs text-muted">Быстрый переход к важным разделам.</p>
        <div className="flex flex-col gap-2.5">
          <button type="button" className={quickCardClass} onClick={() => onSelect('achievements')}>
            <span>
              <b className="block text-sm font-semibold">Достижения</b>
              <small className="text-xs text-muted">Наклейки и уровень за учёбу</small>
            </span>
            <span aria-hidden>→</span>
          </button>
          <button type="button" className={quickCardClass} onClick={() => onSelect('ai')}>
            <span>
              <b className="block text-sm font-semibold">AI и ключ Gemini</b>
              <small className="text-xs text-muted">Подключить или проверить личный ключ</small>
            </span>
            <span aria-hidden>→</span>
          </button>
          <Link to="/notes" className={quickCardClass}>
            <span>
              <b className="block text-sm font-semibold">Конспекты</b>
              <small className="text-xs text-muted">Другим студентам не видны, пока вы не поделитесь</small>
            </span>
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
