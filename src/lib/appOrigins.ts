const APP_ALLOWED_ORIGIN_PATTERNS = [
  /^http:\/\/localhost(?::\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/i,
  /^https:\/\/psych-dev-site\.vercel\.app$/i,
  /^https:\/\/psych-dev-site(?:-[a-z0-9-]+)?-alexey-zykovs-projects\.vercel\.app$/i,
  /^https:\/\/psych-dev-site-git-[a-z0-9-]+-alexey-zykovs-projects\.vercel\.app$/i,
  /^https:\/\/academydom\.com$/i,
  /^https:\/\/www\.academydom\.com$/i,
] as const;

export function getAllowedAppOrigin(origin: string | undefined) {
  if (!origin) {
    return null;
  }

  return APP_ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin))
    ? origin
    : null;
}
