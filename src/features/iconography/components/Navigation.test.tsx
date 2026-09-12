import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { readFileSync } from 'node:fs';
import type { IconRecord, IconSchool, IconSummary } from '../types';
import { subjectOptions, traditionGroup, traditionOptions } from '../lib/catalog';
import { IconographyPortal } from '../IconographyPortal';
import { Catalog } from './Catalog';
import { BackLink } from './BackLink';
import { PassportFacts } from './Passport';
import { Learn } from './Learn';

const icons: IconSummary[] = JSON.parse(readFileSync('public/iconography/catalog.json', 'utf8'));
const readRecord = (id: string): IconRecord => JSON.parse(readFileSync(`public/iconography/records/${id}.json`, 'utf8'));
const schools: IconSchool[] = JSON.parse(readFileSync('public/iconography/schools.json', 'utf8'));

function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}{location.hash}</output>;
}

/** jsdom не реализует scrollIntoView — подменяем и запоминаем, к какой карточке прокрутили. */
function trackScroll() {
  const scrolled: string[] = [];
  Element.prototype.scrollIntoView = vi.fn(function scrollIntoView(this: Element) { scrolled.push(this.id); });
  return scrolled;
}

function renderCatalog(entry: string) {
  return render(<MemoryRouter initialEntries={[entry]}><Location /><Routes>
    <Route path="/iconography/catalog" element={<Catalog icons={icons} />} />
    <Route path="/iconography/icon/:id" element={<BackLink />} />
  </Routes></MemoryRouter>);
}

const cardTitles = () => screen.getAllByRole('heading', { level: 3 }).map((x) => x.textContent);
// <output> в Location тоже имеет роль status, поэтому счётчик ищем по тексту.
const found = () => screen.getByText(/^Найдено: /).textContent;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
});

describe('возврат из паспорта в каталог', () => {
  it('восстанавливает фильтры, страницу и прокручивает к открытой карточке', async () => {
    const scrolled = trackScroll();
    const start = '/iconography/catalog?tradition=Русская&page=2';
    renderCatalog(start);

    const card = screen.getAllByRole('link').find((x) => x.getAttribute('href')?.includes('/icon/'))!;
    const id = card.getAttribute('href')!.split('/').at(-1)!;
    fireEvent.click(card);
    fireEvent.click(screen.getByRole('link', { name: 'Назад к коллекции' }));

    expect(screen.getByTestId('location')).toHaveTextContent(`${start}#${id}`);
    expect(screen.getByRole('combobox', { name: 'Традиция' })).toHaveValue('Русская');
    await waitFor(() => expect(scrolled).toContain(id));
  });

  it('не прокручивает каталог, если открыт без якоря', async () => {
    const scrolled = trackScroll();
    renderCatalog('/iconography/catalog');
    await waitFor(() => expect(screen.getAllByRole('heading', { level: 3 }).length).toBeGreaterThan(0));
    expect(scrolled).toEqual([]);
  });

  it('использует каталог при прямом входе и отклоняет внешний адрес возврата', () => {
    render(<MemoryRouter initialEntries={[{ pathname: '/iconography/icon/ru-6226762', state: { returnTo: 'https://example.com', returnLabel: 'Outside' } }]}>
      <BackLink />
    </MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Назад к коллекции' })).toHaveAttribute('href', '/iconography/catalog');
  });
});

describe('фильтры и порядок каталога', () => {
  it('предлагает четыре группы традиций и считает византийские записи вместе', () => {
    renderCatalog('/iconography/catalog');
    const select = screen.getByRole('combobox', { name: 'Традиция' });
    const options = within(select).getAllByRole('option').map((x) => x.textContent);
    expect(options).toHaveLength(traditionOptions(icons).length + 1);
    expect(options[0]).toBe('Все традиции');

    const byzantine = icons.filter((x) => traditionGroup(x.tradition) === 'Византийская');
    expect(byzantine.some((x) => x.tradition !== 'Византийская')).toBe(true);
    fireEvent.change(select, { target: { value: 'Византийская' } });
    expect(found()).toBe(`Найдено: ${byzantine.length}`);
  });

  it('отбирает коллекцию по сюжету и сохраняет выбор в адресе', () => {
    renderCatalog('/iconography/catalog');
    const biggest = [...subjectOptions(icons)].sort((a, b) => b.count - a.count)[0];
    fireEvent.change(screen.getByRole('combobox', { name: 'Сюжет' }), { target: { value: biggest.value } });
    expect(found()).toBe(`Найдено: ${biggest.count}`);
    expect(screen.getByTestId('location')).toHaveTextContent(`subject=${new URLSearchParams({ subject: biggest.value })}`);
  });

  it('показывает века римскими цифрами', () => {
    renderCatalog('/iconography/catalog');
    const options = within(screen.getByRole('combobox', { name: 'Век' })).getAllByRole('option').map((x) => x.textContent);
    expect(options[0]).toBe('Все периоды');
    for (const option of options.slice(1)) expect(option).toMatch(/^[IVX]+ век$/);
  });

  it('идёт по векам по умолчанию и переключается на порядок по названию', () => {
    renderCatalog('/iconography/catalog');
    const earliest = Math.min(...icons.map((x) => x.centuries[0] ?? Number.MAX_SAFE_INTEGER));
    const opened = icons.find((x) => x.title === cardTitles()[0])!;
    expect(opened.centuries[0]).toBe(earliest);

    const order = screen.getByRole('combobox', { name: 'Порядок' });
    expect(order).toHaveValue('century');
    fireEvent.change(order, { target: { value: 'title' } });

    const alphabetical = [...icons].sort((a, b) => a.title.localeCompare(b.title, 'ru'))[0].title;
    expect(cardTitles()[0]).toBe(alphabetical);
    expect(screen.getByTestId('location')).toHaveTextContent('sort=title');
  });

  it('ставит совпадение в названии выше совпадения в тегах и персонажах', () => {
    renderCatalog('/iconography/catalog');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Поиск' }), { target: { value: 'Пётр' } });
    const shown = cardTitles();
    const byTitle = shown.filter((title) => title!.includes('Пётр'));
    expect(byTitle.length).toBeGreaterThan(0);
    expect(byTitle.length).toBeLessThan(shown.length);
    // Совпадения в названии идут раньше совпадений в персонажах и тегах.
    expect(shown.slice(0, byTitle.length)).toEqual(byTitle);
  });
});

describe('паспорт и школы', () => {
  it('связывает регион со школой и возвращает со школы к той же иконе', () => {
    const icon = readRecord('ru-35409809');
    render(<MemoryRouter initialEntries={['/iconography/icon/ru-35409809']}><Location /><Routes>
      <Route path="/iconography/icon/:id" element={<PassportFacts icon={icon} />} />
      <Route path="/iconography/schools/:id" element={<BackLink />} />
    </Routes></MemoryRouter>);

    fireEvent.click(screen.getByRole('link', { name: icon.region }));
    expect(screen.getByTestId('location')).toHaveTextContent(`/iconography/schools/${icon.schoolId}`);
    fireEvent.click(screen.getByRole('link', { name: 'Назад к иконе' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/iconography/icon/ru-35409809');
  });

  it('скрывает строки фактов со значением-заглушкой', () => {
    const icon = { ...readRecord('ru-35409809'), inventory: 'Не указан в доступном источнике', museum: 'Государственный Эрмитаж' };
    render(<MemoryRouter><PassportFacts icon={icon} /></MemoryRouter>);
    expect(screen.queryByText('Инвентарный номер')).not.toBeInTheDocument();
    expect(screen.getByText('Собрание')).toBeInTheDocument();
    expect(screen.getByText('Государственный Эрмитаж')).toBeInTheDocument();
  });
});

describe('маршрут перед поездкой', () => {
  it('меняет вопрос и изображение без переноса ответа', () => {
    render(<MemoryRouter><Learn icons={icons} /></MemoryRouter>);
    expect(screen.getByRole('img').getAttribute('src')).toContain('ru-95156256');
    fireEvent.click(screen.getByRole('button', { name: 'Показать объяснение' }));
    expect(document.querySelector('.ico-trip-answer')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Дальше' }));
    expect(document.querySelector('.ico-trip-answer')).not.toBeInTheDocument();
    expect(screen.getByRole('img').getAttribute('src')).toContain('ru-95156254');
    expect(screen.getByRole('button', { name: 'Показать объяснение' })).toBeInTheDocument();
  });

  it('показывает иконы выбранного ряда и молчит о ряде без примеров', () => {
    render(<MemoryRouter><Learn icons={icons} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Деисусный ряд/ }));
    const block = screen.getByText('Иконы этого ряда в коллекции').parentElement!;
    expect(within(block).getAllByRole('link').map((x) => x.getAttribute('href')))
      .toEqual(['/iconography/icon/ru-95156254', '/iconography/icon/ru-95156256']);

    fireEvent.click(screen.getByRole('button', { name: /Праздничный ряд/ }));
    const feast = screen.getByText('Иконы этого ряда в коллекции').parentElement!;
    expect(within(feast).getAllByRole('link').length).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole('button', { name: /Пророческий ряд/ }));
    expect(screen.queryByText('Иконы этого ряда в коллекции')).not.toBeInTheDocument();
  });
});

describe('счётчики фильтра сюжетов', () => {
  it('пересчитываются по выбранной традиции', () => {
    renderCatalog('/iconography/catalog');
    fireEvent.change(screen.getByRole('combobox', { name: 'Традиция' }), { target: { value: 'Грузинская' } });
    const georgian = icons.filter((x) => traditionGroup(x.tradition) === 'Грузинская');
    const options = within(screen.getByRole('combobox', { name: 'Сюжет' })).getAllByRole('option').slice(1);
    expect(options).toHaveLength(new Set(georgian.map((x) => x.subject)).size);
    for (const option of options) {
      const [, subject, count] = /^(.+) \((\d+)\)$/.exec(option.textContent!)!;
      expect(georgian.filter((x) => x.subject === subject)).toHaveLength(Number(count));
    }
  });
});

describe('портал целиком: шапка, школы и несуществующие адреса', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
      new Response(readFileSync(`public/iconography/${String(url).split('/iconography/').at(-1)}`, 'utf8'), { status: 200 }));
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  const renderPortal = (entry: string) => render(
    <HelmetProvider><MemoryRouter initialEntries={[entry]}><Location />
      <Routes><Route path="/iconography/*" element={<IconographyPortal />} /></Routes>
    </MemoryRouter></HelmetProvider>);

  it('ведёт из шапки в сравнение и школы', async () => {
    renderPortal('/iconography/catalog');
    await screen.findByRole('heading', { name: 'Коллекция' });
    const header = screen.getByRole('navigation', { name: 'Иконография' });
    expect(within(header).getAllByRole('link').map((x) => x.textContent))
      .toEqual(['Викторина', 'Коллекция', 'Практика', 'Маршрут', 'Сравнение', 'Школы']);
    fireEvent.click(within(header).getByRole('link', { name: 'Школы' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/iconography/schools');
  });

  it('показывает индекс школ со ссылками и числом примеров', async () => {
    renderPortal('/iconography/schools');
    await screen.findByRole('heading', { level: 1, name: 'О чём говорят школы' });
    const articles = screen.getAllByRole('heading', { level: 2 });
    expect(articles).toHaveLength(schools.length);
    const first = schools[0];
    expect(screen.getByRole('link', { name: first.title })).toHaveAttribute('href', `/iconography/schools/${first.id}`);
    const examples = icons.filter((x) => x.schoolId === first.id).length;
    if (examples) expect(screen.getAllByText(new RegExp(`^${examples} икон`))[0]).toBeInTheDocument();
  });

  it('уводит страницу поддержки на «О проекте», пока нет реквизитов', async () => {
    renderPortal('/iconography/support');
    await screen.findByRole('heading', { level: 1, name: 'Образы становятся понятнее' });
    expect(screen.getByTestId('location')).toHaveTextContent('/iconography/about');
    expect(screen.queryByText(/Реквизиты пока не опубликованы/)).not.toBeInTheDocument();
  });

  it('отличает несуществующую икону от обрыва связи', async () => {
    renderPortal('/iconography/icon/nonexistent-id');
    expect(await screen.findByRole('heading', { level: 1, name: 'Такой иконы нет' })).toBeInTheDocument();
    expect(screen.queryByText(/Проверьте соединение/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Открыть коллекцию' })).toHaveAttribute('href', '/iconography/catalog');
  });
});
