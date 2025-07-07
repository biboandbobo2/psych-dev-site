// File: src/data/earlyAdult.js
export default {
  id: "earlyAdult",
  label: "Ранняя зрелость (25–40 лет)",
  sections: {
    video: {
      title: "Видео-лекция",
      content: [
        {
          title: "Early Adulthood: Intimacy & Work (Yale)",
          url: "https://www.youtube.com/embed/dMQQWi4--wk",
        },
      ],
    },
    concepts: {
      title: "Понятия",
      content: [
        "Интимность vs. изоляция (Erikson)",
        "Консолидация карьеры (Vaillant)",
        "Кристаллизованный интеллект и пик продуктивности",
        "Work-life balance",
      ],
    },
    authors: {
      title: "Ключевые авторы",
      content: ["Daniel Levinson", "Laura Carstensen", "John Gottman"],
    },
    coreRead: {
      title: "Основная литература",
      content: [
        {
          title: "The Seasons of a Man’s Life",
          author: "D. Levinson",
          year: 2022,
        },
        {
          title: "The Science of Happily Ever After",
          author: "T. Tashiro",
          year: 2019,
        },
      ],
    },
    extraRead: {
      title: "Доп. литература",
      content: [
        {
          title: "30 Lessons for Living",
          author: "K. Pillemer",
          year: 2020,
        },
      ],
    },
    extraVideo: {
      title: "Доп. видео/лекции",
      content: [
        {
          title: "The Science of Love (John Gottman)",
          url: "https://www.youtube.com/embed/638KKBnHlOs",
        },
      ],
    },
    quiz: {
      title: "Квиз по видео-лекции",
      content: [
        {
          type: "quiz",
          q: "С какого возраста, по Carstensen, начинает расти кривая эмоционального благополучия?",
          options: ["18–20", "30–35", "50–55"],
          a: "30–35",
        },
      ],
    },
    self: {
      title: "Вопросы для контакта с собой",
      content: [
        "Какие отношения сейчас требуют большего взаимопонимания и почему?",
      ],
    },
    egp: {
      title: "Призма ЭГП",
      content: [
        "Доступность жилья и ипотека",
        "Решение о родительстве / child-free",
        "Гибкость рабочего графика",
      ],
    },
    leisure: {
      title: "Досуговое",
      content: [
        { title: "Фильм «Marriage Story»", year: 2019, type: "film" },
        { title: "Книга «Eat Pray Love»", year: 2006, type: "book" },
      ],
    },
    research: {
      title: "Современные исследования",
      content: [
        {
          title: "Millennial burnout and job satisfaction",
          author: "Garcia et al.",
          year: 2024,
          url: "https://doi.org/10.1016/j.jvb.2024.103837",
        },
      ],
    },
    experimental: {
      title: "Экспериментальная психология по возрастам",
      content: [
        "Adult Attachment Interview",
        "Лаборатория конфликт-обсуждения супругов (Gottman)",
      ],
    },
  },
};
