import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  Navigate,
  useParams,
} from "react-router-dom";
import { usePeriods } from "@/lib/usePeriods";

/* ------------ 🎨  GLOBAL STYLES ------------------------------------------------ */
const globalStyles = `/* тот же CSS, что был у вас – без изменений */`;

/* ------------ 📄  HELPERS ------------------------------------------------------ */

const RUBRICS = [
  "video",
  "concepts",
  "authors",
  "coreRead",
  "extraRead",
  "extraVideo",
  "quiz",
  "self",
  "egp",
  "leisure",
  "research",
  "experimental",
];

// конвертируем ссылку watch?v → embed
const toEmbed = (url) => {
  if (!url.includes("youtu")) return url;
  if (url.includes("watch?v=")) {
    const id = url.split("watch?v=")[1].split("&")[0];
    return `https://www.youtube.com/embed/${id}`;
  }
  if (url.includes("youtu.be/")) {
    const id = url.split("youtu.be/")[1].split("?")[0];
    return `https://www.youtube.com/embed/${id}`;
  }
  return url;
};

function Section({ rubric, text }) {
  if (!text) return null;

  // 1 — превращаем JSON-массив "["…"]" в обычный список
  let lines;
  if (text.trim().startsWith("[")) {
    try {
      lines = JSON.parse(text);
    } catch {
      lines = text.split("\n");
    }
  } else {
    lines = text.split("\n");
  }

  // 2 — helper, чтобы YouTube всегда был /embed/
  const toEmbed = (url) =>
    url.includes("watch?v=")
      ? `https://www.youtube.com/embed/${url.split("watch?v=")[1].split("&")[0]}`
      : url.includes("youtu.be/")
      ? `https://www.youtube.com/embed/${url.split("youtu.be/")[1].split("?")[0]}`
      : url;

  return (
    <section>
      <h2>{rubric}</h2>
      <div className="card">
        {rubric === "video" ? (
          <iframe title="video" src={toEmbed(lines[0])} allowFullScreen />
        ) : (
          <ul>{lines.filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}</ul>
        )}
      </div>
    </section>
  );
}



function PeriodScreen({ periods }) {
  const { slug } = useParams();
  const period = periods.find((p) => p.slug === slug);

  if (!period) return <Navigate to={`/${periods[0].slug}`} replace />;

  return (
    <main>
      <h1>{period.label}</h1>
      {RUBRICS.map((r) => (
        <Section key={r} rubric={r} text={period.data[r]} />
      ))}
    </main>
  );
}

/* ------------ 🌐  APP SHELL ---------------------------------------------------- */

export default function App() {
  const periods = usePeriods();

  if (!periods.length) return <p style={{ padding: "2rem" }}>Loading…</p>;

  return (
    <Router>
      <style>{globalStyles}</style>

      <div style={{ display: "flex" }}>
        <aside>
          <nav>
            {periods.map((p) => (
              <NavLink key={p.slug} to={`/${p.slug}`}>
                {p.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <Routes>
          <Route path="/" element={<Navigate to={`/${periods[0].slug}`} />} />
          <Route path="/:slug" element={<PeriodScreen periods={periods} />} />
          <Route path="*" element={<p>404 – нет такого периода</p>} />
        </Routes>
      </div>
    </Router>
  );
}
