// File: src/App.jsx
import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ROUTE_CONFIG, SITE_NAME, NOT_FOUND_REDIRECT } from "./routes";
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
@media(max-width:1024px){aside{height:auto;position:static;border-right:none;border-bottom:1px solid #e5e7eb;display:flex;overflow-x:auto}nav{display:flex;gap:.5rem}nav a{white-space:nowrap;margin:0}}
@media(max-width:768px){main{padding:1rem}}
`;

/* ------------ 🔄  SCROLL MANAGEMENT ------------------------------------------- */
function ScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positionsRef = useRef(new Map());

  useEffect(() => {
    const key = location.key || location.pathname;
    const positions = positionsRef.current;
    return () => {
      positions.set(key, window.scrollY);
    };
  }, [location]);

  useLayoutEffect(() => {
    const key = location.key || location.pathname;
    const stored = positionsRef.current.get(key);
    if (navigationType === "POP" && typeof stored === "number") {
      window.scrollTo(0, stored);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location, navigationType]);

  return null;
}

/* ------------ 🧭  HELPERS ----------------------------------------------------- */
const ensureUrl = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
};

const parseTimeParam = (raw) => {
  if (!raw) return undefined;
  if (/^\d+$/.test(raw)) return raw;
  const match = raw.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);
  if (!match) return undefined;
  const [, hours, minutes, seconds] = match;
  const total =
    (Number(hours ?? 0) || 0) * 3600 +
    (Number(minutes ?? 0) || 0) * 60 +
    (Number(seconds ?? 0) || 0);
  return total ? String(total) : undefined;
};

const extractYoutubeId = (url) => {
  if (!url) return null;
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    return url.pathname.replace(/\//g, "");
  }
  if (["youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) {
    if (url.pathname.startsWith("/embed/")) {
      const [, , videoId] = url.pathname.split("/");
      return videoId || null;
    }
    if (url.pathname.startsWith("/watch")) {
      return url.searchParams.get("v");
    }
    if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/live/")) {
      const [, , videoId] = url.pathname.split("/");
      return videoId || null;
    }
  }
  return null;
};

const buildYoutubeEmbedUrl = (rawValue) => {
  const url = ensureUrl(rawValue);
  if (!url) return "";

  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtube.com" && url.pathname.startsWith("/embed/")) {
    return url.toString();
  }

  const videoId = extractYoutubeId(url);
  if (!videoId) return "";

  const params = new URLSearchParams();
  if (url.searchParams.has("list")) params.set("list", url.searchParams.get("list"));
  if (url.searchParams.has("si")) params.set("si", url.searchParams.get("si"));

  const start = url.searchParams.get("start") ?? parseTimeParam(url.searchParams.get("t"));
  if (start) params.set("start", start);

  if (!params.has("feature")) params.set("feature", "oembed");
  if (!params.has("rel")) params.set("rel", "0");
  params.set("modestbranding", "1");
  params.set("playsinline", "1");

  const query = params.toString();
  return `https://www.youtube.com/embed/${videoId}${query ? `?${query}` : ""}`;
};

const isUrlString = (value) => Boolean(ensureUrl(value));

const normalizeVideoEntry = (entry) => {
  if (!entry) {
    return {
      title: "Видео-лекция",
      embedUrl: "",
      originalUrl: "",
      isYoutube: false,
    };
  }

  if (typeof entry === "string") {
    const trimmed = entry.trim();
    return {
      title: "Видео-лекция",
      embedUrl: buildYoutubeEmbedUrl(trimmed),
      originalUrl: trimmed,
      isYoutube: Boolean(ensureUrl(trimmed)?.hostname.includes("youtu")),
    };
  }

  const rawUrl = typeof entry.url === "string" ? entry.url.trim() : "";
  return {
    title: entry.title ?? "Видео-лекция",
    embedUrl: buildYoutubeEmbedUrl(rawUrl),
    originalUrl: rawUrl,
    isYoutube: Boolean(ensureUrl(rawUrl)?.hostname.includes("youtu")),
  };
};

/* ------------ 📄  SECTIONS ----------------------------------------------------- */
const Section = ({ title, content }) => {
  if (!content || !content.length) return null;

  if (title === "Видео-лекция") {
    const { embedUrl, originalUrl, title: videoTitle, isYoutube } = normalizeVideoEntry(content[0]);

    if (!embedUrl) {
      return (
        <section>
          <h2>{title}</h2>
          <div className="card">
            <p>
              Видео недоступно для встраивания. {""}
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
          <iframe
            title={videoTitle}
            src={embedUrl}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
          {!isYoutube && isUrlString(originalUrl) ? (
            <p style={{ marginTop: "0.5rem" }}>
              Ссылка не похожа на YouTube. Проверить источник: {""}
              <a href={originalUrl} target="_blank" rel="noreferrer">
                {originalUrl}
              </a>
            </p>
          ) : null}
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
            const parsedUrl = ensureUrl(trimmed);
            if (parsedUrl) {
              return (
                <p key={i}>
                  <a href={parsedUrl.toString()} target="_blank" rel="noreferrer">
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
          const parsedUrl = ensureUrl(rawUrl);
          return (
            <p key={i}>
              {parsedUrl ? (
                <a href={parsedUrl.toString()} target="_blank" rel="noreferrer">
                  <strong>{item.title}</strong>
                </a>
              ) : (
                <strong>{item.title}</strong>
              )}
              {item.author ? ` — ${item.author}` : ""}
              {item.year ? ` (${item.year})` : ""}
              {parsedUrl && !item.title ? (
                <span>
                  {" "}
                  <a href={parsedUrl.toString()} target="_blank" rel="noreferrer">
                    {parsedUrl.toString()}
                  </a>
                </span>
              ) : null}
            </p>
          );
        })}
      </div>
    </section>
  );
};

/* ------------ 📄  ROUTE VIEWS -------------------------------------------------- */
function PeriodRoute({ config, period }) {
  const title = config.meta?.title ?? `${config.navLabel} — ${SITE_NAME}`;
  const description =
    config.meta?.description ?? `Материалы и ссылки по разделу ${config.navLabel}.`;
  const showPlaceholder = Boolean(config.placeholder || !period);
  const placeholderText =
    config.placeholder || "Раздел пока недоступен. Загляните позже.";

  return (
    <main>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Helmet>
      <h1>{config.navLabel}</h1>
      {showPlaceholder ? (
        <div className="card">
          <p>{placeholderText}</p>
        </div>
      ) : (
        Object.entries(period.sections).map(([slug, section]) => (
          <Section key={slug} title={section.title} content={section.content} />
        ))
      )}
    </main>
  );
}

function NotFound() {
  return (
    <main>
      <Helmet>
        <title>Страница не найдена — {SITE_NAME}</title>
        <meta
          name="description"
          content="Мы не нашли такую страницу. Вернитесь на главную."
        />
      </Helmet>
      <h1>Страница не найдена</h1>
      <div className="card">
        <p>Кажется, такой страницы нет. Вернитесь на главную и выберите раздел.</p>
        <p style={{ marginTop: "1rem" }}>
          <NavLink to="/prenatal">На главную</NavLink>
        </p>
      </div>
    </main>
  );
}

/* ------------ 🌐  APP SHELL ---------------------------------------------------- */
function AppContent() {
  const { periods, loading, error } = usePeriods();

  const periodMap = useMemo(() => {
    const map = new Map();
    periods.forEach((period) => map.set(period.id, period));
    return map;
  }, [periods]);

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
      <Helmet>
        <title>{SITE_NAME}</title>
        <meta name="description" content="Образовательный ресурс по возрастной психологии." />
      </Helmet>
      <style>{globalStyles}</style>
      <ScrollManager />
      <div style={{ display: "flex" }}>
        <aside>
          <nav>
            {ROUTE_CONFIG.map((config) => (
              <NavLink key={config.path} to={config.path} end>
                {config.navLabel}
              </NavLink>
            ))}
          </nav>
        </aside>

        <Routes>
          <Route path="/" element={<Navigate to="/prenatal" replace />} />
          {ROUTE_CONFIG.map((config) => (
            <Route
              key={config.path}
              path={config.path}
              element={<PeriodRoute config={config} period={periodMap.get(config.periodId)} />}
            />
          ))}
          <Route
            path="*"
            element={NOT_FOUND_REDIRECT ? <Navigate to="/prenatal" replace /> : <NotFound />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default function App() {
  return <AppContent />;
}
