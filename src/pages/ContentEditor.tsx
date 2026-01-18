import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Emoji, EmojiText } from '../components/Emoji';

export default function ContentEditor() {
  const { user, isAdmin } = useAuth();

  if (!user || !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <p className="text-red-900">Доступ запрещён. Только для администраторов.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header>
          <h1 className="text-3xl font-bold">
            <EmojiText text="📝 Редактор контента" />
          </h1>
          <p className="mt-2 text-gray-600">
            Здесь собраны все инструменты управления сайтом: добавляйте, изменяйте и публикуйте материалы, управляйте темами для заметок.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <Link
            to="/admin/content"
            className="group rounded-lg border border-gray-200 bg-white p-6 shadow transition hover:shadow-lg"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-2xl">
                <Emoji token="📄" size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 transition group-hover:text-blue-600">
                Управление контентом
              </h2>
            </div>
            <p className="text-gray-600">
              Редактирование периодов развития и вводного занятия. Управление публикациями и статусами материалов.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600">
              Перейти →
            </span>
          </Link>

          <Link
            to="/admin/topics"
            className="group rounded-lg border border-gray-200 bg-white p-6 shadow transition hover:shadow-lg"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-2xl">
                <Emoji token="📚" size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 transition group-hover:text-green-600">
                Темы для заметок
              </h2>
            </div>
            <p className="text-gray-600">
              Управляйте вопросами для размышлений: добавляйте пакетно, редактируйте и удаляйте темы в реальном времени.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-green-600">
              Перейти →
            </span>
          </Link>
        </section>

        <section className="rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h3 className="mb-3 text-lg font-bold text-blue-900">
            <EmojiText text="ℹ️ О редакторе" />
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Изменения синхронизируются с сайтом в реальном времени.</li>
            <li>• Темы для заметок становятся доступны пользователям сразу после сохранения.</li>
            <li>• Управляйте опубликованным контентом и периодами из единого раздела.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
