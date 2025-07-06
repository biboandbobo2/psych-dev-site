// File: src/data/midlife.js
export default {
  id: "midlife",
  label: "Средняя зрелость (40–65 лет)",
  sections: {
    video: {
      title: "Видео-лекция",
      content: [
        {
          title: "Midlife Development & Crisis (Univ. of Chicago)",
          url: "https://www.youtube.com/embed/kE1dPXfNlr8",
        },
      ],
    },
    concepts: {
      title: "Понятия",
      content: [
        "Генеративность vs. стагнация (Erikson)",
        "Когнитивная стабильность: кристаллизованный интеллект",
        "Парадокс благополучия",
        "Midlife review vs. crisis",
      ],
    },
    authors: {
      title: "Ключевые авторы",
      content: ["Daniel Levinson", "Laura Carstensen", "Margie Lachman"],
    },
    coreRead: {
      title: "Основная литература",
      content: [
        {
          title: "Handbook of Midlife Development",
          author: "M. Lachman (Ed.)",
          year: 2021,
        },
        {
          title: "The Longevity Paradox",
          author: "L. Carstensen",
          year: 2020,
        },
      ],
    },
    extraRead: {
      title: "Доп. литература",
      content: [
        {
          title: "Passages",
          author: "G. Sheehy",
          year: 2019,
        },
      ],
    },
    extraVideo: {
      title: "Доп. видео/лекции",
      content: [
        {
          title: "Why midlife may be the best time (TED)",
          url: "https://www.youtube.com/embed/0Xgx3aG9Jr8",
        },
      ],
    },
    quiz: {
      title: "Квиз по видео-лекции",
      content: [
        {
          type: "quiz",
          q: "Что, по Carstensen, усиливается с возрастом и повышает счастье?",
          options: ["Положительный фокус внимания", "Адреналиновый поиск", "Рабочая память"],
          a: "Положительный фокус внимания",
        },
      ],
    },
    self: {
      title: "Вопросы для контакта с собой",
      content: [
        "Какие проекты вы бы хотели передать следующему поколению?",
      ],
    },
    egp: {
      title: "Призма ЭГП",
      content: [
        "Баланс уход-работа (sandwich generation)",
        "Финансовая стабильность и пенсия",
      ],
    },
    leisure: {
      title: "Досуговое",
      content: [
        { title: "Фильм «About Schmidt»", year: 2002, type: "film" },
        { title: "Книга «Eat That Frog!»", year: 2017, type: "book" },
      ],
    },
    research: {
      title: "Современные исследования",
      content: [
        {
          title: "U-shape of happiness revisited",
          author: "Blanchflower",
          year: 2024,
          url: "https://doi.org/10.1016/j.socscimed.2024.116402",
        },
      ],
    },
    experimental: {
      title: "Экспериментальная психология по возрастам",
      content: [
        "Stroop with emotional bias",
        "Lifespan Sternberg memory task",
      ],
    },
  },
};
