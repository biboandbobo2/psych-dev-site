// File: src/App.jsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  Navigate,
  useParams,
} from "react-router-dom";
import { usePeriods } from "./lib/usePeriods";

/* ------------ 🎨  GLOBAL STYLES ------------------------------------------------ */
const globalStyles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',system-ui,Arial,sans-serif;background:#f9fafb;color:#111827;line-height:1.55}
.dark body{background:#111827;color:#f9fafb}
a{color:inherit;text-decoration:none}
aside{width:260px;flex:none;border-right:1px solid #e5e7eb;padding:1.25rem 1rem;position:sticky;top:0;height:100vh;overflow-y:auto;background:#fff}
.dark aside{background:#1f2937;border-color:#374151}
nav a{display:block;padding:.5rem 1rem;border-radius:.5rem;margin-bottom:.25rem}
nav a.active{background:#a5b4fd;font-weight:600}
main{flex:1;padding:2rem;max-width:840px;margin:0 auto}
h1{font-size:1.5rem;font-weight:700;margin-bottom:1rem}
h2{font-size:1.25rem;font-weight:600;margin:1.5rem 0 .75rem}
section{margin-bottom:1.5rem}
.card{background:#fff;border-radius:.75rem;box-shadow:0 3px 8px rgba(0,0,0,.05);padding:1rem}
.dark .card{background:#1f2937}
details{margin:.5rem 0}
summary{cursor:pointer;font-weight:600}
iframe{width:100%;aspect-ratio:16/9;border:0;border-radius:.5rem}
@media(max-width:768px){aside{display:none}main{padding:1rem}}
`;

const isUrlString = (value) => {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value, value.startsWith("http") ? undefined : "https://www.youtube.com");
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (error) {
    return false;
  }
};

const toYoutubeEmbedUrl = (value) => {
  if (!isUrlString(value)) return "";
  try {
    const url = new URL(
      value,
      value.startsWith("http") ? undefined : "https://www.youtube.com"
    );
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const videoId = url.pathname.replace(/\///g, "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname.startsWith("/embed/")) {
        return `https://www.youtube.com${url.pathname}${url.search}`;
      }
      if (url.pathname === "/watch") {
        const videoId = url.searchParams.get("v");
        return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
      }
    }
  } catch (error) {
    return "";
  }
  return value;
};

const normalizeVideoEntry = (entry) => {
  if (!entry) {
    return {
      title: "Видео-лекция",
      embedUrl: "",
      originalUrl: "",
    };
  }

  if (typeof entry === "string") {
    const trimmed = entry.trim();
    return {
      title: "Видео-лекция",
      embedUrl: toYoutubeEmbedUrl(trimmed),
      originalUrl: trimmed,
    };
  }

  const rawUrl = typeof entry.url === "string" ? entry.url.trim() : "";
  return {
    title: entry.title ?? "Видео-лекция",
    embedUrl: toYoutubeEmbedUrl(rawUrl),
    originalUrl: rawUrl,
  };
};

/* ------------ 📄  UTILS -------------------------------------------------------- */
const PeriodPage = ({ periods }) => {
  const { id } = useParams();
  const data = periods.find((p) => p.id === id);
  if (!data) return <Navigate to={`/${periods[0].id}`} replace />;
  return (
    <main>
      <h1>{data.label}</h1>
      {Object.entries(data.sections).map(([slug, section]) => (
        <Section key={slug} title={section.title} content={section.content} />
      ))}
    </main>
  );
};

const Section = ({ title, content }) => {
  if (!content || !content.length) return null;

  if (title === "Видео-лекция") {
    const { embedUrl, originalUrl, title: videoTitle } = normalizeVideoEntry(content[0]);
    if (!embedUrl) {
      return (
        <section>
          <h2>{title}</h2>
          <div className="card">
            <p>
              Видео недоступно.{' '}
              {isUrlString(originalUrl) ? (
                <a href={originalUrl} target="_blank" rel="noreferrer">
                  Открыть на YouTube
                </a>
              ) : (
                "Проверьте URL в CSV."
              )}
            </p>
          </div>
        </section>
      );
    }

    return (
      <section>
        <h2>{title}</h2>
        <div className="card">
          <iframe title={videoTitle} src={embedUrl} allowFullScreen />
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2>{title}</h2>
      <div className="card">
        {content.map((item, i) => {
          if (typeof item === "string") {
            const trimmed = item.trim();
            if (isUrlString(trimmed)) {
              return (
                <p key={i}>
                  <a href={trimmed} target="_blank" rel="noreferrer">
                    {trimmed}
                  </a>
                </p>
              );
            }
            return <p key={i}>{trimmed}</p>;
          }

          if (item.type === "quiz") {
            return (
              <details key={i}>
                <summary>{item.q}</summary>
                <ul>
                  {item.options.map((opt) => (
                    <li
                      key={opt}
                      style={{
                        fontWeight: opt === item.a ? 600 : 400,
                        color: opt === item.a ? "#4f46e5" : "inherit",
                      }}
                    >
                      {opt}
                    </li>
                  ))}
                </ul>
              </details>
            );
          }

          const rawUrl = typeof item.url === "string" ? item.url.trim() : "";
          return (
            <p key={i}>
              <strong>{item.title}</strong>
              {item.author ? ` — ${item.author}` : ""}
              {item.year ? ` (${item.year})` : ""}
              {isUrlString(rawUrl) ? (
                <>
                  {" "}
                  <a href={rawUrl} target="_blank" rel="noreferrer">
                    ►
                  </a>
                </>
              ) : null}
            </p>
          );
        })}
      </div>
    </section>
  );
};

/* ------------ 🌐  APP SHELL ---------------------------------------------------- */
export default function App() {
  const { periods, loading, error } = usePeriods();

  if (loading) return <p className="p-4">Loading…</p>;
  if (error)
    return (
      <p className="p-4">
        Не удалось загрузить данные: {error.message}
      </p>
    );
  if (!periods.length) return <p className="p-4">Нет данных для отображения</p>;

  return (
    <Router>
      <style>{globalStyles}</style>
      <div style={{ display: "flex" }}>
        <aside>
          <nav>
            {periods.map((p) => (
              <NavLink key={p.id} to={`/${p.id}`}>
                {p.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <Routes>
          <Route path="/" element={<Navigate to={`/${periods[0].id}`} />} />
          <Route path="/:id" element={<PeriodPage periods={periods} />} />
        </Routes>
      </div>
    </Router>
  );
}
