import { readLatestSecretValue } from "./secrets.js";
const ADMIN_SEED_CODE_SECRET = process.env.ADMIN_SEED_CODE_SECRET_NAME || "admin-seed-code";
let adminSeedCodePromise = null;
export async function getAdminSeedCode() {
    if (!adminSeedCodePromise) {
        adminSeedCodePromise = (async () => {
            const value = (await readLatestSecretValue(ADMIN_SEED_CODE_SECRET)).trim();
            if (!value) {
                throw new Error(`Secret ${ADMIN_SEED_CODE_SECRET} is empty`);
            }
            return value;
        })();
    }
    return adminSeedCodePromise;
}
export function resetAdminSeedCodeCache() {
    adminSeedCodePromise = null;
}
