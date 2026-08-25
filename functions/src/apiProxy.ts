import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';

// РФ-зеркало (Firebase Hosting) не имеет собственных /api/* — они живут на
// Vercel, который из РФ заблокирован. Hosting-rewrite /api/** ведёт сюда,
// а функция ходит к Vercel из дата-центра Google, где ТСПУ нет на пути.
const UPSTREAM = 'https://psych-dev-site.vercel.app';

// Пробрасываем только то, что реально нужно api/*: контент, авторизация,
// BYOK-ключ Gemini. Cookies и служебные заголовки хостинга не форвардим.
const REQUEST_HEADERS = ['content-type', 'accept', 'authorization', 'x-gemini-api-key'];
const RESPONSE_HEADERS = ['content-type', 'cache-control'];

export const apiProxy = onRequest(
  { region: 'europe-west1', timeoutSeconds: 120, memory: '256MiB', maxInstances: 10 },
  async (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const headers: Record<string, string> = {};
    for (const name of REQUEST_HEADERS) {
      const value = req.get(name);
      if (value) headers[name] = value;
    }
    // Rate-limit в api/papers.ts берёт первый IP из X-Forwarded-For —
    // сохраняем реальный IP клиента, а не IP функции.
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
    if (clientIp) headers['x-forwarded-for'] = clientIp;

    try {
      const upstream = await fetch(UPSTREAM + req.originalUrl, {
        method: req.method,
        headers,
        body:
          req.method === 'GET' || req.method === 'HEAD' || !req.rawBody
            ? undefined
            : new Uint8Array(req.rawBody),
      });
      res.status(upstream.status);
      for (const name of RESPONSE_HEADERS) {
        const value = upstream.headers.get(name);
        if (value) res.set(name, value);
      }
      res.send(Buffer.from(await upstream.arrayBuffer()));
    } catch (err) {
      logger.error('[apiProxy] upstream request failed', { path: req.path, err });
      res.status(502).json({ error: 'Upstream unavailable' });
    }
  }
);
