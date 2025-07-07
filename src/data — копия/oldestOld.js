// File: src/data/oldestOld.js
export default {
  id: "oldestOld",
  label: "Долголетие (80+ лет)",
  sections: {
    video: {
      title: "Видео-лекция",
      content: [
        {
          title: "The Oldest Old (U. of Minnesota)",
          url: "https://www.youtube.com/embed/jWb8S7mSxtA",
        },
      ],
    },
    concepts: {
      title: "Понятия",
      content: [
        "Четвёртый возраст",
        "Синдром хрупкости (frailty)",
        "Сжатие заболеваемости (Fries)",
        "Advanced directives и геронтотехнологии",
      ],
    },
    authors: {
      title: "Ключевые авторы",
      content: ["Laura Carstensen", "K. Warner Schaie", "Linda Fried"],
    },
    coreRead: {
      title: "Основная литература",
      content: [
        {
          title: "The Oldest Old",
          author: "S. Suzman, D. Willis & K. Manton (Eds.)",
          year: 2021,
        },
        {
          title: "Aging and the Life Course, 8e",
          author: "J. Quadagno",
          year: 2023,
        },
      ],
    },
    extraRead: {
      title: "Доп. литература",
      content: [
        {
          title: "How to Live Forever",
          author: "M. Freedman",
          year: 2018,
        },
      ],
    },
    extraVideo: {
      title: "Доп. видео/лекции",
      content: [
        {
          title: "Lessons from centenarians (TED)",
          url: "https://www.youtube.com/embed/FFc8Ede5thk",
        },
      ],
    },
    quiz: {
      title: "Квиз по видео-лекции",
      content: [
        {
          type: "quiz",
          q: "Какой показатель лучше всего предсказывает долголетие?",
          options: ["Гены", "Физическая активность", "Социальная вовлечённость"],
          a: "Социальная вовлечённость",
        },
      ],
    },
    self: {
      title: "Вопросы для контакта с собой",
      content: ["Как вы представляете себе качество жизни в 90 лет?"],
    },
    egp: {
      title: "Призма ЭГП",
      content: ["Доступ к уходу 24/7", "Технологии для независимости"],
    },
    leisure: {
      title: "Досуговое",
      content: [
        { title: "Фильм «Amour»", year: 2012, type: "film" },
        { title: "Книга «Tuesdays with Morrie»", year: 1997, type: "book" },
      ],
    },
    research: {
      title: "Современные исследования",
      content: [
        {
          title: "Centenarians and cognitive health",
          author: "Perls & Terry",
          year: 2024,
          url: "https://doi.org/10.1016/j.neurobiolaging.2024.02.006",
        },
      ],
    },
    experimental: {
      title: "Экспериментальная психология по возрастам",
      content: ["MMSE-2", "Clock-Drawing Test"],
    },
  },
};
