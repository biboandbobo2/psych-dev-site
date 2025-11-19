import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ROUTE_BY_PERIOD, CLINICAL_ROUTE_BY_PERIOD, GENERAL_ROUTE_BY_PERIOD } from '../routes';
import { normalizeText } from '../utils/contentHelpers';
import { useContentForm } from './admin/content-editor/hooks/useContentForm';
import { useContentLoader } from './admin/content-editor/hooks/useContentLoader';
import { useContentSaver } from './admin/content-editor/hooks/useContentSaver';
import {
  ContentMetadataForm,
  ContentThemeEditor,
  ContentVideoSection,
  ContentConceptsSection,
  ContentAuthorsSection,
  ContentLiteratureSection,
  ContentActionsBar,
} from './admin/content-editor/components';

type CourseType = 'development' | 'clinical' | 'general';

/**
 * Admin page for editing period content
 */
export default function AdminContentEdit() {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Определяем курс из URL параметра
  const courseParam = searchParams.get('course');
  const course: CourseType = (courseParam === 'clinical' || courseParam === 'development' || courseParam === 'general')
    ? courseParam
    : 'development';

  // Get route config for placeholder settings
  const routesByPeriod = course === 'clinical' ? CLINICAL_ROUTE_BY_PERIOD :
                         course === 'general' ? GENERAL_ROUTE_BY_PERIOD :
                         ROUTE_BY_PERIOD;
  const routeConfig = periodId ? routesByPeriod[periodId] : undefined;
  const placeholderDefaultEnabled = routeConfig?.placeholderDefaultEnabled ?? false;
  const placeholderDisplayText =
    routeConfig?.placeholderText || (course === 'development'
      ? 'Контент для этого возраста появится в ближайшем обновлении.'
      : 'Контент для этой темы появится в ближайшем обновлении.');
  const normalizedPlaceholderText = normalizeText(placeholderDisplayText);
  const fallbackTitle =
    routeConfig?.navLabel || (periodId
      ? (course === 'development' ? `Период ${periodId}` : `Тема ${periodId}`)
      : (course === 'development' ? 'Новый период' : 'Новая тема'));

  // Form state management
  const form = useContentForm(placeholderDefaultEnabled);

  // Load content from Firestore
  const { period, loading } = useContentLoader({
    periodId,
    course,
    placeholderDefaultEnabled,
    placeholderDisplayText,
    fallbackTitle,
    setTitle: form.setTitle,
    setSubtitle: form.setSubtitle,
    setPublished: form.setPublished,
    setOrder: form.setOrder,
    setAccent: form.setAccent,
    setAccent100: form.setAccent100,
    setPlaceholderEnabled: form.setPlaceholderEnabled,
    setVideos: form.setVideos,
    setConcepts: form.setConcepts,
    setAuthors: form.setAuthors,
    setCoreLiterature: form.setCoreLiterature,
    setExtraLiterature: form.setExtraLiterature,
    setExtraVideos: form.setExtraVideos,
    setLeisure: form.setLeisure,
    setSelfQuestionsUrl: form.setSelfQuestionsUrl,
  });

  // Save/delete handlers
  const { saving, handleSave, handleDelete } = useContentSaver(() => navigate(`/admin/content?course=${course}`), course);

  const onSave = () => {
    handleSave({
      periodId,
      title: form.title,
      subtitle: form.subtitle,
      published: form.published,
      order: form.order,
      accent: form.accent,
      accent100: form.accent100,
      placeholderEnabled: form.placeholderEnabled,
      normalizedPlaceholderText,
      videos: form.videos,
      concepts: form.concepts,
      authors: form.authors,
      coreLiterature: form.coreLiterature,
      extraLiterature: form.extraLiterature,
      extraVideos: form.extraVideos,
      leisure: form.leisure,
      selfQuestionsUrl: form.selfQuestionsUrl,
    });
  };

  const onDelete = () => {
    handleDelete(periodId, form.title);
  };

  // Loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  // Not found state
  if (!period) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p>Период не найден</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={`/admin/content?course=${course}`} className="text-gray-600 hover:text-gray-900 text-2xl">
          ←
        </Link>
        <div>
          <h1 className="text-3xl font-bold">
            {periodId === 'intro' || periodId === 'clinical-intro'
              ? '✨ Вводное занятие'
              : `Редактирование: ${period.title}`}
          </h1>
          <p className="text-gray-600 text-sm mt-1">ID: {periodId}</p>
        </div>
      </div>

      {/* Form sections */}
      <ContentMetadataForm
        periodId={periodId}
        title={form.title}
        setTitle={form.setTitle}
        subtitle={form.subtitle}
        setSubtitle={form.setSubtitle}
        order={form.order}
        setOrder={form.setOrder}
        published={form.published}
        setPublished={form.setPublished}
        placeholderEnabled={form.placeholderEnabled}
        setPlaceholderEnabled={form.setPlaceholderEnabled}
        placeholderDisplayText={placeholderDisplayText}
      />

      <ContentThemeEditor
        accent={form.accent}
        setAccent={form.setAccent}
        accent100={form.accent100}
        setAccent100={form.setAccent100}
      />

      <ContentVideoSection
        videos={form.videos}
        setVideos={form.setVideos}
        defaultTitle={form.title.trim() || placeholderDisplayText}
      />

      <ContentConceptsSection concepts={form.concepts} setConcepts={form.setConcepts} />

      <ContentAuthorsSection authors={form.authors} setAuthors={form.setAuthors} />

      <ContentLiteratureSection
        coreLiterature={form.coreLiterature}
        setCoreLiterature={form.setCoreLiterature}
        extraLiterature={form.extraLiterature}
        setExtraLiterature={form.setExtraLiterature}
        extraVideos={form.extraVideos}
        setExtraVideos={form.setExtraVideos}
        leisure={form.leisure}
        setLeisure={form.setLeisure}
        selfQuestionsUrl={form.selfQuestionsUrl}
        setSelfQuestionsUrl={form.setSelfQuestionsUrl}
      />

      <ContentActionsBar
        periodId={periodId}
        saving={saving}
        title={form.title}
        onSave={onSave}
        onDelete={onDelete}
      />
    </div>
  );
}
