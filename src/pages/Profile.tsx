import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FeaturedCoursesSection,
  GeminiKeySection,
  ProfileOverview,
  ProfileSideNav,
  SearchHistorySection,
  StudyDefaultsSection,
  type ProfileTab,
} from '../components/profile';
import { AchievementsSection } from '../features/achievements';
import { useAuth } from '../auth/AuthProvider';
import { triggerHaptic } from '../lib/haptics';

const TABS: Record<ProfileTab, { title: string; subtitle: string }> = {
  profile: { title: 'Профиль', subtitle: 'Личные данные и настройки обучения' },
  achievements: {
    title: 'Достижения',
    subtitle: 'Наклейки за учёбу. Без рейтингов: только ваш собственный путь.',
  },
  courses: {
    title: 'Курсы на главной',
    subtitle: 'Эти курсы показываются первыми на главной в блоке «Продолжить».',
  },
  study: { title: 'Настройки конспекта', subtitle: 'Как открывается и выглядит режим конспекта.' },
  ai: {
    title: 'AI и ключ Gemini',
    subtitle: 'AI-помощник, поиск по книгам и объяснение фрагментов лекций работают с вашим личным ключом Google Gemini.',
  },
  history: { title: 'История поиска', subtitle: 'Запросы к поиску по сайту, статьям, AI-чату и книгам.' },
};

const isProfileTab = (value: string | null): value is ProfileTab => Boolean(value && value in TABS);

const ROLE_LABELS: Record<string, string> = {
  'super-admin': 'Супер-админ',
  admin: 'Администратор курса',
};

export default function Profile() {
  const { user, loading, userRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: ProfileTab = isProfileTab(tabParam) ? tabParam : 'profile';

  // Неизвестный ?tab= убираем из адреса.
  useEffect(() => {
    if (tabParam && !isProfileTab(tabParam)) {
      setSearchParams({}, { replace: true });
    }
  }, [tabParam, setSearchParams]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-accent" />
          <p className="text-muted">Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 rounded-[22px] border border-border bg-card p-8">
        <h1 className="font-display text-3xl text-ink">Добро пожаловать!</h1>
        <p className="max-w-lg text-muted">
          Зарегистрируйтесь или войдите в аккаунт, чтобы получить доступ к видео-лекциям, заметкам и другим
          материалам курсов.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-medium text-white transition-colors hover:bg-accent-deep"
        >
          Войти / Зарегистрироваться
        </Link>
      </div>
    );
  }

  const displayName = user.displayName || user.email?.split('@')[0] || 'Студент';
  const memberSince = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;
  const roleLabel = ROLE_LABELS[userRole ?? ''] ?? 'Студент';

  const selectTab = (next: ProfileTab) => {
    setSearchParams(next === 'profile' ? {} : { tab: next }, { replace: true });
    window.scrollTo({ top: 0 });
  };

  const handleHapticClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const clickable = target.closest('button, a, summary, [role="button"]') as HTMLElement | null;
    if (!clickable) return;
    if (clickable.getAttribute('aria-disabled') === 'true') return;
    if (clickable instanceof HTMLButtonElement && clickable.disabled) return;
    triggerHaptic();
  };

  return (
    <div
      className="mx-auto max-w-6xl overflow-hidden rounded-[28px] border border-border bg-bg lg:grid lg:grid-cols-[240px_minmax(0,1fr)]"
      onClickCapture={handleHapticClick}
    >
      <ProfileSideNav
        active={tab}
        onSelect={selectTab}
        displayName={displayName}
        roleLabel={roleLabel}
        photoURL={user.photoURL}
      />
      <div className="min-w-0 px-4 py-6 sm:px-6 lg:px-9 lg:py-8">
        <header className="mb-6">
          <h1 className="font-display text-3xl text-ink sm:text-4xl">{TABS[tab].title}</h1>
          <p className="mt-1 text-[13px] text-muted">{TABS[tab].subtitle}</p>
        </header>

        {tab === 'profile' && (
          <ProfileOverview
            displayName={displayName}
            email={user.email}
            memberSince={memberSince}
            roleLabel={roleLabel}
            onSelect={selectTab}
          />
        )}
        {tab === 'achievements' && <AchievementsSection firstName={displayName.split(' ')[0]} />}
        {tab === 'courses' && <FeaturedCoursesSection />}
        {tab === 'study' && <StudyDefaultsSection />}
        {tab === 'ai' && <GeminiKeySection />}
        {tab === 'history' && <SearchHistorySection />}
      </div>
    </div>
  );
}
