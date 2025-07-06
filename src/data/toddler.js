// File: src/data/toddler.js
export default {
  id: "toddler",
  label: "Раннее детство (1–3 года)",
  sections: {
    video: {
      title: "Видео-лекция",
      content: [
        {
          title: "Toddler Cognitive & Language Development (Khan Academy)",
          url: "https://www.youtube.com/embed/Kpv3U3x--j4",
        },
      ],
    },
    concepts: {
      title: "Понятия",
      content: [
        "Автономия vs. стыд/сомнение (Erikson)",
        "Vocabulary spurt — «словесный взрыв»",
        "Обобщённое подражание",
        "Переход от сенсомоторных схем к символической игре",
      ],
    },
    authors: {
      title: "Ключевые авторы",
      content: ["Jean Piaget", "Lev Vygotsky", "Patricia Kuhl"],
    },
    coreRead: {
      title: "Основная литература",
      content: [
        {
          title: "The Scientist in the Crib",
          author: "A. Gopnik, A. Meltzoff & P. Kuhl",
          year: 2020,
        },
        {
          title: "Language Development",
          author: "E. Hoff",
          year: 2022,
        },
      ],
    },
    extraRead: {
      title: "Доп. литература",
      content: [
        {
          title: "No Bad Kids",
          author: "Janet Lansbury",
          year: 2019,
        },
      ],
    },
    extraVideo: {
      title: "Доп. видео/лекции",
      content: [
        {
          title: "Gestures and Language Development",
          url: "https://www.youtube.com/embed/o0jbfvj4_tw",
        },
      ],
    },
    quiz: {
      title: "Квиз по видео-лекции",
      content: [
        {
          type: "quiz",
          q: "К какому возрасту большинство детей начинают комбинировать два слова?",
          options: ["к 18 месяцам", "к 24 месяцам", "к 30 месяцам"],
          a: "к 24 месяцам",
        },
      ],
    },
    self: {
      title: "Вопросы для контакта с собой",
      content: [
        "Вспомните первое слово ребёнка в вашей семье. Что оно значило для вас?",
      ],
    },
    egp: {
      title: "Призма ЭГП",
      content: [
        "Качество родительского отпуска",
        "Безопасность игровой среды",
      ],
    },
    leisure: {
      title: "Досуговое",
      content: [
        { title: "М/ф «Тоторо»", year: 1988, type: "film" },
        { title: "Книга «Груффало»", year: 1999, type: "book" },
      ],
    },
    research: {
      title: "Современные исследования",
      content: [
        {
          title: "Bilingual exposure and toddler vocabulary growth",
          author: "Byers-Heinlein et al.",
          year: 2023,
          url: "https://doi.org/10.1111/cdev.14055",
        },
      ],
    },
    experimental: {
      title: "Экспериментальная психология по возрастам",
      content: [
        "Preferential Looking",
        "Violation-of-Expectation (M. Spelke)",
      ],
    },
  },
};
