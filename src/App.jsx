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

/* ------------ 🗄  DATA IMPORTS (12 возрастов) --------------------------------- */
import prenatal from "./data/prenatal";
import infancy from "./data/infancy";
import toddler from "./data/toddler";
import preschool from "./data/preschool";
import school from "./data/school";
import earlyAdolescence from "./data/earlyAdolescence";
import adolescence from "./data/adolescence";
import emergingAdult from "./data/emergingAdult";
import earlyAdult from "./data/earlyAdult";
import midlife from "./data/midlife";
import lateAdult from "./data/lateAdult";
import oldestOld from "./data/oldestOld";

const periods = [
  prenatal,
  infancy,
  toddler,
  preschool,
  school,
  earlyAdolescence,
  adolescence,
  emergingAdult,
  earlyAdult,
  midlife,
  lateAdult,
  oldestOld,
];

/* ------------ 📄  UTILS -------------------------------------------------------- */
const PeriodPage = () => {
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

const Section = ({ title, content }) =>
  content && content.length ? (
    <section>
      <h2>{title}</h2>
      <div className="card">
        {title === "Видео-лекция" ? (
          <iframe
            title={content[0].title}
            src={content[0].url}
            allowFullScreen
          />
        ) : (
          content.map((item, i) =>
            typeof item === "string" ? (
              <p key={i}>{item}</p>
            ) : item.type === "quiz" ? (
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
            ) : (
              <p key={i}>
                <strong>{item.title}</strong>
                {item.author ? ` — ${item.author}` : ""}
                {item.year ? ` (${item.year})` : ""}
                {item.url ? (
                  <>
                    {" "}
                    <a href={item.url} target="_blank" rel="noreferrer">
                      ►
                    </a>
                  </>
                ) : null}
              </p>
            )
          )
        )}
      </div>
    </section>
  ) : null;

/* ------------ 🌐  APP SHELL ---------------------------------------------------- */
export default function App() {
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
          <Route path="/:id" element={<PeriodPage />} />
        </Routes>
      </div>
    </Router>
  );
}
