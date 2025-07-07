// File: src/data/earlyAdolescence.js
export default {
  id: "earlyAdolescence",
  label: "Ранняя подростковость (11–14 лет)",
  sections: {
    video: {
      title: "Видео-лекция",
      content: [
        {
          title: "The Adolescent Brain (UCLA)",
          url: "https://www.youtube.com/embed/XxY5b58d83o",
        },
      ],
    },
    concepts: {
      title: "Понятия",
      content: [
        "Пубертатный скачок",
        "Формальные операции",
        "Эгоцентризм подростка (воображаемая аудитория)",
        "Сравнение с референтной группой",
      ],
    },
    authors: {
      title: "Ключевые авторы",
      content: ["L. Steinberg", "D. Elkind", "S. Blakemore"],
    },
    coreRead: {
      title: "Основная литература",
      content: [
        {
          title: "Adolescence, 13e",
          author: "L. Steinberg",
          year: 2024,
        },
        {
          title: "Inventing Ourselves: The Secret Life of the Teenage Brain",
          author: "S. Blakemore",
          year: 2023,
        },
      ],
    },
    extraRead: {
      title: "Доп. литература",
      content: [
        {
          title: "The Power of Peer Influence",
          author: "B. Brown",
          year: 2021,
        },
      ],
    },
    extraVideo: {
      title: "Доп. видео/лекции",
      content: [
        {
          title: "Risk-taking & Reward in Teens",
          url: "https://www.youtube.com/embed/6zVRq1U74ek",
        },
      ],
    },
    quiz: {
      title: "Квиз по видео-лекции",
      content: [
        {
          type: "quiz",
          q: "Какой лобный отдел дозревает последним?",
          options: ["Префронтальная кора", "Теменная кора", "Височная доля"],
          a: "Префронтальная кора",
        },
      ],
    },
    self: {
      title: "Вопросы для контакта с собой",
      content: [
        "Какие ценности вы впервые поставили под сомнение в 12 лет?",
      ],
    },
    egp: {
      title: "Призма ЭГП",
      content: [
        "Доступ к спортивным секциям и кружкам",
        "Онлайн-среда и кибербезопасность",
      ],
    },
    leisure: {
      title: "Досуговое",
      content: [
        { title: "Фильм «Хористы»", year: 2004, type: "film" },
        { title: "Книга «Изгои» (S. Hinton)", year: 1967, type: "book" },
      ],
    },
    research: {
      title: "Современные исследования",
      content: [
        {
          title: "Social media use and adolescent sleep",
          author: "Scott & Fullerton",
          year: 2024,
          url: "https://doi.org/10.1016/j.sleep.2024.02.005",
        },
      ],
    },
    experimental: {
      title: "Экспериментальная психология по возрастам",
      content: [
        "Iowa Gambling Task (подростковый вариант)",
        "Cold-Hot Corsi Block",
      ],
    },
  },
};
