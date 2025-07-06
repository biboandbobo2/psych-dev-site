// File: src/data/adolescence.js
export default {
  id: "adolescence",
  label: "Средняя подростковость (14–18 лет)",
  sections: {
    video: {
      title: "Видео-лекция",
      content: [
        {
          title: "Adolescent Development (UC Berkeley)",
          url: "https://www.youtube.com/embed/eTjG_EXN_3M",
        },
      ],
    },
    concepts: {
      title: "Понятия",
      content: [
        "Идентичность vs. ролевое смешение (Erikson)",
        "Моральное мышление (Kohlberg III)",
        "Сенсационный поиск (Zuckerman)",
        "Воображаемая аудитория & личная легенда",
      ],
    },
    authors: {
      title: "Ключевые авторы",
      content: ["Erik Erikson", "Laurence Steinberg", "Sarah-Jayne Blakemore"],
    },
    coreRead: {
      title: "Основная литература",
      content: [
        {
          title: "Adolescence (13 e)",
          author: "L. Steinberg",
          year: 2024,
        },
        {
          title: "Inventing Ourselves: The Secret Life of the Teenage Brain",
          author: "S.-J. Blakemore",
          year: 2023,
        },
      ],
    },
    extraRead: {
      title: "Доп. литература",
      content: [
        {
          title: "Lost in Transition",
          author: "J. J. Arnett",
          year: 2018,
        },
      ],
    },
    extraVideo: {
      title: "Доп. видео/лекции",
      content: [
        {
          title: "The mysterious workings of the adolescent brain (TED)",
          url: "https://www.youtube.com/embed/6zVRq1U74ek",
        },
      ],
    },
    quiz: {
      title: "Квиз по видео-лекции",
      content: [
        {
          type: "quiz",
          q: "В каком возрасте рискованное поведение достигает пика?",
          options: ["14–16 лет", "19–21 год", "25+ лет"],
          a: "14–16 лет",
        },
      ],
    },
    self: {
      title: "Вопросы для контакта с собой",
      content: [
        "Вспомните смелый поступок в 16 лет: что им двигало? Как смотрите на него сейчас?",
      ],
    },
    egp: {
      title: "Призма ЭГП",
      content: [
        "Качество и стресс ЕГЭ/экзаменов",
        "Онлайн-соцсети и сравнение",
        "Доступ к ментальному здоровью",
      ],
    },
    leisure: {
      title: "Досуговое",
      content: [
        { title: "Фильм «Lady Bird»", year: 2017, type: "film" },
        { title: "Книга «Над пропастью во ржи»", year: 1951, type: "book" },
      ],
    },
    research: {
      title: "Современные исследования",
      content: [
        {
          title: "Risk-taking and cortical maturation in adolescence",
          author: "Smith et al.",
          year: 2024,
          url: "https://doi.org/10.1016/j.dcn.2024.101287",
        },
      ],
    },
    experimental: {
      title: "Экспериментальная психология по возрастам",
      content: [
        "Balloon Analogue Risk Task (BART)",
        "Эмоциональный Go/No-Go",
      ],
    },
  },
};
