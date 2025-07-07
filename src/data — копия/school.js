// File: src/data/school.js
export default {
  id: "school",
  label: "Младший школьный возраст (6–11 лет)",
  sections: {
    video: {
      title: "Видео-лекция",
      content: [
        {
          title: "Concrete Operations & Schooling (MIT OCW)",
          url: "https://www.youtube.com/embed/Ixlw4lX9HoU",
        },
      ],
    },
    concepts: {
      title: "Понятия",
      content: [
        "Конкретные операции (Piaget)",
        "Метапамять и метапознание",
        "Самооценка и компетентность (Harter)",
        "Коллектив – ведущая деятельность",
      ],
    },
    authors: {
      title: "Ключевые авторы",
      content: ["J. Piaget", "S. Harter", "Lev Vygotsky"],
    },
    coreRead: {
      title: "Основная литература",
      content: [
        {
          title: "Child Development, 8e",
          author: "L. Steinberg",
          year: 2022,
        },
        {
          title: "The Development of Children’s Thinking",
          author: "K. Bartsch",
          year: 2021,
        },
      ],
    },
    extraRead: {
      title: "Доп. литература",
      content: [
        {
          title: "How Children Learn Mathematics",
          author: "N. Ginsburg",
          year: 2020,
        },
      ],
    },
    extraVideo: {
      title: "Доп. видео/лекции",
      content: [
        {
          title: "Growth vs. Fixed Mindset (Dweck)",
          url: "https://www.youtube.com/embed/Yl9TVbAal5s",
        },
      ],
    },
    quiz: {
      title: "Квиз по видео-лекции",
      content: [
        {
          type: "quiz",
          q: "С какой операции начинается стадия конкретных операций?",
          options: ["Консервация количества", "Обратимость действий", "Абстракция"],
          a: "Консервация количества",
        },
      ],
    },
    self: {
      title: "Вопросы для контакта с собой",
      content: ["Какие школьные предметы давались вам легче всего и почему?"],
    },
    egp: {
      title: "Призма ЭГП",
      content: ["Качество школы", "Учительская поддержка", "Доступ к кружкам"],
    },
    leisure: {
      title: "Досуговое",
      content: [
        { title: "Фильм «Матильда»", year: 1996, type: "film" },
        { title: "Книга «Полианна»", year: 1913, type: "book" },
      ],
    },
    research: {
      title: "Современные исследования",
      content: [
        {
          title: "Math anxiety in elementary years",
          author: "Wang et al.",
          year: 2023,
          url: "https://doi.org/10.1037/dev0001497",
        },
      ],
    },
    experimental: {
      title: "Экспериментальная психология по возрастам",
      content: [
        "Консервация Жидкости (Piaget)",
        "Когнитивная гибкость (Dimensional Card Sort)",
      ],
    },
  },
};
