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

export interface CourseIntro {
  idea?: string;
  program?: string;
  authors?: CourseIntroAuthor[];
  updatedAt?: number;
  updatedBy?: string;
}

export function isCourseIntroEmpty(intro: CourseIntro | null | undefined): boolean {
  if (!intro) return true;
  const hasIdea = typeof intro.idea === 'string' && intro.idea.trim().length > 0;
  const hasProgram = typeof intro.program === 'string' && intro.program.trim().length > 0;
  const hasAuthors = Array.isArray(intro.authors) && intro.authors.length > 0;
  return !hasIdea && !hasProgram && !hasAuthors;
}
