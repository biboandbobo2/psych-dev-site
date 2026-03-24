import { describe, expect, it } from 'vitest';

import { resolveFirebaseAuthDomain } from '../firebaseAuthDomain';

describe('resolveFirebaseAuthDomain', () => {
  it('использует custom host как authDomain для academydom', () => {
    expect(resolveFirebaseAuthDomain('psych-dev-site-prod.firebaseapp.com', 'academydom.com')).toBe(
      'academydom.com'
    );
    expect(resolveFirebaseAuthDomain('psych-dev-site-prod.firebaseapp.com', 'www.academydom.com')).toBe(
      'www.academydom.com'
    );
  });

  it('сохраняет текущий firebaseapp authDomain для других host', () => {
    expect(resolveFirebaseAuthDomain('psych-dev-site-prod.firebaseapp.com', 'psych-dev-site.vercel.app')).toBe(
      'psych-dev-site-prod.firebaseapp.com'
    );
  });
});
