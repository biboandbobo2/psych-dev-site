// File: src/data/preschool.js
export default {
  id: "preschool",
  label: "Дошкольный возраст (3–6 лет)",
  sections: {
    video: {
      title: "Видео-лекция",
      content: [
        {
          title: "Early Childhood: Cognitive Development (Khan Academy)",
          url: "https://www.youtube.com/embed/5msy6kP_T8A",
        },
      ],
    },
    concepts: {
      title: "Понятия",
      content: [
        "Теория разума",
        "Эгоцентризм (Piaget)",
        "Внутренняя речь (Vygotsky)",
        "Игровая деятельность как ведущая",
      ],
    },
    authors: {
      title: "Ключевые авторы",
      content: ["L. Vygotsky", "J. Piaget", "Susan Carey"],
    },
    coreRead: {
      title: "Основная литература",
      content: [
        {
          title: "Mind in Society",
          author: "L. S. Vygotsky",
          year: 2018,
        },
        {
          title: "Theories of Childhood",
          author: "C. Mooney",
          year: 2020,
        },
      ],
    },
    extraRead: {
      title: "Доп. литература",
      content: [
        {
          title: "Pretend Play in Childhood",
          author: "S. Singer",
          year: 2019,
        },
      ],
    },
    extraVideo: {
      title: "Доп. видео/лекции",
      content: [
        {
          title: "Theory of Mind in Preschoolers (UCL)",
          url: "https://www.youtube.com/embed/zJjqhG0iSx8",
        },
      ],
    },
    quiz: {
      title: "Квиз по видео-лекции",
      content: [
        {
          type: "quiz",
          q: "Какой эксперимент проверяет наличие теории разума?",
          options: [
            "Стил-фейс",
            "Салли-Энн тест",
            "Визуальная скала глубины",
          ],
          a: "Салли-Энн тест",
        },
      ],
    },
    self: {
      title: "Вопросы для контакта с собой",
      content: [
        "Какие игры вы помните самым ярким образом из детства?",
      ],
    },
    egp: {
      title: "Призма ЭГП",
      content: [
        "Доступность детского сада",
        "Культурные сценарии гендера",
      ],
    },
    leisure: {
      title: "Досуговое",
      content: [
        { title: "Фильм «Головоломка»", year: 2015, type: "film" },
        { title: "Книга «Маленький принц»", year: 1943, type: "book" },
      ],
    },
    research: {
      title: "Современные исследования",
      content: [
        {
          title: "Play and executive function",
          author: "Barker et al.",
          year: 2022,
          url: "https://doi.org/10.1016/j.ecresq.2022.01.004",
        },
      ],
    },
    experimental: {
      title: "Экспериментальная психология по возрастам",
      content: ["Салли-Энн", "Функциональная классификация игрушек"],
    },
  },
};
