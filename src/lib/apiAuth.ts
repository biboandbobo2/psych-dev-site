import { auth } from './firebase';

export async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Нужно войти в аккаунт');
  }

  return user.getIdToken();
}

export async function buildAuthorizedHeaders(
  extraHeaders: Record<string, string | undefined> = {}
): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  Object.entries(extraHeaders).forEach(([key, value]) => {
    if (value) {
      headers[key] = value;
    }
  });

  return headers;
}
