import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Navigate, Link } from 'react-router-dom';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { SuperAdminBadge } from '../components/SuperAdminBadge';
import { SUPER_ADMIN_EMAIL } from '../constants/superAdmin';

function AdminPanel() {
  const [stats, setStats] = useState({
    totalPeriods: 0,
    publishedPeriods: 0,
    totalUsers: 0,
    loading: true,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const periodsSnap = await getDocs(collection(db, 'periods'));
        const totalPeriods = periodsSnap.size;
        const publishedPeriods = periodsSnap.docs.filter((periodDoc) => periodDoc.data().published === true).length;

        const usersSnap = await getDocs(collection(db, 'users'));
        const totalAdmins = usersSnap.docs.filter((userDoc) => {
          const role = userDoc.data().role;
          return role === 'admin' || role === 'super-admin';
        }).length;

        setStats({
          totalPeriods: totalPeriods + 1,
          publishedPeriods: publishedPeriods + 1,
          totalUsers: totalAdmins,
          loading: false,
        });
      } catch (error) {
        console.error('Error loading stats:', error);
        setStats((prev) => ({ ...prev, loading: false }));
      }
    };

    loadStats();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span className="text-3xl" role="img" aria-label="Администратор">
          👑
        </span>
        Панель администратора
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link
          to="/admin"
          className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl p-6 text-white hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
        >
          <div className="relative z-10">
            <div className="text-4xl mb-3">🔧</div>
            <h3 className="text-xl font-bold mb-2">Админ-панель</h3>
            <p className="text-purple-100 text-sm">Управление пользователями и контентом</p>
          </div>
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
        </Link>

        <Link
          to="/admin/content"
          className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-6 text-white hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
        >
          <div className="relative z-10">
            <div className="text-4xl mb-3">📝</div>
            <h3 className="text-xl font-bold mb-2">Редактор контента</h3>
            <p className="text-blue-100 text-sm">Редактирование периодов и материалов</p>
          </div>
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
        </Link>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">📊 Статистика</h3>

        {stats.loading ? (
          <div className="text-center py-8 text-gray-500">Загрузка статистики...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-600">{stats.totalPeriods}</div>
              <div className="text-sm text-blue-800 mt-1">Всего периодов</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-600">{stats.publishedPeriods}</div>
              <div className="text-sm text-green-800 mt-1">Опубликовано</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-600">{stats.totalUsers}</div>
              <div className="text-sm text-purple-800 mt-1">Администраторов</div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <p className="text-sm text-purple-800">
          💡 <strong>Подсказка:</strong> Используйте админ-панель для управления пользователями, а редактор контента — для изменения материалов курса.
        </p>
      </div>
    </div>
  );
}

function StudentPanel() {
  const features = [
    {
      icon: '📝',
      title: 'Мои заметки',
      description: 'Создавайте заметки к каждому периоду и возвращайтесь к ним в любое время',
      color: 'from-blue-500 to-blue-600',
      comingSoon: true,
    },
    {
      icon: '✅',
      title: 'Пройденные тесты',
      description: 'История ваших результатов по тестам и самопроверкам',
      color: 'from-green-500 to-green-600',
      comingSoon: true,
    },
    {
      icon: '📊',
      title: 'Прогресс обучения',
      description: 'Отслеживайте какие периоды вы уже изучили и что осталось',
      color: 'from-purple-500 to-purple-600',
      comingSoon: true,
    },
    {
      icon: '🎯',
      title: 'Цели и планы',
      description: 'Планируйте изучение материала и ставьте личные цели',
      color: 'from-orange-500 to-orange-600',
      comingSoon: true,
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span className="text-3xl" role="img" aria-label="Студент">
          🎓
        </span>
        Панель студента
      </h2>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          👋 <strong>Добро пожаловать!</strong> Здесь появятся инструменты для отслеживания вашего прогресса и работы с материалами курса.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feature, index) => (
          <div
            key={index}
            className="relative group bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-all duration-300 hover:shadow-lg"
          >
            {feature.comingSoon && (
              <div className="absolute top-3 right-3">
                <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                  Скоро
                </span>
              </div>
            )}

            <div
              className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} text-3xl mb-4 shadow-md`}
            >
              {feature.icon}
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
            <p className="text-sm text-gray-600">{feature.description}</p>

            {feature.comingSoon && (
              <div className="absolute inset-0 bg-gray-50/50 rounded-xl backdrop-blur-[1px] cursor-not-allowed" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 border-t pt-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">🚀 Начните обучение</h3>

        <Link
          to="/"
          className="block group bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xl font-bold mb-2">Перейти к материалам курса</h4>
              <p className="text-blue-100 text-sm">Изучайте периоды развития от пренатального до долголетия</p>
            </div>
            <span className="text-4xl group-hover:translate-x-2 transition-transform">→</span>
          </div>
        </Link>
      </div>

      <div className="mt-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200">
        <p className="text-gray-700 italic mb-2">
          "Образование — это самое мощное оружие, которым можно изменить мир."
        </p>
        <p className="text-sm text-gray-600">— Нельсон Мандела</p>
      </div>
    </div>
  );
}

export default function Profile() {
  const [user, loading] = useAuthState(auth);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<'student' | 'admin' | 'super-admin'>('student');
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setCheckingAdmin(false);
        return;
      }

      try {
        const tokenResult = await user.getIdTokenResult(true);
        const claimRole = typeof tokenResult.claims.role === 'string' ? (tokenResult.claims.role as string) : undefined;

        let firestoreRole: string | undefined;
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          firestoreRole = userDoc.data()?.role;
        } catch (firestoreError) {
          console.error('Error reading user role:', firestoreError);
        }

        const resolvedRole = (claimRole ?? firestoreRole ?? (user.email === SUPER_ADMIN_EMAIL ? 'super-admin' : 'student')) as
          | 'student'
          | 'admin'
          | 'super-admin';

        setRole(resolvedRole);
        setIsAdmin(resolvedRole === 'admin' || resolvedRole === 'super-admin');
      } catch (err) {
        console.error('Error checking admin status:', err);
        setIsAdmin(false);
        setRole('student');
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  if (loading || checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const displayName = user.displayName || user.email?.split('@')[0] || 'Пользователь';
  const memberSince = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Неизвестно';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <span className="text-xl mr-2">←</span>
          Вернуться на сайт
        </Link>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-32" />

          <div className="px-8 pb-8">
            <div className="flex items-end -mt-16 mb-6">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={displayName}
                  className="w-32 h-32 rounded-full border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-4xl">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="ml-6 mb-4">
                {role === 'super-admin' ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-semibold text-white shadow">
                    <span className="text-lg" role="img" aria-label="Супер-админ">
                      ⭐
                    </span>
                    Супер-админ
                  </span>
                ) : role === 'admin' ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-800">
                    <span className="text-lg" role="img" aria-label="Администратор">
                      👑
                    </span>
                    Администратор
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-800">
                    <span className="text-lg" role="img" aria-label="Студент">
                      🎓
                    </span>
                    Студент
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{displayName}</h1>
                <SuperAdminBadge />
              </div>
              <div className="flex flex-wrap gap-6 text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="text-xl" role="img" aria-hidden="true">
                    ✉️
                  </span>
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl" role="img" aria-hidden="true">
                    📅
                  </span>
                  <span>С нами с {memberSince}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {isAdmin ? <AdminPanel /> : <StudentPanel />}
        </div>
      </div>
    </div>
  );
}
