import { useState, type ReactNode } from 'react';
import { FeedbackModal } from '../FeedbackModal';
import { LogoutConfirmModal } from '../LogoutConfirmModal';

export type ProfileTab = 'achievements' | 'history' | 'courses' | 'study' | 'ai';

const PATHS: Record<string, ReactNode> = {
  achievements: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  courses: <><path d="M2 9l10-5 10 5-10 5z" /><path d="M6 11v5c3 2 9 2 12 0v-5" /></>,
  study: <><path d="M4 6h16M4 12h10M4 18h7" /><circle cx="18" cy="16" r="3" /></>,
  ai: <><circle cx="7" cy="16" r="3.5" /><path d="M9.5 13.5L20 3M16 7l3 3" /></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
  feedback: <path d="M4 5h16v11H9l-5 4z" />,
  logout: <><path d="M10 4H5v16h5" /><path d="M14 8l4 4-4 4M18 12H9" /></>,
};

function Icon({ name }: { name: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[name]}
    </svg>
  );
}

export interface ProfileNavItem {
  key: ProfileTab;
  /** Полное название (desktop) и короткое — для кнопки на телефоне. */
  label: string;
  shortLabel: string;
  tint: string;
  status?: string | null;
  /** Статус-предупреждение (рыжий): например, нет ключа Gemini. */
  warning?: boolean;
}

interface ProfileSideNavProps {
  groups: { title: string; items: ProfileNavItem[] }[];
  active: ProfileTab;
  onSelect: (tab: ProfileTab) => void;
  displayName: string;
  roleLabel: string;
  photoURL?: string | null;
  email: string | null;
  memberSince: string | null;
}

function NavButton({ item, current, onSelect }: { item: ProfileNavItem; current: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      aria-current={current}
      onClick={onSelect}
      className={`rounded-full border px-3.5 py-2 text-[13px] text-left transition lg:flex lg:w-full lg:items-center lg:gap-2.5 lg:rounded-2xl lg:border-0 lg:px-2.5 ${
        current
          ? 'border-ink bg-ink font-semibold text-white lg:bg-card lg:text-fg lg:shadow-sm'
          : item.warning
            ? 'border-[#F2C7A8] bg-card font-semibold text-[#9A3412] lg:bg-transparent lg:font-normal lg:text-fg lg:hover:bg-white/60'
            : 'border-[#D5E3D6] bg-card text-fg lg:bg-transparent lg:hover:bg-white/60'
      }`}
    >
      <span className={`hidden h-[30px] w-[30px] flex-none place-items-center rounded-[10px] text-ink lg:grid ${item.tint}`}>
        <Icon name={item.key} />
      </span>
      <span className="lg:flex lg:flex-col">
        <span className="lg:hidden">
          {item.shortLabel}
          {item.warning && item.status ? ` · ${item.status.toLowerCase()}` : ''}
        </span>
        <span className={`hidden text-[13.5px] lg:inline ${current ? 'font-semibold' : ''}`}>{item.label}</span>
        {item.status && (
          <small className={`hidden text-[11.5px] lg:inline ${item.warning ? 'font-semibold text-[#9A3412]' : current ? 'text-accent-muted' : 'text-muted'}`}>
            {item.status}
          </small>
        )}
      </span>
    </button>
  );
}

/**
 * Меню профиля: на desktop — левая колонка с группами и статусами,
 * на телефоне — карточка с рубриками и кнопками-«таблетками».
 */
export function ProfileSideNav({ groups, active, onSelect, displayName, roleLabel, photoURL, email, memberSince }: ProfileSideNavProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <nav
      aria-label="Разделы профиля"
      className="m-3 flex flex-col gap-3 rounded-[22px] bg-accent-100 p-3.5 lg:m-0 lg:min-h-[620px] lg:gap-1 lg:rounded-none lg:px-3.5 lg:py-6"
    >
      <div className="flex items-center gap-3 lg:px-2.5">
        {photoURL ? (
          <img src={photoURL} alt="" className="h-10 w-10 rounded-full lg:h-11 lg:w-11" />
        ) : (
          <span className="grid h-10 w-10 place-items-center rounded-full bg-card font-semibold text-ink lg:h-11 lg:w-11">
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <b className="block truncate text-sm font-semibold">{displayName}</b>
          <span className="text-xs text-muted">{roleLabel}</span>
        </div>
      </div>
      <div className="hidden border-b border-[#D5E3D6] px-2.5 pb-4 pt-2.5 text-xs leading-relaxed text-muted lg:block">
        {email && <div className="break-words">{email}</div>}
        {memberSince && <div>На платформе с {memberSince}</div>}
      </div>

      <div className="flex flex-col gap-3 border-t border-[#D5E3D6] pt-3 lg:gap-1 lg:border-0 lg:pt-0">
        {groups.map((group) => (
          <div key={group.title} className="flex flex-col gap-1.5 lg:gap-1">
            <span className="text-xs font-bold text-accent-muted lg:px-2.5 lg:pb-1.5 lg:pt-4 lg:text-[10.5px] lg:uppercase lg:tracking-[0.14em]">
              {group.title}
            </span>
            <div className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-1">
              {group.items.map((item) => (
                <NavButton key={item.key} item={item} current={active === item.key} onSelect={() => onSelect(item.key)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden flex-1 lg:block" />
      <div className="flex gap-1 border-t border-[#D5E3D6] pt-2 lg:flex-col lg:pt-2.5">
        <button type="button" onClick={() => setFeedbackOpen(true)} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] hover:bg-white/60">
          <Icon name="feedback" /> Обратная связь
        </button>
        <button type="button" onClick={() => setLogoutOpen(true)} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] hover:bg-white/60">
          <Icon name="logout" /> Выйти
        </button>
      </div>

      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <LogoutConfirmModal isOpen={logoutOpen} onClose={() => setLogoutOpen(false)} />
    </nav>
  );
}
