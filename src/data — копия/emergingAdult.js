// File: src/data/emergingAdult.js
export default {
  id: "emergingAdult",
  label: "Юность / Emerging Adulthood (18–25 лет)",
  sections: {
    video: {
      title: "Видео-лекция",
      content: [
        {
          title: "Emerging Adulthood (Jeffrey Arnett, Clark U.)",
          url: "https://www.youtube.com/embed/4T7LyA_-Iwk",
        },
      ],
    },
    concepts: {
      title: "Понятия",
      content: [
        "Emerging Adulthood – «чувство между»",
        "Поиск идентичности в любви и работе",
        "Институциональная задержка взрослости",
        "Самофокус и ощущение возможностей",
      ],
    },
    authors: {
      title: "Ключевые авторы",
      content: ["Jeffrey J. Arnett", "Meg Jay", "Shinichi I. Kawamura"],
    },
    coreRead: {
      title: "Основная литература",
      content: [
        {
          title: "Emerging Adulthood: The Winding Road, 3 e",
          author: "J. J. Arnett",
          year: 2023,
        },
        {
          title: "The Defining Decade",
          author: "M. Jay",
          year: 2021,
        },
      ],
    },
    extraRead: {
      title: "Доп. литература",
      content: [
        {
          title: "You and Your Adult Child",
          author: "L. Savage",
          year: 2020,
        },
      ],
    },
    extraVideo: {
      title: "Доп. видео/лекции",
      content: [
        {
          title: "Why 30 is not the new 20 (TED)",
          url: "https://www.youtube.com/embed/vhhgI4tSMwc",
        },
      ],
    },
    quiz: {
      title: "Квиз по видео-лекции",
      content: [
        {
          type: "quiz",
          q: "Сколько, по Арнетту, длится emerging adulthood в развитых странах?",
          options: ["3–4 года", "5–7 лет", "10 лет и более"],
          a: "5–7 лет",
        },
      ],
    },
    self: {
      title: "Вопросы для контакта с собой",
      content: [
        "В каких сферах вы всё ещё «между» подростком и взрослым?",
      ],
    },
    egp: {
      title: "Призма ЭГП",
      content: [
        "Высшее образование и студкредиты",
        "Гиг-экономика vs. карьерная лестница",
        "Цифровые знакомства и дистанционные отношения",
      ],
    },
    leisure: {
      title: "Досуговое",
      content: [
        { title: "Фильм «Boyhood»", year: 2014, type: "film" },
        { title: "Книга «Normal People»", year: 2018, type: "book" },
      ],
    },
    research: {
      title: "Современные исследования",
      content: [
        {
          title: "Quarter-life crisis prevalence and predictors",
          author: "Robinson et al.",
          year: 2023,
          url: "https://doi.org/10.1037/dev0001534",
        },
      ],
    },
    experimental: {
      title: "Экспериментальная психология по возрастам",
      content: [
        "Delay Discounting (межвременно-ценностный выбор)",
        "Iowa Gambling Task – взрослый вариант",
      ],
    },
  },
};
