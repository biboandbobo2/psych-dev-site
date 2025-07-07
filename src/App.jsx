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
const globalStyles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
html{font-family:'Inter',system-ui,-apple-system,sans-serif;scroll-behavior:smooth}
body{display:flex;min-height:100vh;background:#f9fafb;color:#1f2937;line-height:1.55}

aside{width:240px;background:#fff;border-right:1px solid #e5e7eb;padding:1rem}
nav{display:flex;flex-direction:column;gap:.25rem}
nav a{display:block;padding:.5rem .75rem;border-radius:8px;color:#4f46e5;text-decoration:none;font-weight:500}
nav a.active{background:#a5b4fd;color:#1e1b4b;font-weight:600}

main{flex:1;max-width:960px;margin:0 auto;padding:2rem 1rem}
h1{font-size:1.6rem;margin-bottom:1rem}
h2{font-size:1.25rem;margin-top:1rem;margin-bottom:.5rem}
.card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1rem;margin-bottom:1rem}
iframe{width:100%;aspect-ratio:16/9;border:0;border-radius:12px}
`;

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

      <div style={{ display: 'flex', flex: 1 }}>
        <aside>
          <nav>
            <ul>
              {periods.map((p) => (
                <li key={p.slug}>
                  <NavLink
                    to={`/${p.slug}`}
                    className={({ isActive }) => (isActive ? 'active' : '')}
                  >
                    {p.label}
                  </NavLink>
                </li>
              ))}
            </ul>
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
