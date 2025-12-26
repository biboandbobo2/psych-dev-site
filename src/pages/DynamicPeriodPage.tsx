import { useParams } from 'react-router-dom';
import { PeriodPage } from './PeriodPage';
import NotFound from '../app/NotFound';
import type { Period, ClinicalTopic, GeneralTopic } from '../types/content';
import type { CourseType } from '../types/tests';
import { SITE_NAME } from '../routes';

interface DynamicPeriodPageProps {
  course: CourseType;
  topicsMap: Map<string, Period | ClinicalTopic | GeneralTopic>;
}

/**
 * Страница для динамических занятий, не прописанных в статических роутах.
 * Получает periodId из URL и находит данные в Firestore через topicsMap.
 */
export function DynamicPeriodPage({ course, topicsMap }: DynamicPeriodPageProps) {
  const { periodId } = useParams<{ periodId: string }>();

  if (!periodId) {
    return <NotFound />;
  }

  const period = topicsMap.get(periodId);

  // Если период не найден или не опубликован — показываем 404
  if (!period || !period.published) {
    return <NotFound />;
  }

  // Генерируем config на лету
  const basePath = course === 'development' ? '/' :
                   course === 'clinical' ? '/clinical/' :
                   '/general/';

  const config = {
    path: `${basePath}${periodId}`,
    navLabel: period.title,
    periodId,
    themeKey: course,
    placeholderDefaultEnabled: false,
    meta: {
      title: `${period.title} — ${SITE_NAME}`,
      description: period.subtitle || '',
    },
  };

  return <PeriodPage config={config} period={period} />;
}
