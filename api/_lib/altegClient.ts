// Тонкий клиент к alteg.io (YCLIENTS) API: токены из env, помощники
// authHeaders / altegFetch / altegPost / altegDelete. Бросает ошибку если
// `success: false` от Alteg.

const ALTEG_BASE = 'https://api.alteg.io/api/v1';

export interface AltegConfig {
  partnerToken: string;
  userToken: string;
  companyId: string;
}

export function getAltegConfig(): AltegConfig {
  const partnerToken = process.env.ALTEG_PARTNER_TOKEN;
  const userToken = process.env.ALTEG_USER_TOKEN;
  const companyId = process.env.ALTEG_COMPANY_ID;
  if (!partnerToken || !userToken || !companyId) {
    throw new Error(
      'ALTEG_PARTNER_TOKEN, ALTEG_USER_TOKEN, and ALTEG_COMPANY_ID must be configured',
    );
  }
  return { partnerToken, userToken, companyId };
}

export function altegAuthHeaders(
  partnerToken: string,
  userToken?: string,
): Record<string, string> {
  const auth = userToken ? `Bearer ${partnerToken}, User ${userToken}` : `Bearer ${partnerToken}`;
  return {
    Accept: 'application/vnd.api.v2+json',
    'Content-Type': 'application/json',
    Authorization: auth,
  };
}

/** GET к Alteg API. Возвращает `data` или [] если тело пустое. */
export async function altegFetch(
  path: string,
  partnerToken: string,
  userToken?: string,
): Promise<any> {
  const url = `${ALTEG_BASE}${path}`;
  const res = await fetch(url, { headers: altegAuthHeaders(partnerToken, userToken) });
  const text = await res.text();
  if (!text) return [];
  const json = JSON.parse(text);
  if (!json.success) {
    throw new Error(json.meta?.message || 'Alteg.io API error');
  }
  return json.data;
}

/** POST к Alteg API. Возвращает `data` или null если тело пустое. */
export async function altegPost(
  path: string,
  body: unknown,
  partnerToken: string,
  userToken?: string,
): Promise<any> {
  const url = `${ALTEG_BASE}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: altegAuthHeaders(partnerToken, userToken),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!text) return null;
  const json = JSON.parse(text);
  if (!json.success) {
    throw new Error(json.meta?.message || 'Alteg.io API error');
  }
  return json.data;
}

/** DELETE для отмены записи. Возвращает { deleted: true } при успехе. */
export async function altegDelete(
  path: string,
  partnerToken: string,
  userToken?: string,
): Promise<{ deleted: true }> {
  const url = `${ALTEG_BASE}${path}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: altegAuthHeaders(partnerToken, userToken),
  });
  if (!res.ok) {
    const text = await res.text();
    let message = 'Cancel failed';
    try {
      message = JSON.parse(text)?.meta?.message || message;
    } catch {
      /* empty */
    }
    throw new Error(message);
  }
  return { deleted: true };
}
