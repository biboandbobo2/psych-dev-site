// File: src/data/lateAdult.js
export default {
  id: "lateAdult",
  label: "Пожилой возраст (65–80 лет)",
  sections: {
    video: {
      title: "Видео-лекция",
      content: [
        {
          title: "Successful Aging (Stanford CSPR)",
          url: "https://www.youtube.com/embed/O_9BDUQo7Jk",
        },
      ],
    },
    concepts: {
      title: "Понятия",
      content: [
        "Интеграция vs. отчаяние (Erikson)",
        "Выборочная оптимизация с компенсацией (Baltes)",
        "Socioemotional selectivity theory",
        "Retirement adjustment",
      ],
    },
    authors: {
      title: "Ключевые авторы",
      content: ["Paul Baltes", "Laura Carstensen", "George Vaillant"],
    },
    coreRead: {
      title: "Основная литература",
      content: [
        {
          title: "Aging Well",
          author: "G. Vaillant",
          year: 2020,
        },
        {
          title: "Successful Aging",
          author: "D. Rowe & R. Kahn",
          year: 2015,
        },
      ],
    },
    extraRead: {
      title: "Доп. литература",
      content: [
        {
          title: "The Blue Zones",
          author: "D. Buettner",
          year: 2023,
        },
      ],
    },
    extraVideo: {
      title: "Доп. видео/лекции",
      content: [
        {
          title: "The secrets of longevity (TED)",
          url: "https://www.youtube.com/embed/ff40YiMmVkU",
        },
      ],
    },
    quiz: {
      title: "Квиз по видео-лекции",
      content: [
        {
          type: "quiz",
          q: "Какой фактор важнее всего для счастья в 75 лет, по Harvard Study?",
          options: ["Доход", "Социальные связи", "IQ в молодости"],
          a: "Социальные связи",
        },
      ],
    },
    self: {
      title: "Вопросы для контакта с собой",
      content: ["Какие навыки вы хотели бы передать внукам?"],
    },
    egp: {
      title: "Призма ЭГП",
      content: ["Медицинское страхование", "Возрастной эйджизм"],
    },
    leisure: {
      title: "Досуговое",
      content: [
        { title: "Фильм «The Intern»", year: 2015, type: "film" },
        { title: "Книга «Being Mortal»", year: 2014, type: "book" },
      ],
    },
    research: {
      title: "Современные исследования",
      content: [
        {
          title: "Cognitive reserve and aging",
          author: "Stern",
          year: 2022,
          url: "https://doi.org/10.1016/j.neuropsych.2022.108169",
        },
      ],
    },
    experimental: {
      title: "Экспериментальная психология по возрастам",
      content: ["Trail Making Test", "Verbal Fluency (category)"],
    },
  },
};
