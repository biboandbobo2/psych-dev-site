import type { IconSummary } from '../types';
import { centuryLabel, centuryOptions, subjectOptions, traditionOptions, type CatalogOrder } from '../lib/catalog';

export interface CatalogFilterValues {
  query: string;
  tradition: string;
  century: string;
  subject: string;
  order: CatalogOrder;
}

export function CatalogFilters({ icons, subjectIcons, values, onChange }: {
  icons: IconSummary[];
  /** Срез по традиции и веку: счётчики сюжетов должны совпадать с тем, что реально найдётся. */
  subjectIcons: IconSummary[];
  values: CatalogFilterValues;
  onChange: (name: string, value: string) => void;
}) {
  const subjects = subjectOptions(subjectIcons);
  // Выбранный сюжет мог исчезнуть из среза: оставляем его в списке, иначе select потеряет значение.
  const withSelected = values.subject && !subjects.some((option) => option.value === values.subject)
    ? [{ value: values.subject, count: 0 }, ...subjects]
    : subjects;
  return (
    <div className="ico-filters">
      <label className="ico-search">
        Поиск
        <input
          type="search"
          placeholder="Образ, святой, музей, мастер…"
          value={values.query}
          onChange={(event) => onChange('q', event.target.value)}
        />
      </label>

      <label>
        Сюжет
        <select value={values.subject} onChange={(event) => onChange('subject', event.target.value)}>
          <option value="">Все сюжеты</option>
          {withSelected.map((option) => (
            <option key={option.value} value={option.value}>{option.value} ({option.count})</option>
          ))}
        </select>
      </label>

      <label>
        Традиция
        <select value={values.tradition} onChange={(event) => onChange('tradition', event.target.value)}>
          <option value="">Все традиции</option>
          {traditionOptions(icons).map((option) => (
            <option key={option.value} value={option.value}>{option.value} ({option.count})</option>
          ))}
        </select>
      </label>

      <label>
        Век
        <select value={values.century} onChange={(event) => onChange('century', event.target.value)}>
          <option value="">Все периоды</option>
          {centuryOptions(icons).map((century) => (
            <option key={century} value={century}>{centuryLabel(century)}</option>
          ))}
        </select>
      </label>

      <label>
        Порядок
        <select value={values.order} onChange={(event) => onChange('sort', event.target.value)}>
          <option value="century">По векам</option>
          <option value="title">По названию</option>
        </select>
      </label>
    </div>
  );
}
