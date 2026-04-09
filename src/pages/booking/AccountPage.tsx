import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuthStore } from '../../stores/useAuthStore';
import { BookingLayout } from './BookingLayout';
import { useBookingAuth } from './useBookingAuth';
import { debugError, debugLog } from '../../lib/debug';

interface BookingRecord {
  id: number;
  datetime: string;
  length: number;
  deleted: boolean;
  services: { id: number; title: string }[];
  staff: { id: number; name: string };
  visit_attendance: number;
}

const MONTH_LABELS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH_LABELS[d.getMonth()]}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function durationLabel(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h && m) return `${h}ч ${m}мин`;
  if (h) return `${h}ч`;
  return `${m}мин`;
}

/** Cancel allowed until 21:00 the day before the booking */
function canCancel(bookingDatetime: string): boolean {
  const booking = new Date(bookingDatetime);
  const deadline = new Date(booking);
  deadline.setDate(deadline.getDate() - 1);
  deadline.setHours(21, 0, 0, 0);
  return Date.now() < deadline.getTime();
}

function cancelDeadlineLabel(bookingDatetime: string): string {
  const booking = new Date(bookingDatetime);
  const deadline = new Date(booking);
  deadline.setDate(deadline.getDate() - 1);
  return `до ${deadline.getDate()} ${MONTH_LABELS[deadline.getMonth()]} 21:00`;
}

export function AccountPage() {
  const user = useAuthStore((state) => state.user);
  const { altegClientIds, loading: authLoading } = useBookingAuth();
  const [records, setRecords] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<number | null>(null);

  useEffect(() => {
    if (!altegClientIds.length) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/booking?action=clientRecords&clientIds=${altegClientIds.join(',')}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.success) setRecords(json.data || []);
      })
      .catch((err) => debugError('[Account] Load records error:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [altegClientIds]);

  const handleCancel = useCallback(async (recordId: number) => {
    setCancelling(recordId);
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancelRecord', recordId }),
      }).then((r) => r.json());
      if (res.success) {
        setRecords((prev) => prev.map((r) => r.id === recordId ? { ...r, deleted: true } : r));
        debugLog('[Account] Cancelled record:', recordId);
      } else {
        debugError('[Account] Cancel failed:', res.error);
      }
    } catch (err) {
      debugError('[Account] Cancel error:', err);
    } finally {
      setCancelling(null);
      setConfirmCancel(null);
    }
  }, []);

  const now = new Date();
  const upcoming = records
    .filter((r) => !r.deleted && new Date(r.datetime) >= now)
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  const past = records
    .filter((r) => !r.deleted && new Date(r.datetime) < now)
    .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

  return (
    <BookingLayout>
      <Helmet>
        <title>Мои бронирования — Психологический центр ДОМ</title>
      </Helmet>

      <div className="max-w-[800px] mx-auto px-4 md:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-dom-gray-900">Мои бронирования</h1>
          <a href="/booking" className="px-4 py-2 bg-dom-green hover:bg-dom-green-hover text-white rounded-xl text-sm font-medium transition-all">
            Забронировать
          </a>
        </div>

        {!user ? (
          <div className="text-center py-16">
            <p className="text-dom-gray-500 text-lg">Войдите чтобы увидеть свои бронирования</p>
          </div>
        ) : authLoading || loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-dom-gray-200 animate-pulse" />
            ))}
          </div>
        ) : !altegClientIds.length ? (
          <div className="text-center py-16">
            <p className="text-dom-gray-500 text-lg">У вас пока нет бронирований</p>
          </div>
        ) : (
          <>
            {/* Upcoming */}
            <section className="mb-12">
              <h2 className="text-lg font-semibold text-dom-gray-900 mb-4">
                Предстоящие
                {upcoming.length > 0 && <span className="ml-2 text-sm font-normal text-dom-gray-500">({upcoming.length})</span>}
              </h2>
              {upcoming.length === 0 ? (
                <p className="text-dom-gray-500 text-sm">Нет предстоящих бронирований</p>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((r) => {
                    const cancelable = canCancel(r.datetime);
                    const isConfirming = confirmCancel === r.id;
                    const isCancelling = cancelling === r.id;
                    return (
                      <div key={r.id} className="bg-dom-cream rounded-xl p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-dom-gray-900">
                              {r.staff?.name || 'Кабинет'}
                            </p>
                            <p className="text-sm text-dom-gray-500 mt-0.5">
                              {formatDate(r.datetime)} в {formatTime(r.datetime)} &middot; {durationLabel(r.length)}
                            </p>
                            <p className="text-xs text-dom-gray-500 mt-0.5">
                              {r.services?.map((s) => s.title).join(', ')}
                            </p>
                          </div>
                          <div className="flex-shrink-0 ml-3 flex flex-col items-end gap-2">
                            <span className="text-xs bg-dom-green/10 text-dom-green px-3 py-1 rounded-full font-medium">
                              Подтверждено
                            </span>
                            {cancelable && !isConfirming && (
                              <button
                                onClick={() => setConfirmCancel(r.id)}
                                className="text-xs text-dom-gray-500 hover:text-dom-red transition-colors"
                              >
                                Отменить
                              </button>
                            )}
                            {!cancelable && (
                              <span className="text-xs text-dom-gray-300" title={`Отмена была возможна ${cancelDeadlineLabel(r.datetime)}`}>
                                Отмена недоступна
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Confirm cancel */}
                        {isConfirming && (
                          <div className="mt-3 pt-3 border-t border-dom-gray-200/60 flex items-center justify-between">
                            <p className="text-sm text-dom-gray-700">Отменить бронирование?</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setConfirmCancel(null)}
                                disabled={isCancelling}
                                className="px-3 py-1.5 text-xs rounded-lg border border-dom-gray-200 text-dom-gray-700 hover:bg-white transition-all"
                              >
                                Нет
                              </button>
                              <button
                                onClick={() => handleCancel(r.id)}
                                disabled={isCancelling}
                                className="px-3 py-1.5 text-xs rounded-lg bg-dom-red hover:bg-dom-red-hover text-white font-medium transition-all disabled:opacity-50"
                              >
                                {isCancelling ? 'Отмена...' : 'Да, отменить'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Past */}
            {past.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-dom-gray-900 mb-4">
                  Прошлые
                  <span className="ml-2 text-sm font-normal text-dom-gray-500">({past.length})</span>
                </h2>
                <div className="space-y-3">
                  {past.map((r) => (
                    <div key={r.id} className="flex items-center justify-between bg-white border border-dom-gray-200 rounded-xl p-4 opacity-70">
                      <div>
                        <p className="font-medium text-dom-gray-900">{r.staff?.name || 'Кабинет'}</p>
                        <p className="text-sm text-dom-gray-500">
                          {formatDate(r.datetime)} в {formatTime(r.datetime)} &middot; {durationLabel(r.length)}
                        </p>
                      </div>
                      <span className="text-xs bg-dom-gray-200 text-dom-gray-500 px-3 py-1 rounded-full font-medium">
                        Завершено
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </BookingLayout>
  );
}
