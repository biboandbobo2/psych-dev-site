export const PERIOD_COLORS: Record<string, { accent: string; accent100: string }> = {
  intro: {
    accent: "#C58F12",
    accent100: "#FFF4DA",
  },
  prenatal: {
    accent: "#C58F12",
    accent100: "#FFF4DA",
  },
  infant: {
    accent: "#2563EB",
    accent100: "#DBEAFE",
  },
  toddler: {
    accent: "#DC2626",
    accent100: "#FEE2E2",
  },
  preschool: {
    accent: "#059669",
    accent100: "#D1FAE5",
  },
  "primary-school": {
    accent: "#7C3AED",
    accent100: "#EDE9FE",
  },
  school: {
    accent: "#7C3AED",
    accent100: "#EDE9FE",
  },
  adolescence: {
    accent: "#EA580C",
    accent100: "#FFEDD5",
  },
  earlyAdult: {
    accent: "#43A047",
    accent100: "#E8F3E8",
  },
};

export const PERIOD_ORDER = [
  "intro",
  "prenatal",
  "infant",
  "toddler",
  "preschool",
  "primary-school",
  "adolescence",
  "earlyAdult",
];

export const PERIOD_NAMES: Record<string, string> = {
  intro: "Введение",
  prenatal: "Пренатальный период",
  infant: "Младенчество",
  toddler: "Раннее детство",
  preschool: "Дошкольный возраст",
  "primary-school": "Младший школьный возраст (7-10 лет)",
  school: "Младший школьный возраст (7-9 лет)",
  adolescence: "Подростковый возраст",
  earlyAdult: "Ранняя зрелость (22-27 лет)",
};

export function getPeriodColors(periodId: string) {
  return PERIOD_COLORS[periodId] || PERIOD_COLORS.intro;
}

export function getPeriodName(periodId: string) {
  return PERIOD_NAMES[periodId] || periodId;
}
