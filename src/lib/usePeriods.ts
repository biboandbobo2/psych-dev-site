import { useMemo } from 'react'
import Papa from 'papaparse'

// ① Raw-импорт CSV (путь относительно src, «?raw» гарантирует строку)
import csvRaw from '../../content/periods.csv?raw'

// ② Список рубрик в нужном порядке
export const rubrics = [
  'video', 'concepts', 'authors', 'coreRead', 'extraRead', 'extraVideo',
  'quiz', 'self', 'egp', 'leisure', 'research', 'experimental'
]

export interface PeriodRow {
  rubric: string
  [slug: string]: string            // остальные колонки — периоды
}

export const usePeriods = () => {
  return useMemo(() => {
    const { data } = Papa.parse<PeriodRow>(csvRaw, { header: true, skipEmptyLines: true })

    // ③ собираем в [{ slug, data: { rubric->text }, format: { rubric->rule } }]
    const periodsMap: Record<string, any> = {}

    data.forEach(row => {
      rubrics.forEach(rub => {
        const val = row[rub] || ''
        const isFormat = row.rubric.endsWith('_format')
        const cleanRubric = isFormat ? row.rubric.replace('_format', '') : row.rubric

        if (!periodsMap[rub]) periodsMap[rub] = { slug: rub, data: {}, format: {} }

        if (isFormat) periodsMap[rub].format[cleanRubric] = val
        else periodsMap[rub].data[cleanRubric] = val
      })
    })

    // массив в порядке колонок CSV
    return Object.values(periodsMap)
  }, [])
}
