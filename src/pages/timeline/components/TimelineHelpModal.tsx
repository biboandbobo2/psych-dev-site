import { AnimatePresence, motion } from 'framer-motion';
import { SPHERE_META } from '../constants';

interface TimelineHelpModalProps {
  open: boolean;
  onClose: () => void;
}

export function TimelineHelpModal({ open, onClose }: TimelineHelpModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Как пользоваться таймлайном</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-slate-100 transition"
                aria-label="Закрыть справку"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-slate-700">
              <section>
                <h3 className="font-semibold text-lg mb-2">🎯 Что это?</h3>
                <p className="leading-relaxed">
                  Таймлайн жизни растет снизу вверх. Сплошная линия — ваша прожитая жизнь, пунктир — будущее.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">📝 Как добавлять события</h3>
                <ul className="space-y-2">
                  <li>1. Укажите свой текущий возраст слева</li>
                  <li>2. Используйте форму справа для добавления событий</li>
                  <li>3. Выберите возраст, название и сферу жизни</li>
                  <li>4. Отметьте крестиком, если это было ваше решение</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">🎨 Сферы жизни</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(SPHERE_META).map(([key, meta]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: meta.color }} />
                      <span>
                        {meta.emoji} {meta.label}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <h3 className="font-semibold text-amber-900 mb-2">⚠️ Важно</h3>
                <p className="text-sm text-amber-800 leading-relaxed">
                  Данные автоматически сохраняются каждые 10 секунд. Используйте колесико мыши для масштабирования и перетаскивайте
                  холст для перемещения.
                </p>
              </section>
            </div>

            <button
              onClick={onClose}
              className="mt-6 w-full py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition"
            >
              Понятно!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
