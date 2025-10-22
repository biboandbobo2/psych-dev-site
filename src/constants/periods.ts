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
  school: {
    accent: "#7C3AED",
    accent100: "#EDE9FE",
  },
  adolescence: {
    accent: "#EA580C",
    accent100: "#FFEDD5",
  },
};

export const PERIOD_ORDER = [
  "intro",
  "prenatal",
  "infant",
  "toddler",
  "preschool",
  "school",
  "adolescence",
];

export const PERIOD_NAMES: Record<string, string> = {
  intro: "Введение",
  prenatal: "Пренатальный период",
  infant: "Младенчество",
  toddler: "Раннее детство",
  preschool: "Дошкольный возраст",
  school: "Школьный возраст",
  adolescence: "Подростковый возраст",
};

export function getPeriodColors(periodId: string) {
  return PERIOD_COLORS[periodId] || PERIOD_COLORS.intro;
}

export function getPeriodName(periodId: string) {
  return PERIOD_NAMES[periodId] || periodId;
}
