export interface CourseIntroAuthorLink {
  label: string;
  url: string;
}

export interface CourseIntroAuthor {
  id: string;
  name: string;
  role?: string;
  bio?: string;
  photoUrl?: string;
  links?: CourseIntroAuthorLink[];
}

export interface CourseIntroFact {
  label: string;
  value: string;
}

export interface CourseIntroCta {
  label: string;
  url: string;
  note?: string;
}

export interface CourseIntro {
  idea?: string;
  program?: string;
  authors?: CourseIntroAuthor[];
  authorsTitle?: string;
  facts?: CourseIntroFact[];
  cta?: CourseIntroCta;
  updatedAt?: number;
  updatedBy?: string;
}

export function isCourseIntroEmpty(intro: CourseIntro | null | undefined): boolean {
  if (!intro) return true;
  const hasIdea = typeof intro.idea === 'string' && intro.idea.trim().length > 0;
  const hasProgram = typeof intro.program === 'string' && intro.program.trim().length > 0;
  const hasAuthors = Array.isArray(intro.authors) && intro.authors.length > 0;
  const hasFacts = Array.isArray(intro.facts) && intro.facts.length > 0;
  return !hasIdea && !hasProgram && !hasAuthors && !hasFacts;
}
