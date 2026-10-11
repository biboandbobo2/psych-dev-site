import { useEffect } from 'react';
import type { User } from 'firebase/auth';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FeaturedCoursesSection,
  GeminiKeySection,
  ProfileSideNav,
  SearchHistorySection,
  StudyDefaultsSection,
  useProfileStatuses,
  type ProfileNavItem,
  type ProfileTab,
} from '../components/profile';
import { AchievementsSection, useAchievements } from '../features/achievements';
import { useAuth } from '../auth/AuthProvider';
import { triggerHaptic } from '../lib/haptics';
import { pluralizeRu } from './timeline/utils';

const TABS: Record<ProfileTab, { title: string; subtitle?: string }> = {
  achievements: { title: 'Достижения' },
  history: { title: 'История поиска', subtitle: 'Запросы к поиску по сайту, статьям, AI-чату и книгам.' },
  courses: {
    title: 'Курсы на главной',
    subtitle: 'Эти курсы показываются первыми на главной в блоке «Продолжить».',
  },
  study: { title: 'Настройки конспекта', subtitle: 'Как открывается и выглядит режим конспекта.' },
  ai: {
    title: 'AI и ключ Gemini',
    subtitle: 'AI-помощник, поиск по книгам и объяснение фрагментов лекций работают с вашим личным ключом Google Gemini.',
  },
};

const DEFAULT_TAB: ProfileTab = 'achievements';

const isProfileTab = (value: string | null): value is ProfileTab => Boolean(value && value in TABS);

const ROLE_LABELS: Record<string, string> = {
  'super-admin': 'Супер-админ',
  admin: 'Администратор курса',
};

function handleHapticClick(event: React.MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target) return;
  const clickable = target.closest('button, a, summary, [role="button"]') as HTMLElement | null;
  if (!clickable) return;
  if (clickable.getAttribute('aria-disabled') === 'true') return;
  if (clickable instanceof HTMLButtonElement && clickable.disabled) return;
  triggerHaptic();
}

function ProfileContent({ user, userRole }: { user: User; userRole: string | null }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: ProfileTab = isProfileTab(tabParam) ? tabParam : DEFAULT_TAB;
  const achievements = useAchievements();
  const statuses = useProfileStatuses();

  // Неизвестный ?tab= (в том числе старый ?tab=profile) убираем из адреса.
  useEffect(() => {
    if (tabParam && !isProfileTab(tabParam)) {
      setSearchParams({}, { replace: true });
    }
  }, [tabParam, setSearchParams]);

  const displayName = user.displayName || user.email?.split('@')[0] || 'Студент';
  const memberSince = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;
  const roleLabel = ROLE_LABELS[userRole ?? ''] ?? 'Студент';
  const result = achievements.result;

  const groups: { title: string; items: ProfileNavItem[] }[] = [
    {
      title: 'Учёба',
      items: [
        {
          key: 'achievements',
          label: 'Достижения',
          shortLabel: 'Достижения',
          tint: 'bg-mark',
          status: result ? `Уровень ${result.level} · ${result.gotCount} ${pluralizeRu(result.gotCount, ['наклейка', 'наклейки', 'наклеек'])}` : null,
        },
        { key: 'history', label: 'История поиска', shortLabel: 'История поиска', tint: 'bg-pastel-terracotta', status: statuses.history },
      ],
    },
    {
      title: 'Настройки',
      items: [
        { key: 'courses', label: 'Курсы на главной', shortLabel: 'Курсы', tint: 'bg-pastel-ochre', status: statuses.courses },
        { key: 'study', label: 'Настройки конспекта', shortLabel: 'Конспект', tint: 'bg-pastel-sage', status: statuses.study },
        {
          key: 'ai',
          label: 'AI и Gemini',
          shortLabel: 'AI',
          tint: 'bg-pastel-blue',
          status: statuses.aiConnected ? 'Ключ подключён' : 'Нет ключа',
          warning: !statuses.aiConnected,
        },
      ],
    },
  ];

  const selectTab = (next: ProfileTab) => {
    setSearchParams(next === DEFAULT_TAB ? {} : { tab: next }, { replace: true });
    window.scrollTo({ top: 0 });
  };

  return (
    <div
      className="mx-auto max-w-6xl overflow-hidden rounded-[28px] border border-border bg-bg lg:grid lg:grid-cols-[260px_minmax(0,1fr)]"
      onClickCapture={handleHapticClick}
    >
      <ProfileSideNav
        groups={groups}
        active={tab}
        onSelect={selectTab}
        displayName={displayName}
        roleLabel={roleLabel}
        photoURL={user.photoURL}
        email={user.email}
        memberSince={memberSince}
      />
      <div className="min-w-0 px-4 py-6 sm:px-6 lg:px-9 lg:py-8">
        <header className="mb-6">
          <h1 className="font-display text-3xl text-ink sm:text-4xl">{TABS[tab].title}</h1>
          {TABS[tab].subtitle && <p className="mt-1 text-[13px] text-muted">{TABS[tab].subtitle}</p>}
        </header>

        {tab === 'achievements' && <AchievementsSection result={result} loading={achievements.loading} />}
        {tab === 'history' && <SearchHistorySection />}
        {tab === 'courses' && <FeaturedCoursesSection />}
        {tab === 'study' && <StudyDefaultsSection />}
        {tab === 'ai' && <GeminiKeySection />}
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, loading, userRole } = useAuth();

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

  return <ProfileContent user={user} userRole={userRole ?? null} />;
}
