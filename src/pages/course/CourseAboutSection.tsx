import { MarkdownView } from '../../lib/MarkdownView';
import type { CourseIntro, CourseIntroAuthor } from '../../types/courseIntro';
import { isCourseIntroEmpty } from '../../types/courseIntro';

interface CourseAboutSectionProps {
  intro: CourseIntro | null;
  loading: boolean;
  courseName: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function AuthorCard({ author }: { author: CourseIntroAuthor }) {
  return (
    <li className="flex gap-4 rounded-2xl border border-[#E5ECF3] bg-white p-4">
      {author.photoUrl ? (
        <img
          src={author.photoUrl}
          alt={author.name}
          className="h-16 w-16 flex-shrink-0 rounded-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-[#E5ECF3] text-lg font-semibold text-[#556476]">
          {getInitials(author.name)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[#2C3E50]">{author.name}</div>
        {author.role ? (
          <div className="text-xs uppercase tracking-wide text-[#8A97AB]">{author.role}</div>
        ) : null}
        {author.bio ? (
          <MarkdownView
            source={author.bio}
            className="mt-2 text-sm text-[#556476] space-y-2 [&_p]:leading-relaxed"
          />
        ) : null}
        {author.links && author.links.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2 text-xs">
            {author.links.map((link, idx) => (
              <li key={`${link.url}-${idx}`}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-[#F1F5FA] px-3 py-1 text-[#2F6DB5] hover:bg-[#E5ECF3]"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

function AboutPlaceholder({ courseName }: { courseName: string }) {
  return (
    <section className="rounded-2xl border border-dashed border-[#DDE5EE] bg-[#F9FBFF] p-5">
      <h2 className="text-lg font-semibold text-[#2C3E50]">О курсе</h2>
      <p className="mt-1 text-xs uppercase tracking-wide text-[#8A97AB]">Раздел скоро заполнит администратор</p>
      <dl className="mt-4 space-y-3 text-sm text-[#556476]">
        <div>
          <dt className="font-semibold text-[#2C3E50]">Авторы</dt>
          <dd className="text-[#8A97AB]">—</dd>
        </div>
        <div>
          <dt className="font-semibold text-[#2C3E50]">Идея курса</dt>
          <dd className="text-[#8A97AB]">Будет добавлено описание целей «{courseName}».</dd>
        </div>
        <div>
          <dt className="font-semibold text-[#2C3E50]">Программа</dt>
          <dd className="text-[#8A97AB]">—</dd>
        </div>
      </dl>
    </section>
  );
}

export function CourseAboutSection({ intro, loading, courseName }: CourseAboutSectionProps) {
  if (loading) {
    return (
      <section className="rounded-2xl border border-[#DDE5EE] bg-white p-5">
        <div className="h-5 w-28 animate-pulse rounded bg-[#EEF2F7]" />
        <div className="mt-4 space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-[#EEF2F7]" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-[#EEF2F7]" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-[#EEF2F7]" />
        </div>
      </section>
    );
  }

  if (isCourseIntroEmpty(intro)) {
    return <AboutPlaceholder courseName={courseName} />;
  }

  return (
    <section className="space-y-5 rounded-2xl border border-[#DDE5EE] bg-white p-5">
      <h2 className="text-lg font-semibold text-[#2C3E50]">О курсе</h2>

      {intro?.idea ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#8A97AB]">Идея курса</h3>
          <MarkdownView
            source={intro.idea}
            className="text-sm text-[#556476] space-y-3 [&_p]:leading-relaxed"
          />
        </div>
      ) : null}

      {intro?.authors && intro.authors.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#8A97AB]">Авторы</h3>
          <ul className="space-y-3">
            {intro.authors.map((author) => (
              <AuthorCard key={author.id} author={author} />
            ))}
          </ul>
        </div>
      ) : null}

      {intro?.program ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#8A97AB]">Программа</h3>
          <MarkdownView
            source={intro.program}
            className="text-sm text-[#556476] space-y-3 [&_p]:leading-relaxed"
          />
        </div>
      ) : null}
    </section>
  );
}
