import { describe, it, expect } from 'vitest';
import { https } from 'firebase-functions';

import { ensureAdmin } from './index.js';

const makeContext = (role?: string): https.CallableContext => {
  return {
    auth: {
      token: {
        role,
      },
    },
    // The rest of the context isn't used in ensureAdmin, so stub it.
  } as https.CallableContext;
};

describe('ensureAdmin', () => {
  it('allows admin users', () => {
    expect(() => ensureAdmin(makeContext('admin'))).not.toThrow();
  });

  it('allows super-admin users', () => {
    expect(() => ensureAdmin(makeContext('super-admin'))).not.toThrow();
  });

  it('rejects non-admin users', () => {
    expect(() => ensureAdmin(makeContext('student'))).toThrowError('Admin only');
  });
});
