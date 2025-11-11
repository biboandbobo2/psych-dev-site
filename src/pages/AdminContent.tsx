import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, orderBy, query, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ROUTE_CONFIG } from "../routes";
import { getPeriodColors } from "../constants/periods";
import { TestEditorModal } from "../components/TestEditorModal";
import { canonicalizePeriodId } from "../lib/firestoreHelpers";

interface Period {
  period: string;
  title: string;
  subtitle: string;
  published: boolean;
  order: number;
  accent: string;
  isPlaceholder?: boolean;
  [key: string]: any;
}

const ROUTE_ORDER_MAP: Record<string, number> = ROUTE_CONFIG.reduce(
  (acc, config, index) => {
    if (config.periodId) {
      acc[config.periodId] = index;
    }
    return acc;
  },
  {} as Record<string, number>
);

const getRouteOrder = (periodId: string) =>
  ROUTE_ORDER_MAP[periodId] ?? Number.MAX_SAFE_INTEGER;

const FALLBACK_PLACEHOLDER_TEXT = "Контент для этого возраста пока не создан.";

export default function AdminContent() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTestEditor, setShowTestEditor] = useState(false);

  const loadPeriods = async () => {
    try {
      setLoading(true);
      const periodsRef = collection(db, "periods");
      const q = query(periodsRef, orderBy("order", "asc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((docSnap) => {
        const docData = docSnap.data() as Period;
        const canonicalId = canonicalizePeriodId(docSnap.id);
        return {
          ...docData,
          period: canonicalId,
        };
      });

      const existingIds = new Set(data.map((period) => period.period));
      const placeholderPeriods = ROUTE_CONFIG.filter(
        (config) => config.periodId && !existingIds.has(config.periodId)
      ).map((config) => ({
        period: config.periodId!,
        title: config.navLabel,
        subtitle:
          config.placeholderText ||
          config.meta?.description ||
          FALLBACK_PLACEHOLDER_TEXT,
        published: false,
        order: getRouteOrder(config.periodId!),
        accent: "",
        isPlaceholder: true,
      }));

      const combined = [...data, ...placeholderPeriods].sort((a, b) => {
        const orderA =
          typeof a.order === "number" ? a.order : getRouteOrder(a.period);
        const orderB =
          typeof b.order === "number" ? b.order : getRouteOrder(b.period);
        return orderA - orderB;
      });

      setPeriods(combined);
    } catch (err: any) {
      console.error("Error loading periods:", err);
      alert("Failed to load periods: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeriods();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-20 bg-gray-200 rounded" />
          <div className="h-20 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold mb-2">📝 Управление контентом</h1>
        <p className="text-gray-600">Редактирование периодов</p>
      </header>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-700">Все периоды</h2>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTestEditor(true)}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <span aria-hidden>📝</span>
            <span>Создать тест</span>
          </button>

          <Link
            to="/admin/topics"
            className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
          >
            <span aria-hidden>📚</span>
            <span>Редактировать темы заметок</span>
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {periods.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p>Периоды не найдены.</p>
          </div>
        ) : (
          periods.map((period) => {
            const colors = getPeriodColors(period.period);
            const isIntro = period.period === "intro";
            const isPlaceholder = Boolean(period.isPlaceholder);
            return (
              <Link
                key={period.period}
                to={`/admin/content/edit/${period.period}`}
                className={`block rounded-lg shadow hover:shadow-lg transition-shadow ${
                  isIntro ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-white" : "bg-white"
                } ${isPlaceholder && !isIntro ? "border border-dashed border-blue-200" : ""}`}
              >
                <div className="flex items-center p-4">
                  <div
                    className="w-2 h-16 rounded mr-4"
                    style={{ backgroundColor: period.accent || colors.accent }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold">
                        {isIntro ? `✨ ${period.title || "Вводное занятие"}` : period.title}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          period.published ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {period.published ? "Опубликовано" : "Черновик"}
                      </span>
                      {!isIntro && isPlaceholder && (
                        <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                          Новый период
                        </span>
                      )}
                    </div>
                    {period.subtitle && (
                      <p className={`text-sm mb-2 ${isIntro ? "text-yellow-100" : "text-gray-600"}`}>
                        {period.subtitle}
                      </p>
                    )}
                    <div className={`flex gap-4 text-xs ${isIntro ? "text-yellow-50" : "text-gray-500"}`}>
                      <span>ID: {period.period}</span>
                      <span>Порядок: {period.order}</span>
                    </div>
                  </div>
                  <span className={`text-2xl ml-4 ${isIntro ? "text-white" : "text-gray-400"}`}>✏️</span>
                </div>
              </Link>
            );
          })
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-700">
          💡 <strong>Совет:</strong> Нажмите на период чтобы редактировать его содержимое.
        </p>
      </div>

      {showTestEditor && (
        <TestEditorModal onClose={() => setShowTestEditor(false)} />
      )}
    </div>
  );
}
