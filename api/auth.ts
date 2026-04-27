/**
 * POST /api/auth
 * Auth operations for booking system (Firebase Admin SDK).
 * Actions: loginByEmail
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { initFirebaseAdmin } from '../src/lib/api-server/sharedApiRuntime.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const action = (req.query.action || req.body?.action) as string;

    switch (action) {
      case 'loginByEmail': {
        if (req.method !== 'POST') {
          return res.status(405).json({ success: false, error: 'POST required' });
        }
        const email = req.body?.email as string;
        if (!email) {
          return res.status(400).json({ success: false, error: 'email required' });
        }
        initFirebaseAdmin();
        const adminAuth = getAuth();
        try {
          const userRecord = await adminAuth.getUserByEmail(email);
          if (!userRecord.emailVerified) {
            return res.status(403).json({ success: false, error: 'EMAIL_NOT_VERIFIED' });
          }
          const token = await adminAuth.createCustomToken(userRecord.uid);
          return res.status(200).json({ success: true, data: { token } });
        } catch (err) {
          const code = (err as { code?: string })?.code;
          if (code === 'auth/user-not-found') {
            return res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });
          }
          throw err;
        }
      }
      default:
        return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return res.status(500).json({ success: false, error: message });
  }
}
