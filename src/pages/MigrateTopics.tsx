import { useState } from 'react';
import { migrateTopicsToFirestore } from '../scripts/migrateTopics';
import { useAuth } from '../auth/AuthProvider';
import { debugError } from '../lib/debug';

export default function MigrateTopics() {
  const { user, isSuperAdmin } = useAuth();
  const [migrating, setMigrating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMigrate = async () => {
    if (!confirm('Запустить миграцию тем в Firestore?')) return;

    setMigrating(true);
    setError(null);

    try {
      await migrateTopicsToFirestore();
      setSuccess(true);
      alert('✅ Миграция завершена успешно!');
    } catch (err) {
      debugError(err);
      setError(err instanceof Error ? err.message : 'Ошибка миграции');
      alert('❌ Ошибка миграции');
    } finally {
      setMigrating(false);
    }
  };

  if (!user || !isSuperAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <p className="text-red-900">Доступ запрещён. Только для super-admin.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-3xl font-bold">Миграция тем в Firestore</h1>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h2 className="mb-4 text-xl font-bold text-blue-900">Что сделает миграция:</h2>
          <ul className="mb-6 space-y-2 text-blue-800">
            <li>✅ Перенесёт 18 тем для возраста 7-10 лет в Firestore</li>
            <li>✅ Создаст коллекцию "topics"</li>
            <li>✅ Каждая тема получит ID и порядковый номер</li>
            <li>⚠️ Запускать только один раз!</li>
          </ul>

          {success && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="font-bold text-green-900">✅ Миграция завершена!</p>
              <p className="text-sm text-green-800">Теперь можно удалить эту страницу и файл миграции.</p>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="font-bold text-red-900">❌ Ошибка:</p>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            onClick={handleMigrate}
            disabled={migrating || success}
            className="rounded-md bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {migrating ? 'Миграция...' : success ? 'Миграция завершена' : '🚀 Запустить миграцию'}
          </button>
        </div>
      </div>
    </div>
  );
}
