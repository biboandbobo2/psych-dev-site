export interface AdminPeriod {
  period: string;
  title: string;
  subtitle: string;
  published: boolean;
  order?: number;
  accent: string;
  isPlaceholder?: boolean;
  [key: string]: unknown;
}
