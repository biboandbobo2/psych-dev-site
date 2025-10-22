import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import { getPeriodColors } from "../constants/periods";

interface Period {
  period: string;
  title: string;
  subtitle: string;
  published: boolean;
  order: number;
  accent: string;
  [key: string]: any;
}

export default function AdminContent() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [intro, setIntro] = useState<Period | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  const loadPeriods = async () => {
    try {
      setLoading(true);

      // load intro document (singleton)
      const introDoc = await getDoc(doc(db, "intro", "singleton"));
      if (introDoc.exists()) {
        setIntro({ ...(introDoc.data() as Period), period: "intro" });
      } else {
        // fallback to collection intro (legacy)
        const introRef = collection(db, "intro");
        const introSnap = await getDocs(introRef);
        if (!introSnap.empty) {
          const introData = introSnap.docs[0].data() as Period;
          setIntro({ ...introData, period: "intro" });
        } else {
          setIntro(null);
        }
      }

      // load periods ordered by order asc
      const periodsRef = collection(db, "periods");
      const q = query(periodsRef, orderBy("order", "asc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as Period),
        period: docSnap.id,
      }));

      setPeriods(data);
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

  const filteredPeriods = periods.filter((period) => {
    if (filter === "published") return Boolean(period.published);
    if (filter === "draft") return !period.published;
    return true;
  });

  const introMatchesFilter = () => {
    if (!intro) return false;
    if (filter === "published") return Boolean(intro.published);
    if (filter === "draft") return !intro.published;
    return true;
  };

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

  const publishedCount = periods.filter((period) => period.published).length + (intro?.published ? 1 : 0);
  const draftCount = periods.filter((period) => !period.published).length + (intro && !intro.published ? 1 : 0);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold mb-2">📝 Управление контентом</h1>
        <p className="text-gray-600">Редактирование периодов и вводного занятия</p>
      </header>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded font-medium transition ${
            filter === "all"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Все ({(intro ? 1 : 0) + periods.length})
        </button>
        <button
          onClick={() => setFilter("published")}
          className={`px-4 py-2 rounded font-medium transition ${
            filter === "published"
              ? "bg-green-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Опубликовано ({publishedCount})
        </button>
        <button
          onClick={() => setFilter("draft")}
          className={`px-4 py-2 rounded font-medium transition ${
            filter === "draft"
              ? "bg-orange-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Черновики ({draftCount})
        </button>
      </div>

      {intro && introMatchesFilter() && (
        <Link
          to="/admin/content/edit/intro"
          className="block bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg shadow hover:shadow-lg transition-shadow"
        >
          <div className="p-6 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-bold text-white">✨ Вводное занятие</h3>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    intro.published ? "bg-white/20 text-white" : "bg-black/20 text-white"
                  }`}
                >
                  {intro.published ? "Опубликовано" : "Черновик"}
                </span>
              </div>
              <p className="text-yellow-100 text-sm">{intro.title}</p>
            </div>
            <span className="text-white text-3xl">✏️</span>
          </div>
        </Link>
      )}

      <div className="space-y-3">
        {filteredPeriods.length === 0 && filter !== "all" ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p>Периодов не найдено.</p>
            <button
              onClick={() => setFilter("all")}
              className="mt-2 text-blue-600 hover:underline"
            >
              Показать все
            </button>
          </div>
        ) : (
          filteredPeriods.map((period) => {
            const colors = getPeriodColors(period.period);
            return (
              <Link
                key={period.period}
                to={`/admin/content/edit/${period.period}`}
                className="block bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center p-4">
                  <div
                    className="w-2 h-16 rounded mr-4"
                    style={{ backgroundColor: period.accent || colors.accent }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold">{period.title}</h3>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          period.published ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {period.published ? "Опубликовано" : "Черновик"}
                      </span>
                    </div>
                    {period.subtitle && (
                      <p className="text-sm text-gray-600 mb-2">{period.subtitle}</p>
                    )}
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>ID: {period.period}</span>
                      <span>Порядок: {period.order}</span>
                    </div>
                  </div>
                  <span className="text-gray-400 text-2xl ml-4">✏️</span>
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
    </div>
  );
}
