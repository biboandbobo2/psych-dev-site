import { useParams } from 'react-router-dom';
import { useProjectPageContent } from '../../hooks/useProjectPageContent';
import { PageLoader } from '../../components/ui';
import NotFound from '../../app/NotFound';
import ProjectPage from './ProjectPage';

export default function DynamicProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const { content, loading, notFound } = useProjectPageContent(slug);

  if (loading) {
    return <PageLoader />;
  }
  if (notFound || !content) {
    return <NotFound />;
  }

  return (
    <ProjectPage
      title={content.title}
      subtitle={content.subtitle}
      intro={content.intro}
      paragraphs={content.paragraphs}
      images={content.images}
      cta={content.cta}
    />
  );
}
