import { describe, expect, it } from 'vitest';
import { composeBiographyPlanFromFacts } from '../../server/api/timelineBiographyComposer.js';
import { parseLineBasedBiographyFactCandidates } from '../../server/api/timelineBiographyFacts.js';

describe('timelineBiographyComposer', () => {
  it('строит main line с насыщенной ранней жизнью и не якорит ветки к рождению', () => {
    const facts = parseLineBasedBiographyFactCandidates([
      'FACT\t1799\t0\tbirth\tfamily\thigh\tРождение\tРодился в Москве.',
      'FACT\t1805\t6\teducation\teducation\tmedium\tУвлечение чтением\tМного читал в домашней библиотеке.',
      'FACT\t1811\t12\teducation\teducation\thigh\tПоступление в лицей\tНачал обучение в Царскосельском лицее.',
      'FACT\t1815\t16\tpublication\tcreativity\thigh\tПервое признание\tПолучил известность после лицейского выступления.',
      'FACT\t1817\t18\tcareer\tcareer\tmedium\tНачало службы\tПоступил на службу после окончания лицея.',
      'FACT\t1820\t21\tpublication\tcreativity\thigh\t«Руслан и Людмила»\tОпубликовал поэму.',
      'FACT\t1822\t23\tfriends\tfriends\tmedium\tЛитературный круг\tВошёл в литературное общество.',
      'FACT\t1824\t25\tmove\tplace\thigh\tЮжная ссылка\tБыл сослан на юг.',
      'FACT\t1825\t26\tproject\tcreativity\thigh\t«Борис Годунов»\tЗавершил драму «Борис Годунов».',
      'FACT\t1831\t31\tfamily\tfamily\thigh\tБрак с Натальей Гончаровой\tЖенился.',
      'FACT\t1833\t34\tpublication\tcreativity\thigh\t«Евгений Онегин»\tЗавершил роман в стихах.',
      'FACT\t1836\t37\tpublication\tcreativity\tmedium\t«Современник»\tОсновал журнал «Современник».',
      'FACT\t1837\t37\tdeath\thealth\thigh\tДуэль и смерть\tПогиб после дуэли.',
    ].join('\n'));

    const result = composeBiographyPlanFromFacts({
      facts,
      articleTitle: 'Пушкин, Александр Сергеевич',
      extract: 'Пушкин родился в 1799 году и погиб в 1837 году.',
    });

    expect(result.plan.mainEvents.filter((event) => event.age <= 18).length).toBeGreaterThanOrEqual(4);
    expect(result.plan.mainEvents.every((event) => Boolean(event.notes?.trim()))).toBe(true);
    expect(result.plan.branches.length).toBeGreaterThanOrEqual(1);
    expect(result.plan.branches.every((branch) => branch.sourceMainEventIndex > 0)).toBe(true);
  });
});
