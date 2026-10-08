import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FeedbackModal } from '../FeedbackModal';
import { LogoutConfirmModal } from '../LogoutConfirmModal';

export type ProfileTab = 'profile' | 'achievements' | 'courses' | 'study' | 'ai' | 'history';

const PATHS: Record<string, ReactNode> = {
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  achievements: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  courses: <><path d="M2 9l10-5 10 5-10 5z" /><path d="M6 11v5c3 2 9 2 12 0v-5" /></>,
  notes: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13 7l4 4" /></>,
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

const ITEMS: { key: ProfileTab | 'notes'; label: string; tint: string; badge?: string }[] = [
  { key: 'profile', label: 'Профиль', tint: 'bg-pastel-plain' },
  { key: 'achievements', label: 'Достижения', tint: 'bg-mark', badge: 'новое' },
  { key: 'courses', label: 'Курсы на главной', tint: 'bg-pastel-ochre' },
  { key: 'notes', label: 'Конспекты', tint: 'bg-pastel-lilac' },
  { key: 'study', label: 'Настройки конспекта', tint: 'bg-pastel-sage' },
  { key: 'ai', label: 'AI и Gemini', tint: 'bg-pastel-blue' },
  { key: 'history', label: 'История поиска', tint: 'bg-pastel-terracotta' },
];

interface ProfileSideNavProps {
  active: ProfileTab;
  onSelect: (tab: ProfileTab) => void;
  displayName: string;
  roleLabel: string;
  photoURL?: string | null;
}

const itemClass = (current: boolean) =>
  `flex shrink-0 items-center gap-2.5 rounded-2xl px-2.5 py-2 text-left text-[13.5px] text-fg transition lg:w-full ${
    current ? 'bg-card font-semibold shadow-sm' : 'hover:bg-white/60'
  }`;

/** Левое меню профиля; на узких экранах — горизонтальная прокручиваемая лента. */
export function ProfileSideNav({ active, onSelect, displayName, roleLabel, photoURL }: ProfileSideNavProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <nav
      aria-label="Разделы профиля"
      className="flex flex-col gap-1 bg-accent-100 px-3 py-3 lg:min-h-[620px] lg:px-3.5 lg:py-6"
    >
      <div className="hidden items-center gap-3 border-b border-border px-2.5 pb-4 lg:mb-3 lg:flex">
        {photoURL ? (
          <img src={photoURL} alt="" className="h-10 w-10 rounded-full" />
        ) : (
          <span className="grid h-10 w-10 place-items-center rounded-full bg-card font-semibold text-ink">
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <b className="block truncate text-sm font-semibold">{displayName}</b>
          <span className="text-xs text-muted">{roleLabel}</span>
        </div>
      </div>

      <div className="-mx-3 flex gap-1 overflow-x-auto px-3 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {ITEMS.map((item) => {
          const content = (
            <>
              <span className={`grid h-[30px] w-[30px] flex-none place-items-center rounded-[10px] text-ink ${item.tint}`}>
                <Icon name={item.key} />
              </span>
              <span className="whitespace-nowrap">{item.label}</span>
              {item.badge && (
                <span className="rounded-md bg-pastel-terracotta px-1.5 py-0.5 text-[10px] font-semibold lg:ml-auto">{item.badge}</span>
              )}
            </>
          );
          if (item.key === 'notes') {
            return (
              <Link key={item.key} to="/notes" className={itemClass(false)}>
                {content}
              </Link>
            );
          }
          const tab = item.key;
          return (
            <button key={tab} type="button" aria-current={active === tab} onClick={() => onSelect(tab)} className={itemClass(active === tab)}>
              {content}
            </button>
          );
        })}
      </div>

      <div className="hidden flex-1 lg:block" />
      <div className="mt-1 flex gap-1 border-t border-border pt-2 lg:flex-col lg:border-0 lg:pt-0">
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
