/* eslint-disable */
import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  useParams,
  Navigate,
} from "react-router-dom";

/* ------------------------------------------------------------------
 🎨  GLOBAL STYLES — шрифт Inter, минимальный reset, светлая/тёмная тема
-------------------------------------------------------------------*/
const globalStyles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html{font-family:'Inter',system-ui,-apple-system,sans-serif;scroll-behavior:smooth}
body{background:#f9fafb;color:#1f2937;line-height:1.55;}
a{color:#4f46e5;text-decoration:none;font-weight:500}
a:hover{text-decoration:underline}

/* LAYOUT */
.app{display:flex;min-height:100vh}
nav{width:270px;background:#fff;border-right:1px solid #e5e7eb;padding:1rem;position:sticky;top:0;height:100vh;overflow-y:auto}
nav ul{display:flex;flex-direction:column;gap:.25rem}
nav a{display:block;padding:.5rem .75rem;border-radius:8px}
nav a.active{background:#a5b4fd;color:#1e1b4b;font-weight:600}
main{flex:1;max-width:960px;margin:0 auto;padding:2rem 1rem}

/* CARDS & DETAILS */
.card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:1rem;margin-bottom:1rem;transition:box-shadow .2s}
.card:hover{box-shadow:0 3px 8px rgba(0,0,0,.05)}
summary{cursor:pointer;list-style:none;padding:.5rem;border-radius:8px;font-weight:600}
details[open] summary{background:#eef2ff}
iframe{width:100%;aspect-ratio:16/9;border:0;border-radius:12px}

@media(max-width:768px){nav{position:fixed;left:0;top:0;transform:translateX(-100%);transition:transform .3s}nav.open{transform:none}main{padding:4.5rem 1rem}
.toggle-btn{position:fixed;top:1rem;left:1rem;background:#4f46e5;color:#fff;border:none;padding:.5rem .75rem;border-radius:8px;font-size:1rem;z-index:1000}}

@media(prefers-color-scheme:dark){body{background:#111827;color:#e5e7eb}nav{background:#1f2937;border-color:#374151}nav a.active{background:#3730a3;color:#fff}a{color:#a5b4fd}.card{background:#1f2937;border-color:#374151}details[open] summary{background:#312e81}}
`;

function StyleInjector() {
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = globalStyles;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
  return null;
}

/* ------------------------------------------------------------------
   🔢  DATA: полный periodData со всеми возрастами и 12 рубриками
-------------------------------------------------------------------*/
const periodData = {
  prenatal: {
    label: "Пренатальный период",
    ageRange: "Зачатие – рождение",
    videoLecture: "https://www.youtube.com/embed/XzVAzrp-rFA", // Psychology 101 Prenatal Development
    concepts: [
      "ректальное программирование",
      "Тератогены",
      "Сенсорное развитие in‑utero",
      "Материнский стресс и кортизол",
    ],
    keyAuthors: ["Thomas Verny", "David Barker", "Vivette Glover"],
    coreLiterature: [
      "Verny T. & Kelly J. (1981). The Secret Life of the Unborn Child.",
      "Barker D. (1998). Mothers, Babies and Health in Later Life.",
      "Glover V. (2014). Prenatal Stress and Child Development.",
    ],
    extraLiterature: [
      "Krasnegor N. & Blass E. (1987). Perinatal Development.",
      "Beddoe L. et al. (2015). Maternal Stress in Pregnancy.",
    ],
    extraVideos: [
      "https://www.youtube.com/embed/WncJ2UVesJM", // Crash Course prenatal
    ],
    quiz: [
      {
        q: "На какой неделе гестации плод начинает слышать?",
        options: ["10‑я", "20‑я", "30‑я"],
        answer: "20‑я",
      },
    ],
    selfQuestions: [
      "Какие эмоции я испытываю, думая о внутриутробной жизни?",
      "Что для меня значит связь матери и ребёнка до рождения?",
    ],
    egpPrism: [
      "Полная зависимость от физиологического состояния матери",
      "Отсутствие собственной автономии",
    ],
    leisure: [
      "Фильм: ‘Дитя человеческое’ (2006)",
      "Книга: ‘Тайная жизнь нерождённого ребёнка’ (Верни, 1981)",
    ],
    modernResearch: [
      "Gunnar & Quevedo (2020) The neurobiology of stress in utero.",
    ],
    experimentalPsychology: [
      "Исследование ДеКаспера и Спенс (1986) о предпочтительном прослушивании.",
    ],
  },
  "0-1": {
    label: "Младенчество",
    ageRange: "0 – 1 год",
    videoLecture: "https://www.youtube.com/embed/QYd1MFyCVfw", // Attachment theory lecture
    concepts: [
      "Привязанность (secure / insecure)",
      "Сенсомоторный интеллект",
      "Импринтинг и лицо‑распознавание",
    ],
    keyAuthors: ["John Bowlby", "Mary Ainsworth", "Jean Piaget"],
    coreLiterature: [
      "Bowlby J. (1969). Attachment and Loss, Vol. 1.",
      "Ainsworth M. et al. (1978). Patterns of Attachment.",
      "Piaget J. (1952). The Origins of Intelligence in Children.",
    ],
    extraLiterature: [
      "Papalia D., Martorell G. (2021). Experience Human Development.",
      "Tronick E. (2007). The Neurobehavioral and Social Emotional Development of Infants.",
    ],
    extraVideos: [
      "https://www.youtube.com/embed/xot1B5E5oOo", // Bowlby & Ainsworth pt2
    ],
    quiz: [
      {
        q: "Что измеряет процедура ‘Странная ситуация’ Ainsworth?",
        options: ["Когнитивное развитие", "Привязанность", "Моральное суждение"],
        answer: "Привязанность",
      },
    ],
    selfQuestions: [
      "Какие способы утешения младенца я знаю?",
      "Как я реагирую на детский плач?",
    ],
    egpPrism: [
      "Базовая надежность окружающего мира (Erikson: Trust vs Mistrust)",
      "Физиологическая регуляция сна и кормления",
    ],
    leisure: [
      "Фильм: ‘Малыш’ (2010)",
      "Док‑сериал: ‘Babies’ (Netflix, 2020)",
    ],
    modernResearch: [
      "Tottenham N. (2021) The development of emotion regulation in infancy.",
    ],
    experimentalPsychology: [
      "Still‑Face Paradigm (Tronick, 1978)",
    ],
  },
  "1-3": {
    label: "Раннее детство (Toddlerhood)",
    ageRange: "1 – 3 года",
    videoLecture: "https://www.youtube.com/embed/NCdLNuP7OA8", // Sensorimotor object permanence
    concepts: [
      "Автономия vs. сомнение / стыд (Erikson)",
      "Развитие речи и лексический взрыв",
      "Символическая игра",
    ],
    keyAuthors: ["Erik Erikson", "Lev Vygotsky", "Patricia Kuhl", "Andrew Meltzoff"],
    coreLiterature: [
      "Erikson E. (1963). Childhood and Society.",
      "Vygotsky L. (1978). Mind in Society.",
      "Gopnik A., Meltzoff A., & Kuhl P. (1999). The Scientist in the Crib.",
    ],
    extraLiterature: [
      "Shonkoff J. & Phillips D. (2000). From Neurons to Neighborhoods.",
    ],
    extraVideos: [
      "https://www.youtube.com/embed/Vuv8hlNzEL8", // Infant & Toddler cognitive development
    ],
    quiz: [
      {
        q: "В каком возрасте большинство детей проходят тест ‘Руж’ на самораспознавание?",
        options: ["12 мес", "18 мес", "30 мес"],
        answer: "18 мес",
      },
    ],
    selfQuestions: [
      "Как я поддерживаю любопытство ребёнка?",
      "Какие безопасные границы я устанавливаю?",
    ],
    egpPrism: [
      "Формирование базовой автономии",
      "Начало саморегуляции поведения",
    ],
    leisure: [
      "Книга: ‘Малыш и Карлсон’ (А. Линдгрен)",
      "Фильм: ‘Бэби‑босс’ (2017)",
    ],
    modernResearch: [
      "Meltzoff A. (2020) Imitation and social learning in toddlers.",
    ],
    experimentalPsychology: [
      "Тест ‘Руж’ (Gallup, 1970)",
      "A‑not‑B Task (Piaget, 1954)",
    ],
  },
  "3-6": {
    label: "Дошкольный возраст",
    ageRange: "3 – 6 лет",
    videoLecture: "https://www.youtube.com/embed/GLj0IZFLKvg", // Preoperational stage lack of conservation
    concepts: [
      "Инициатива vs. вина (Erikson)",
      "Игровая деятельность",
      "Теория разума",
      "Эгоцентризм",
    ],
    keyAuthors: ["Jean Piaget", "Lev Vygotsky", "Paul Harris"],
    coreLiterature: [
      "Piaget J. (1951). Play, Dreams and Imitation in Childhood.",
      "Harris P. (2000). The Work of the Imagination.",
      "Berk L. (2022). Child Development, 10e.",
    ],
    extraLiterature: [
      "Goswami U. (2014). Cognitive Development.",
    ],
    extraVideos: [
      "https://www.youtube.com/embed/M244b2aDcz8", // Preoperational stage
    ],
    quiz: [
      {
        q: "В каком возрасте дети обычно проходят ‘тест батончика’ на ложное убеждение?",
        options: ["3 года", "4 года", "6 лет"],
        answer: "4 года",
      },
    ],
    selfQuestions: [
      "Как я реагирую на детские ‘почему’?",
      "Как я поддерживаю игру ребёнка?",
    ],
    egpPrism: [
      "Развитие самоконтроля",
      "Формирование воображения и сюжетной игры",
    ],
    leisure: [
      "Книга: ‘Маленький принц’ (А. де Сент‑Экзюпери)",
      "Мультфильм: ‘Головоломка’ (2015)",
    ],
    modernResearch: [
      "Wellman H. (2018) Theory of Mind Scale studies.",
    ],
    experimentalPsychology: [
      "Тест ложного убеждения ‘Smarties’ (Perner, 1987)",
      "Задачи на сохранение количества (Piaget)",
    ],
  },
  "6-11": {
    label: "Младший школьный возраст",
    ageRange: "6 – 11 лет",
    videoLecture: "https://www.youtube.com/embed/7o0iO6-q2cQ", // Concrete operational stage in 3 minutes
    concepts: [
      "Индустрия vs. неполноценность (Erikson)",
      "Конкретные операции",
      "Моральное рассуждение (Kohlberg)",
      "Метапамять и внимание",
    ],
    keyAuthors: ["Lawrence Kohlberg", "John Flavell", "Carol Dweck"],
    coreLiterature: [
      "Kohlberg L. (1981). Essays on Moral Development, Vol. 1.",
      "Flavell J. (1999). Cognitive Development.",
      "Dweck C. (2006). Mindset.",
    ],
    extraLiterature: [
      "Kail R. (2023). Children and Their Development, 10e.",
    ],
    extraVideos: [
      "https://www.youtube.com/embed/EZxkL6hcCvw", // Concrete operational stage explained
    ],
    quiz: [
      {
        q: "Какая стадия морального развития у большинства школьников по Kohlberg?",
        options: ["Доконвенциональная", "Конвенциональная", "Постконвенциональная"],
        answer: "Конвенциональная",
      },
    ],
    selfQuestions: [
      "Какие занятия помогают ребёнку чувствовать компетентность?",
    ],
    egpPrism: [
      "Развитие академических навыков",
      "Формирование самооценки и роли ученика",
    ],
    leisure: [
      "Фильм: ‘Матильда’ (1996)",
      "Книга: ‘Дети капитана Гранта’ (Ж. Верн)",
    ],
    modernResearch: [
      "Roediger & McDermott (2022) Metacognition in middle childhood.",
    ],
    experimentalPsychology: [
      "Задача на обратную классификацию (DCCS)",
    ],
  },
  "11-14": {
    label: "Ранняя подростковость",
    ageRange: "11 – 14 лет",
    videoLecture: "https://www.youtube.com/embed/udtNyOd1T6E", // Early adolescence lecture
    concepts: [
      "Пубертат",
      "Ускоренный рост мозга (synaptic pruning)",
      "Интимные дружбы",
    ],
    keyAuthors: ["Laurence Steinberg", "Jay Giedd", "Deborah Tolman"],
    coreLiterature: [
      "Steinberg L. (2017). Adolescence, 12e.",
      "Blakemore S. (2018). Inventing Ourselves.",
    ],
    extraLiterature: [
      "Patton G. & Viner R. (2007). Global patterns of adolescent health.",
    ],
    extraVideos: [
      "https://www.youtube.com/embed/xY6I20LNuqI", // Adolescent development webinar
    ],
    quiz: [
      {
        q: "Какая структура мозга особенно чувствительна к дофамину в пубертате?",
        options: ["Миндалевидное тело", "Нucleus accumbens", "Можечок"],
        answer: "Нucleus accumbens",
      },
    ],
    selfQuestions: [
      "Как я относился к своему телу в начале пубертата?",
    ],
    egpPrism: [
      "Начало формирования идентичности",
      "Рост автономии от родителей",
    ],
    leisure: [
      "Сериал: ‘Все мои друзья мертвы’ (2020) — о подростковых рисках",
      "Книга: ‘Псоглавцы’ (М. Брэдбери)",
    ],
    modernResearch: [
      "Giedd J. (2019) Structural MRI of adolescent brain development.",
    ],
    experimentalPsychology: [
      "Go/No‑Go задачи на импульс‑контроль",
    ],
  },
  "14-18": {
    label: "Подростковость",
    ageRange: "14 – 18 лет",
    videoLecture: "https://www.youtube.com/embed/PzyXGUCngoU", // CrashCourse Adolescence
    concepts: [
      "Идентичность vs. ролевое смешение (Erikson)",
      "Абстрактное мышление (Piaget: формальные операции)",
      "Сравнение со сверстниками",
    ],
    keyAuthors: ["James Marcia", "Susan Harter", "Albert Bandura"],
    coreLiterature: [
      "Marcia J. (1980). Ego Identity development.",
      "Harter S. (2012). The Construction of the Self.",
      "Bandura A. (1986). Social Foundations of Thought and Action.",
    ],
    extraLiterature: [
      "Arnett J. (2015). Age of Opportunity.",
    ],
    extraVideos: [
      "https://www.youtube.com/embed/g1Vm3lf5CFU", // Identity vs role confusion lecture
    ],
    quiz: [
      {
        q: "Какой статус идентичности описывает высокий поиск + низкую приверженность?",
        options: ["Достижение", "Мораторий", "Диффузия"],
        answer: "Мораторий",
      },
    ],
    selfQuestions: [
      "Какие мои главные ценности в 17 лет?",
    ],
    egpPrism: [
      "Эксперименты с ролями и взглядами",
      "Новые отношения ‘равный‑равному’",
    ],
    leisure: [
      "Фильм: ‘Книжный вор’ (2013)",
      "Роман: ‘Над пропастью во ржи’ (Д. Сэлинджер)",
    ],
    modernResearch: [
      "Crone & Dahl (2012) Risk taking in adolescence.",
    ],
    experimentalPsychology: [
      "Игра ‘Баллон’ (BART) для оценки склонности к риску",
    ],
  },
  "18-25": {
    label: "Юность / Emerging Adulthood",
    ageRange: "18 – 25 лет",
    videoLecture: "https://www.youtube.com/embed/Y_f8DmU-gQQ", // Arnett Emerging adulthood
    concepts: [
      "Переход к самостоятельности",
      "Идентичность работы и любви",
      "Флексибильность мышления (post‑formal) ",
    ],
    keyAuthors: ["Jeffrey Jensen Arnett", "Gisela Labouvie‑Vief", "Nancy Schlossberg"],
    coreLiterature: [
      "Arnett J. (2004). Emerging Adulthood.",
      "Labouvie‑Vief G. (2006). Integrating Emotion in Adult Thinking.",
    ],
    extraLiterature: [
      "Tanner J. & Arnett J. (2011). Emerging Adults in America.",
    ],
    extraVideos: [
      "https://www.youtube.com/embed/ZozjwZ0Kqxo", // Emerging adulthood explained
    ],
    quiz: [
      {
        q: "Какое главный критерий взрослости по Arnett (2015)?",
        options: ["Завершение образования", "Финансовая независимость", "Ответственность за себя"],
        answer: "Ответственность за себя",
      },
    ],
    selfQuestions: [
      "В чём проявляется моя самостоятельность сейчас?",
    ],
    egpPrism: [
      "Выбор профессии",
      "Формирование устойчивых отношений",
    ],
    leisure: [
      "Фильм: ‘Ла‑Ла Ленд’ (2016)",
      "Книга: ‘Над пропастью во ржи’ (повторно актуальна)",
    ],
    modernResearch: [
      "Arnett & Mitra (2023) Mental health in emerging adults.",
    ],
    experimentalPsychology: [
      "Игра ‘Iowa Gambling Task’ в study‑skills context",
    ],
  },
  "25-40": {
    label: "Ранний взрослый возраст",
    ageRange: "25 – 40 лет",
    videoLecture: "https://www.youtube.com/embed/3J28i6wwoLM", // Early adulthood lecture
    concepts: [
      "Интимность vs. изоляция (Erikson)",
      "Карьерные траектории",
      "Пост‑формальное мышление",
    ],
    keyAuthors: ["Daniel Levinson", "Robert Sternberg", "Susan Hendrick"],
    coreLiterature: [
      "Levinson D. (1978). The Seasons of a Man's Life.",
      "Sternberg R. (1986). Triangular Theory of Love.",
    ],
    extraLiterature: [
      "Feldman R. (2022). Development Across the Life Span, 10e.",
    ],
    extraVideos: [
      "https://www.youtube.com/embed/1L7jB1wJPVE", // Adulthood psychosocial lecture
    ],
    quiz: [
      {
        q: "Какой компонент ‘Треугольной любви’ отвечает за страсть?",
        options: ["Интимность", "Страсть", "Обязательство"],
        answer: "Страсть",
      },
    ],
    selfQuestions: [
      "Как я поддерживаю баланс ‘работа‑личная жизнь’?",
    ],
    egpPrism: [
      "Построение долгосрочных отношений",
      "Достижение карьерных целей",
    ],
    leisure: [
      "Фильм: ‘До встречи с тобой’ (2016)",
      "Роман: ‘Есть, молиться, любить’ (Э. Гилберт)",
    ],
    modernResearch: [
      "King (2019) Work‑family balance in early adulthood.",
    ],
    experimentalPsychology: [
      "Implicit Association Test для романтических отношений",
    ],
  },
  "40-65": {
    label: "Средний возраст (Midlife)",
    ageRange: "40 – 65 лет",
    videoLecture: "https://www.youtube.com/embed/dTezsTo4geQ", // Middle adulthood lecture
    concepts: [
      "Генеративность vs. стагнация (Erikson)",
      "‘Поворот середины жизни’",
      "Когнитивная кристаллизация",
    ],
    keyAuthors: ["Daniel Levinson", "Margie Lachman", "George Vaillant"],
    coreLiterature: [
      "Lachman M. (2004). Handbook of Midlife Development.",
      "Vaillant G. (1977). Adaptation to Life.",
    ],
    extraLiterature: [
      "Brim O. et al. (2004). How Healthy Are We? A National Study of Well‑Being at Midlife.",
    ],
    extraVideos: [
      "https://www.youtube.com/embed/77lB2_Id1GA", // Generativity vs stagnation
    ],
    quiz: [
      {
        q: "Какое чувство является ‘добродетелью’ успешно пройденной стадии по Erikson?",
        options: ["Надежда", "Забота", "Мудрость"],
        answer: "Забота",
      },
    ],
    selfQuestions: [
      "Какую пользу обществу я приношу сейчас?",
    ],
    egpPrism: [
      "Вклад в следующее поколение",
      "Переоценка жизненных целей",
    ],
    leisure: [
      "Фильм: ‘American Beauty’ (1999)",
      "Книга: ‘Ешь. Молись. Люби’ повторная читка под новым углом",
    ],
    modernResearch: [
      "Lachman M. (2020) Psychosocial factors in midlife health.",
    ],
    experimentalPsychology: [
      "Stroop‑тест на возрастные различия внимания",
    ],
  },
  "65-80": {
    label: "Пожилой возраст",
    ageRange: "65 – 80 лет",
    videoLecture: "https://www.youtube.com/embed/cBRMMdVkvJA", // Late adulthood psychosocial changes
    concepts: [
      "Целостность vs. отчаяние (Erikson)",
      "Селективная оптимизация с компенсацией (Baltes)",
      "Сокращение социальной сети",
    ],
    keyAuthors: ["Paul Baltes", "Laura Carstensen", "George Vaillant"],
    coreLiterature: [
      "Baltes P. & Baltes M. (1990). Successful Aging.",
      "Carstensen L. (1999). Socioemotional Selectivity Theory.",
      "Schaie K. & Willis S. (2016). Adult Development and Aging.",
    ],
    extraLiterature: [
      "Rowe J. & Kahn R. (1998). Successful Aging.",
    ],
    extraVideos: [
      "https://www.youtube.com/embed/9Ceo_yXSnM8", // Cognitive changes late adulthood
    ],
    quiz: [
      {
        q: "Какой компонент SOC‑модели отвечает за ‘выбор главных целей’?",
        options: ["Селекция", "Оптимизация", "Компенсация"],
        answer: "Селекция",
      },
    ],
    selfQuestions: [
      "Как я осмысляю прожитую жизнь?",
    ],
    egpPrism: [
      "Переоценка жизненного пути и наследия",
      "Адаптация к физическим ограничениям",
    ],
    leisure: [
      "Фильм: ‘Лучшее предложение’ (2013)",
      "Книга: ‘Время жить и время умирать’ (Э. М. Ремарк)",
    ],
    modernResearch: [
      "Carstensen L. (2023) Positivity effect in older adults.",
    ],
    experimentalPsychology: [
      "Salthouse (1996) Определение когнитивной скорости",
    ],
  },
  "80+": {
    label: "Глубокая старость",
    ageRange: "80+ лет",
    videoLecture: "https://www.youtube.com/embed/1100-09", // Lifespan Late adulthood (placeholder shorter video if removed)
    concepts: [
      "Геротрансценденция (Tornstam)",
      "Уязвимость и резильентность",
      "Интегративная память",
    ],
    keyAuthors: ["Lars Tornstam", "Jon Hendricks"],
    coreLiterature: [
      "Tornstam L. (2005). Gerotranscendence: A Developmental Theory of Positive Aging.",
      "Hooyman N. & Kiyak A. (2019). Social Gerontology, 10e.",
    ],
    extraLiterature: [
      "Hendricks J. (2012). Healthy Aging.",
    ],
    extraVideos: [
      "https://www.youtube.com/embed/9EJshnOtiDQ", // Psychosocial dev late adulthood activity
    ],
    quiz: [
      {
        q: "Как Tornstam называет переход к более космической перспективе?",
        options: ["Трансцендирование", "Геротрансценденция", "Мудрость"],
        answer: "Геротрансценденция",
      },
    ],
    selfQuestions: [
      "Как я вижу своё место во вселенной?",
    ],
    egpPrism: [
      "Духовная переоценка",
      "Сокращение материальных потребностей",
    ],
    leisure: [
      "Фильм: ‘Амур’ (2012)",
      "Книга: ‘Ночной полёт’ (А. де Сент‑Экзюпери) перечитать под иным углом",
    ],
    modernResearch: [
      "Daatland S. (2022) Quality of life in the fourth age.",
    ],
    experimentalPsychology: [
      "Wisdom Paradigm (Ardelt, 2004)",
    ],
  },
};

/* ------------------------------------------------------------------
   🔧  HELPERS
-------------------------------------------------------------------*/
const periodKeys = Object.keys(periodData);

function AgeNav({ isOpen }) {
  return (
    <nav className={isOpen ? "open" : ""}>
      <ul>
        {periodKeys.map((key) => (
          <li key={key}>
            <NavLink
              to={`/${key}`}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {periodData[key].label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function SectionCard({ title, children, collapsible = false }) {
  if (!children) return null;
  if (collapsible) {
    return (
      <details className="card">
        <summary>{title}</summary>
        {children}
      </details>
    );
  }
  return (
    <div className="card">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

function PeriodPage() {
  const { id } = useParams();
  const data = periodData[id] || periodData[periodKeys[0]];
  if (!data) return <p>Возрастная категория не найдена</p>;
  return (
    <section>
      <h1 style={{ fontSize: "1.6rem", marginBottom: "0.75rem" }}>
        {data.label} {" "}
        <span style={{ fontWeight: 400, color: "#6b7280" }}>({data.ageRange})</span>
      </h1>

      {/* 📺 Видео‑лекция */}
      {data.videoLecture && (
        <div className="card">
          <iframe
            src={data.videoLecture}
            title="Video lecture"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      )}

      {/* Generic render function for list fields */}
      {[
        ["Ключевые понятия", data.concepts],
        ["Ключевые авторы", data.keyAuthors],
      ].map(([title, arr]) =>
        arr?.length ? (
          <SectionCard key={title} title={title}>
            <ul style={{ paddingLeft: "1rem" }}>
              {arr.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </SectionCard>
        ) : null
      )}

      {[
        ["Основная литература", data.coreLiterature],
        ["Дополнительная литература", data.extraLiterature],
        ["Дополнительные видео/лекции", data.extraVideos],
        ["Вопросы для контакта с собой", data.selfQuestions],
        ["Призма ЭГП", data.egpPrism],
        ["Досуговое (кино/книги)", data.leisure],
        ["Современные исследования", data.modernResearch],
        ["Экспериментальная психология", data.experimentalPsychology],
      ].map(([title, arr]) =>
        arr?.length ? (
          <SectionCard key={title} title={title} collapsible>
            <ul style={{ paddingLeft: "1rem" }}>
              {arr.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </SectionCard>
        ) : null
      )}

      {/* ❓ Квиз */}
      {data.quiz?.length > 0 && (
        <SectionCard title="Квиз по видео‑лекции" collapsible>
          <ul style={{ paddingLeft: "1rem" }}>
            {data.quiz.map((q, idx) => (
              <li key={idx} style={{ marginBottom: ".5rem" }}>
                <strong>{q.q}</strong>
                <ul style={{ paddingLeft: "1rem" }}>
                  {q.options.map((o) => (
                    <li key={o} style={{ listStyle: "circle" }}>
                      {o} {o === q.answer && "✓"}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------
   🚀  APP
-------------------------------------------------------------------*/
function App() {
  const [open, setOpen] = React.useState(false);
  return (
    <Router>
      <StyleInjector />
      <button className="toggle-btn" onClick={() => setOpen(!open)}>
        ☰
      </button>
      <div className="app">
        <AgeNav isOpen={open} />
        <main onClick={() => open && setOpen(false)}>
          <Routes>
            <Route index element={<Navigate to={`/${periodKeys[0]}`} replace />} />
            <Route path="/:id" element={<PeriodPage />} />
            <Route path="*" element={<Navigate to={`/${periodKeys[0]}`} replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
