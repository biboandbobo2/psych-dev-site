/**
 * Ground truth для biography benchmark: ключевые факты каждой биографии
 * с годом и матчерами. Матчер `article` валидирует, что факт реально есть
 * в тексте статьи (fixture) — см. tests/benchmark/biographyGroundTruth.test.ts;
 * `timeline` — что факт представлен на итоговом таймлайне.
 *
 * critical: без этого факта таймлайн бесполезен (рождение, смерть,
 * главные поворотные точки).
 */
import type { BiographyBenchmarkFact } from './biographyBenchmarks';

export const biographyBenchmarkGroundTruth: Record<string, BiographyBenchmarkFact[]> = {
  vygotsky: [
    { id: 'birth', year: 1896, label: 'Рождение в Орше', critical: true, article: { all: [['орш']] }, timeline: { any: ['рождение', 'орш', '1896'] } },
    { id: 'gomel', year: 1897, label: 'Переезд семьи в Гомель', article: { all: [['гомель']] }, timeline: { any: ['гомель'] } },
    { id: 'moscow-university', year: 1913, label: 'Поступление в Московский университет', critical: true, article: { all: [['московск', 'университет']] }, timeline: { any: ['московск университет', 'университет'] } },
    { id: 'congress-1924', year: 1924, label: 'Доклад на психоневрологическом съезде', critical: true, article: { all: [['психоневрологическ', 'съезд']] }, timeline: { any: ['съезд', 'дебют'] } },
    { id: 'psychology-of-art', year: 1925, label: 'Психология искусства', article: { all: [['психология искусства']] }, timeline: { any: ['психология искусства'] } },
    { id: 'thinking-speech', year: 1934, label: 'Мышление и речь', critical: true, article: { all: [['мышление и речь']] }, timeline: { any: ['мышление и речь'] } },
    { id: 'death', year: 1934, label: 'Смерть от туберкулёза', critical: true, article: { all: [['туберкул']] }, timeline: { any: ['смерть', 'туберкул', 'умер'] } },
  ],
  pavlov: [
    { id: 'birth', year: 1849, label: 'Рождение в Рязани', critical: true, article: { all: [['рязан']] }, timeline: { any: ['рождение', 'рязан', '1849'] } },
    { id: 'university', year: 1870, label: 'Поступление в Петербургский университет', critical: true, article: { all: [['университет', 'поступ']] }, timeline: { any: ['университет'] } },
    { id: 'marriage', year: 1881, label: 'Брак с Серафимой Карчевской', article: { all: [['карчевск']] }, timeline: { any: ['карчевск', 'брак', 'женил'] } },
    { id: 'doctorate', year: 1883, label: 'Защита докторской диссертации', article: { all: [['диссертац']] }, timeline: { any: ['диссертац', 'докторск'] } },
    { id: 'iem', year: 1891, label: 'Отдел физиологии в ИЭМ', article: { any: ['институт экспериментальной медицины', 'иэм'] }, timeline: { any: ['экспериментальной медицины', 'иэм', 'отдел физиологии'] } },
    { id: 'nobel', year: 1904, label: 'Нобелевская премия', critical: true, article: { all: [['нобелевск']] }, timeline: { any: ['нобелевск'] } },
    { id: 'academician', year: 1907, label: 'Академик', article: { all: [['академик']] }, timeline: { any: ['академик'] } },
    { id: 'death', year: 1936, label: 'Смерть в Ленинграде', critical: true, article: { any: ['скончался', 'умер'] }, timeline: { any: ['смерть', 'скончал', 'умер'] } },
  ],
  bekhterev: [
    { id: 'birth', year: 1857, label: 'Рождение в селе Сорали', critical: true, article: { any: ['сорал', 'вятск'] }, timeline: { any: ['рождение', '1857', 'сорал', 'вятск'] } },
    { id: 'vma', year: 1873, label: 'Поступление в Медико-хирургическую академию', critical: true, article: { any: ['медико-хирургическ', 'академию'] }, timeline: { any: ['академ', 'медико'] } },
    { id: 'kazan', year: 1885, label: 'Кафедра в Казанском университете', critical: true, article: { all: [['казанск', 'университет']] }, timeline: { any: ['казан'] } },
    { id: 'psychoneuro-institute', year: 1907, label: 'Психоневрологический институт', critical: true, article: { all: [['психоневрологическ', 'институт']] }, timeline: { any: ['психоневрологическ'] } },
    { id: 'death', year: 1927, label: 'Внезапная смерть в Москве', critical: true, article: { any: ['скончался', 'умер', 'смерть'] }, timeline: { any: ['смерть', 'скончал', 'умер'] } },
  ],
  james: [
    { id: 'birth', year: 1842, label: 'Born in New York City', critical: true, article: { all: [['new york']] }, timeline: { any: ['new york', 'нью-йорк'] } },
    { id: 'md', year: 1869, label: 'MD at Harvard', critical: true, article: { all: [['harvard']] }, timeline: { any: ['harvard', 'гарвард'] } },
    { id: 'marriage', year: 1878, label: 'Married Alice Gibbens', article: { all: [['gibbens']] }, timeline: { any: ['gibbens', 'гиббенс'] } },
    { id: 'principles', year: 1890, label: 'The Principles of Psychology', critical: true, article: { all: [['principles of psychology']] }, timeline: { any: ['principles of psychology', 'принципы психологии', 'основания психологии', 'научные основы психологии'] } },
    { id: 'varieties', year: 1902, label: 'The Varieties of Religious Experience', article: { all: [['varieties of religious experience']] }, timeline: { any: ['varieties', 'многообразие религиозного опыта', 'религиозного опыта'] } },
    { id: 'death', year: 1910, label: 'Death', critical: true, article: { any: ['died'] }, timeline: { any: ['died', 'умер', 'смерть', 'скончал'] } },
  ],
  rogers: [
    { id: 'birth', year: 1902, label: 'Born in Oak Park', critical: true, article: { all: [['oak park']] }, timeline: { any: ['oak park', 'оук-парк', 'ок-парк', 'родился карл'] } },
    { id: 'phd', year: 1931, label: 'PhD at Columbia', critical: true, article: { all: [['columbia']] }, timeline: { any: ['columbia', 'колумбийск', 'доктор'] } },
    { id: 'counseling', year: 1942, label: 'Counseling and Psychotherapy', article: { all: [['counseling and psychotherapy']] }, timeline: { any: ['counseling', 'консультирован'] } },
    { id: 'client-centered', year: 1951, label: 'Client-Centered Therapy', critical: true, article: { all: [['client-centered therapy']] }, timeline: { any: ['client-centered', 'клиент-центрирован', 'центрированная терапия'] } },
    { id: 'becoming', year: 1961, label: 'On Becoming a Person', article: { all: [['on becoming a person']] }, timeline: { any: ['becoming a person', 'становлени'] } },
    { id: 'death', year: 1987, label: 'Death', critical: true, article: { any: ['died', 'death'] }, timeline: { any: ['died', 'умер', 'смерть', 'скончал'] } },
  ],
  freud: [
    { id: 'birth', year: 1856, label: 'Рождение во Фрайберге', critical: true, article: { any: ['фрайберг'] }, timeline: { any: ['рождение', 'фрайберг', '1856'] } },
    { id: 'university', year: 1873, label: 'Поступление в Венский университет', critical: true, article: { all: [['венск', 'университет']] }, timeline: { any: ['венск университет', 'университет'] } },
    { id: 'marriage', year: 1886, label: 'Брак с Мартой Бернайс', article: { any: ['бернайс'] }, timeline: { any: ['бернайс', 'март', 'брак'] } },
    { id: 'interpretation', year: 1900, label: 'Толкование сновидений', critical: true, article: { all: [['толкование сновидений']] }, timeline: { any: ['толкование сновидений', 'сновидени'] } },
    { id: 'emigration', year: 1938, label: 'Эмиграция в Лондон', critical: true, article: { all: [['лондон']] }, timeline: { any: ['лондон', 'эмигра'] } },
    { id: 'death', year: 1939, label: 'Смерть в Лондоне', critical: true, article: { any: ['скончался', 'умер', 'эвтаназ', 'морфи'] }, timeline: { any: ['смерть', 'умер', 'скончал'] } },
  ],
  erikson: [
    { id: 'birth', year: 1902, label: 'Born in Frankfurt', critical: true, article: { all: [['frankfurt']] }, timeline: { any: ['frankfurt', 'франкфурт'] } },
    { id: 'anna-freud', year: 1927, label: 'Study with Anna Freud in Vienna', critical: true, article: { all: [['anna freud']] }, timeline: { any: ['anna freud'], all: [['анн', 'фрейд']] } },
    { id: 'emigration', year: 1933, label: 'Emigration to the United States', critical: true, article: { any: ['united states', 'boston'] }, timeline: { any: ['united states', 'сша', 'соединённые штаты', 'бостон', 'эмигр'] } },
    { id: 'childhood-society', year: 1950, label: 'Childhood and Society', critical: true, article: { all: [['childhood and society']] }, timeline: { any: ['childhood and society', 'детство и общество'] } },
    { id: 'death', year: 1994, label: 'Death', critical: true, article: { any: ['died', 'death'] }, timeline: { any: ['died', 'умер', 'смерть', 'скончал'] } },
  ],
  lomonosov: [
    { id: 'birth', year: 1711, label: 'Рождение в деревне на Севере', critical: true, article: { any: ['мишанинск', 'денисовк', 'холмогор'] }, timeline: { any: ['рождение', '1711', 'мишанинск', 'денисовк'] } },
    { id: 'moscow', year: 1730, label: 'Уход в Москву', critical: true, article: { all: [['москв']] }, timeline: { any: ['москв'] } },
    { id: 'academy', year: 1731, label: 'Славяно-греко-латинская академия', critical: true, article: { any: ['славяно-греко-латинск'] }, timeline: { any: ['славяно', 'академ'] } },
    { id: 'marburg', year: 1736, label: 'Учёба в Марбурге', critical: true, article: { any: ['марбург'] }, timeline: { any: ['марбург', 'герман'] } },
    { id: 'professor', year: 1745, label: 'Профессор химии', article: { all: [['профессор', 'хими']] }, timeline: { any: ['профессор', 'хими'] } },
    { id: 'university', year: 1755, label: 'Основание Московского университета', critical: true, article: { all: [['московск', 'университет']] }, timeline: { any: ['университет'] } },
    { id: 'death', year: 1765, label: 'Смерть', critical: true, article: { any: ['скончался', 'умер'] }, timeline: { any: ['смерть', 'умер', 'скончал'] } },
  ],
  nabokov: [
    { id: 'birth', year: 1899, label: 'Рождение в Санкт-Петербурге', critical: true, article: { any: ['петербург'] }, timeline: { any: ['рождение', 'петербург', '1899'] } },
    { id: 'emigration', year: 1919, label: 'Эмиграция из России', critical: true, article: { any: ['эмигра', 'покинул'] }, timeline: { any: ['эмигра', 'крым', 'покинул'] } },
    { id: 'father-death', year: 1922, label: 'Гибель отца', article: { all: [['отц', 'убит']] }, timeline: { any: ['отц', 'отец'] } },
    { id: 'marriage', year: 1925, label: 'Брак с Верой Слоним', article: { any: ['слоним'] }, timeline: { any: ['слоним', 'вер', 'брак'] } },
    { id: 'usa', year: 1940, label: 'Переезд в США', critical: true, article: { any: ['сша', 'америк'] }, timeline: { any: ['сша', 'америк'] } },
    { id: 'lolita', year: 1955, label: 'Лолита', critical: true, article: { all: [['лолит']] }, timeline: { any: ['лолит'] } },
    { id: 'montreux', year: 1961, label: 'Переезд в Монтрё', article: { any: ['монтрё', 'монтре', 'швейцар'] }, timeline: { any: ['монтрё', 'монтре', 'швейцар'] } },
    { id: 'death', year: 1977, label: 'Смерть', critical: true, article: { any: ['скончался', 'умер'] }, timeline: { any: ['смерть', 'умер', 'скончал'] } },
  ],
  chekhov: [
    { id: 'birth', year: 1860, label: 'Рождение в Таганроге', critical: true, article: { all: [['таганрог']] }, timeline: { any: ['рождение', 'таганрог', '1860'] } },
    { id: 'university', year: 1879, label: 'Медицинский факультет Московского университета', critical: true, article: { all: [['медицинск', 'университет']] }, timeline: { any: ['медицинск', 'университет'] } },
    { id: 'sakhalin', year: 1890, label: 'Поездка на Сахалин', critical: true, article: { all: [['сахалин']] }, timeline: { any: ['сахалин'] } },
    { id: 'melikhovo', year: 1892, label: 'Покупка Мелихова', article: { all: [['мелихов']] }, timeline: { any: ['мелихов'] } },
    { id: 'seagull-mkht', year: 1898, label: 'Чайка в МХТ', article: { all: [['чайк']] }, timeline: { any: ['чайк'] } },
    { id: 'marriage', year: 1901, label: 'Брак с Ольгой Книппер', article: { all: [['книппер']] }, timeline: { any: ['книппер', 'брак'] } },
    { id: 'death', year: 1904, label: 'Смерть в Баденвайлере', critical: true, article: { any: ['баденвайлер', 'баденвейлер'] }, timeline: { any: ['смерть', 'умер', 'баденв'] } },
  ],
  schweitzer: [
    { id: 'birth', year: 1875, label: 'Рождение в Кайзерсберге', critical: true, article: { any: ['кайзерсберг', 'эльзас'] }, timeline: { any: ['рождение', '1875', 'кайзерсберг', 'эльзас'] } },
    { id: 'medicine', year: 1905, label: 'Решение изучать медицину', critical: true, article: { all: [['медицин']] }, timeline: { any: ['медицин'] } },
    { id: 'lambarene', year: 1913, label: 'Больница в Ламбарене', critical: true, article: { all: [['ламбарене']] }, timeline: { any: ['ламбарене', 'африк', 'габон'] } },
    { id: 'nobel', year: 1952, label: 'Нобелевская премия мира', critical: true, article: { all: [['нобелевск']] }, timeline: { any: ['нобелевск'] } },
    { id: 'death', year: 1965, label: 'Смерть в Ламбарене', critical: true, article: { any: ['скончался', 'умер'] }, timeline: { any: ['смерть', 'умер', 'скончал'] } },
  ],
  lazursky: [
    { id: 'birth', year: 1874, label: 'Рождение в Переяславе', critical: true, article: { any: ['переяслав'] }, timeline: { any: ['рождение', '1874', 'переяслав'] } },
    { id: 'vma', year: 1897, label: 'Окончание Военно-медицинской академии', critical: true, article: { any: ['военно-медицинск'] }, timeline: { any: ['военно-медицинск', 'академ'] } },
    { id: 'ocherk', year: 1906, label: 'Очерк науки о характерах', article: { all: [['очерк науки о характерах']] }, timeline: { any: ['очерк', 'характер'] } },
    { id: 'classification', year: 1913, label: 'Доклад о классификации личностей', critical: true, article: { all: [['классификаци', 'личност']] }, timeline: { any: ['классификаци', 'личност'] } },
    { id: 'death', year: 1917, label: 'Смерть', critical: true, article: { any: ['скончался', 'умер'] }, timeline: { any: ['смерть', 'умер', 'скончал'] } },
  ],
  wundt: [
    { id: 'birth', year: 1832, label: 'Born in Neckarau', critical: true, article: { any: ['neckarau'] }, timeline: { any: ['neckarau', 'неккарау', 'wundt родился', '1832'] } },
    { id: 'helmholtz', year: 1858, label: 'Assistant to Helmholtz', critical: true, article: { all: [['helmholtz']] }, timeline: { any: ['helmholtz', 'гельмгольц', 'гейдельберг'] } },
    { id: 'principles', year: 1874, label: 'Principles of Physiological Psychology', critical: true, article: { all: [['physiological psychology']] }, timeline: { any: ['physiological psychology', 'физиологической психологии', 'физиологическая психология'] } },
    { id: 'leipzig', year: 1875, label: 'Professor at Leipzig', critical: true, article: { all: [['leipzig']] }, timeline: { any: ['leipzig', 'лейпциг'] } },
    { id: 'laboratory', year: 1879, label: 'First psychology laboratory', critical: true, article: { all: [['laborator']] }, timeline: { any: ['laborator', 'лаборатор'] } },
    { id: 'death', year: 1920, label: 'Death', critical: true, article: { any: ['died', 'death'] }, timeline: { any: ['died', 'умер', 'смерть', 'скончал'] } },
  ],
  frankl: [
    { id: 'birth', year: 1905, label: 'Рождение в Вене', critical: true, article: { any: ['вен'] }, timeline: { any: ['рождение', '1905', 'вен'] } },
    { id: 'camps', year: 1942, label: 'Депортация в концлагерь', critical: true, article: { any: ['концлагер', 'терезиенштадт', 'освенцим', 'аушвиц'] }, timeline: { any: ['концлагер', 'лагер', 'терезиенштадт', 'освенцим', 'аушвиц'] } },
    { id: 'book', year: 1946, label: 'Сказать жизни «Да»', critical: true, article: { any: ['сказать жизни', 'психолог в концлагере', 'человек в поисках смысла'] }, timeline: { any: ['сказать жизни', 'поисках смысла', 'книг'] } },
    { id: 'death', year: 1997, label: 'Смерть', critical: true, article: { any: ['скончался', 'умер'] }, timeline: { any: ['смерть', 'умер', 'скончал'] } },
  ],
  kovalevskaya: [
    { id: 'birth', year: 1850, label: 'Рождение в Москве', critical: true, article: { all: [['москв']] }, timeline: { any: ['рождение', '1850', 'москв'] } },
    { id: 'marriage', year: 1868, label: 'Фиктивный брак с Ковалевским', critical: true, article: { all: [['ковалевск', 'брак']] }, timeline: { any: ['брак', 'ковалевск'] } },
    { id: 'weierstrass', year: 1870, label: 'Занятия у Вейерштрасса', critical: true, article: { any: ['вейерштрасс'] }, timeline: { any: ['вейерштрасс', 'берлин'] } },
    { id: 'phd', year: 1874, label: 'Степень доктора философии', critical: true, article: { any: ['доктор', 'гёттинген', 'геттинген'] }, timeline: { any: ['доктор', 'гёттинген', 'геттинген'] } },
    { id: 'stockholm', year: 1884, label: 'Профессор в Стокгольме', critical: true, article: { all: [['стокгольм']] }, timeline: { any: ['стокгольм', 'профессор'] } },
    { id: 'death', year: 1891, label: 'Смерть в Стокгольме', critical: true, article: { any: ['скончалась', 'умерла'] }, timeline: { any: ['смерть', 'умерла', 'скончал'] } },
  ],

  // ===== holdout — метчеры пишутся один раз, НЕ подгонять =====
  luria: [
    { id: 'birth', year: 1902, label: 'Рождение в Казани', critical: true, article: { all: [['казан']] }, timeline: { any: ['рождение', '1902', 'казан'] } },
    { id: 'vygotsky', year: 1924, label: 'Начало работы с Выготским', critical: true, article: { any: ['выготск'] }, timeline: { any: ['выготск'] } },
    { id: 'death', year: 1977, label: 'Смерть', critical: true, article: { any: ['скончался', 'умер'] }, timeline: { any: ['смерть', 'умер', 'скончал'] } },
  ],
  skinner: [
    { id: 'birth', year: 1904, label: 'Born in Susquehanna', critical: true, article: { any: ['susquehanna'] }, timeline: { any: ['susquehanna', 'саскуэханн', 'сускуэханн', 'пенсильван', 'родился беррес'] } },
    { id: 'phd', year: 1931, label: 'PhD at Harvard', critical: true, article: { all: [['harvard']] }, timeline: { any: ['harvard', 'гарвард'] } },
    { id: 'behavior-organisms', year: 1938, label: 'The Behavior of Organisms', critical: true, article: { all: [['behavior of organisms']] }, timeline: { any: ['behavior of organisms', 'поведение организмов'] } },
    { id: 'walden', year: 1948, label: 'Walden Two', article: { all: [['walden two']] }, timeline: { any: ['walden', 'уолден', 'волден'] } },
    { id: 'death', year: 1990, label: 'Death', critical: true, article: { any: ['died', 'death', 'leukemia'] }, timeline: { any: ['died', 'умер', 'смерть', 'скончал'] } },
  ],
  curie: [
    { id: 'birth', year: 1867, label: 'Рождение в Варшаве', critical: true, article: { all: [['варшав']] }, timeline: { any: ['рождение', '1867', 'варшав'] } },
    { id: 'sorbonne', year: 1891, label: 'Переезд в Париж, Сорбонна', critical: true, article: { any: ['сорбонн', 'париж'] }, timeline: { any: ['сорбонн', 'париж'] } },
    { id: 'marriage', year: 1895, label: 'Брак с Пьером Кюри', critical: true, article: { all: [['пьер']] }, timeline: { any: ['пьер', 'брак'] } },
    { id: 'radium', year: 1898, label: 'Открытие радия и полония', critical: true, article: { any: ['радий', 'радия', 'полони'] }, timeline: { any: ['ради', 'полони'] } },
    { id: 'nobel-physics', year: 1903, label: 'Нобелевская премия по физике', critical: true, article: { all: [['нобелевск', 'физик']] }, timeline: { any: ['нобелевск'] } },
    { id: 'pierre-death', year: 1906, label: 'Гибель Пьера', article: { all: [['пьер', 'погиб']] }, timeline: { any: ['пьер', 'гибель', 'смерть'] } },
    { id: 'nobel-chemistry', year: 1911, label: 'Нобелевская премия по химии', critical: true, article: { all: [['нобелевск', 'хими']] }, timeline: { any: ['хими', 'нобелевск'] } },
    { id: 'death', year: 1934, label: 'Смерть', critical: true, article: { any: ['скончалась', 'умерла'] }, timeline: { any: ['смерть', 'умерла', 'скончал'] } },
  ],
  blonsky: [
    { id: 'birth', year: 1884, label: 'Рождение в Киеве', critical: true, article: { all: [['киев']] }, timeline: { any: ['рождение', '1884', 'киев'] } },
    { id: 'pedology', year: 1925, label: 'Педология', critical: true, article: { any: ['педолог'] }, timeline: { any: ['педолог'] } },
    { id: 'death', year: 1941, label: 'Смерть', critical: true, article: { any: ['скончался', 'умер'] }, timeline: { any: ['смерть', 'умер', 'скончал'] } },
  ],
  piaget: [
    { id: 'birth', year: 1896, label: 'Born in Neuchâtel', critical: true, article: { any: ['neuchatel', 'neuchâtel'] }, timeline: { any: ['neuchatel', 'невшател', 'родился жан'] } },
    { id: 'phd', year: 1918, label: 'PhD in natural sciences', critical: true, article: { any: ['doctorate', 'phd'] }, timeline: { any: ['doctorate', 'доктор', 'диссертац'] } },
    { id: 'rousseau', year: 1921, label: 'Rousseau Institute in Geneva', critical: true, article: { any: ['rousseau'] }, timeline: { any: ['rousseau', 'руссо', 'женев'] } },
    { id: 'death', year: 1980, label: 'Death', critical: true, article: { any: ['died', 'death'] }, timeline: { any: ['died', 'умер', 'смерть', 'скончал'] } },
  ],
};
