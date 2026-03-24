const CUSTOM_AUTH_DOMAINS = new Set(['academydom.com', 'www.academydom.com']);

export function resolveFirebaseAuthDomain(
  configuredAuthDomain: string | undefined,
  currentHostname?: string
) {
  const normalizedHostname = currentHostname?.trim().toLowerCase();

  // For the custom domain we serve the Firebase auth helpers through Vercel rewrites,
  // so the SDK should stay on the same host to avoid cross-origin auth storage issues.
  if (normalizedHostname && CUSTOM_AUTH_DOMAINS.has(normalizedHostname)) {
    return normalizedHostname;
  }

  return configuredAuthDomain || 'localhost';
}
