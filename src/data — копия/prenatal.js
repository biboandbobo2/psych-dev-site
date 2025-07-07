// File: src/data/prenatal.js
export default {
  id: "prenatal",
  label: "Пренатальный период",
  sections: {
    "video": {
      title: "Видео-лекция",
      content: [
        {
          title: "Prenatal Development (Yale U.)",
          url: "https://www.youtube.com/embed/Oy2LrWj3WGQ",
        },
      ],
    },
    "concepts": {
      title: "Понятия",
      content: [
        "Тератогены",
        "Фетальный программинг (Barker Hypothesis)",
        "Нейральная трубка",
      ],
    },
    "authors": {
      title: "Ключевые авторы",
      content: [
        "T. Berry Brazelton",
        "David J. Barker",
        "Heidi Murkoff",
      ],
    },
    "coreRead": {
      title: "Основная литература",
      content: [
        {
          title: "The Developing Human: Clinically Oriented Embryology",
          author: "K.L. Moore, P. Persaud & M. Torchia",
          year: 2023,
        },
        {
          title: "Prenatal Development: A Psychological Perspective",
          author: "B. Hopkins",
          year: 2020,
        },
      ],
    },
    "extraRead": {
      title: "Доп. литература",
      content: [
        {
          title: "What to Expect When You're Expecting",
          author: "H. Murkoff",
          year: 2018,
        },
      ],
    },
    "extraVideo": {
      title: "Доп. видео/лекции",
      content: [
        {
          title: "Teratogens and Prenatal Development",
          url: "https://www.youtube.com/embed/lO4OEt_Knuw",
        },
      ],
    },
    "quiz": {
      title: "Квиз по видео-лекции",
      content: [
        {
          type: "quiz",
          q: "На каком месяце формируются основные органы?",
          options: ["1–2", "3–4", "5–6"],
          a: "3–4",
        },
      ],
    },
    "self": {
      title: "Вопросы для контакта с собой",
      content: [
        "Как изменения в питании матери могут сказаться на здоровье взрослого человека?",
      ],
    },
    "egp": {
      title: "Призма ЭГП",
      content: [
        "Доступность медицинской помощи",
        "Экологическая безопасность среды",
      ],
    },
    "leisure": {
      title: "Досуговое",
      content: [
        { title: "Фильм «Дитя человеческое»", year: 2006, type: "film" },
        { title: "Книга «Room» (Э. Донахью)", year: 2010, type: "book" },
      ],
    },
    "research": {
      title: "Современные исследования",
      content: [
        {
          title: "Prenatal stress and immune programming",
          author: "Entringer & Wadhwa",
          year: 2023,
          url: "https://doi.org/10.1016/j.psyneuen.2023.105994",
        },
      ],
    },
    "experimental": {
      title: "Экспериментальная психология по возрастам",
      content: [
        "ННР-тест плода (измерение реакции на звук)",
      ],
    },
  },
};
