import { describe, it, expect } from 'vitest';
import { ensureAdmin } from './index.js';
const makeContext = (role) => {
    return {
        auth: {
            token: {
                role,
            },
        },
        // The rest of the context isn't used in ensureAdmin, so stub it.
    };
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
