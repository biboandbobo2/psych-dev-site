import { useParams } from 'react-router-dom'
import { usePeriods, rubrics } from '@/lib/usePeriods'
import ReactMarkdown from 'react-markdown'          // если хотите MD-рендер

export default function PeriodPage() {
  const { slug } = useParams()          // slug == 'prenatal' | 'infancy' | …
  const period = usePeriods().find(p => p.slug === slug)

  if (!period) return <h1>404 — Не найдено</h1>

  return (
    <>
      <h1>{period.slug}</h1>            {/* заголовок берём из slug или format */}
      {rubrics.map(r => {
        const text  = period.data[r]    || ''
        const rule  = period.format[r]  || ''

        if (!text) return null

        // ➜ пример применения формат-строки
        const items = text.split('\n')         // «каждый пункт с новой строки»
        return (
          <section key={r}>
            <h2>{r}</h2>
            {rule.includes('each item') ? (
              <ul>{items.map((t,i)=><li key={i}><ReactMarkdown>{t}</ReactMarkdown></li>)}</ul>
            ) : (
              <ReactMarkdown>{text}</ReactMarkdown>
            )}
          </section>
        )
      })}
    </>
  )
}
