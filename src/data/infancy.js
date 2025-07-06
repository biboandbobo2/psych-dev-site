// File: src/data/infancy.js
export default {
  id: "infancy",
  label: "Младенчество (0–1 год)",
  sections: {
    video: {
      title: "Видео-лекция",
      content: [
        {
          title: "Infant Cognition (MIT OCW)",
          url: "https://www.youtube.com/embed/irKlHYw3A2k",
        },
      ],
    },
    concepts: {
      title: "Понятия",
      content: [
        "Новорождённый рефлекс",
        "Привязанность (Ainsworth)",
        "Со-регуляция сна",
      ],
    },
    authors: {
      title: "Ключевые авторы",
      content: ["M. Ainsworth", "J. Bowlby", "P. Rochat"],
    },
    coreRead: {
      title: "Основная литература",
      content: [
        {
          title: "Infancy: Development from Birth to Age 3",
          author: "M. L. Wittig",
          year: 2022,
        },
        {
          title: "Attachment",
          author: "J. Cassidy & P. Shaver (Eds.)",
          year: 2018,
        },
      ],
    },
    extraRead: {
      title: "Доп. литература",
      content: [
        {
          title: "The Wonder Weeks",
          author: "F. Plooij & H. van de Rijt",
          year: 2019,
        },
      ],
    },
    extraVideo: {
      title: "Доп. видео/лекции",
      content: [
        {
          title: "Still-Face Experiment",
          url: "https://www.youtube.com/embed/apzXGEbZht0",
        },
      ],
    },
    quiz: {
      title: "Квиз по видео-лекции",
      content: [
        {
          type: "quiz",
          q: "Какой возраст пик «stranger anxiety»?",
          options: ["4 мес", "8 мес", "15 мес"],
          a: "8 мес",
        },
      ],
    },
    self: {
      title: "Вопросы для контакта с собой",
      content: [
        "Как вы реагируете на чужой детский плач и почему?",
      ],
    },
    egp: {
      title: "Призма ЭГП",
      content: ["Роль родовых отпусков", "Качество грудного вскармливания"],
    },
    leisure: {
      title: "Досуговое",
      content: [
        { title: "Фильм «Точка невозврата» (Babies)", year: 2010, type: "film" },
        { title: "Книга «Brain Rules for Baby»", year: 2020, type: "book" },
      ],
    },
    research: {
      title: "Современные исследования",
      content: [
        {
          title: "Infant gaze following predicts language",
          author: "Brooks & Meltzoff",
          year: 2021,
          url: "https://doi.org/10.1016/j.cognition.2021.104872",
        },
      ],
    },
    experimental: {
      title: "Экспериментальная психология по возрастам",
      content: [
        "Preferential Looking Paradigm",
        "High-Amplitude Sucking Technique",
      ],
    },
  },
};
