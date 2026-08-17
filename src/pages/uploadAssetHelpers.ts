import { auth } from "../lib/firebase";
import { debugError, debugLog } from "../lib/debug";

export async function diagnoseToken() {
  const user = auth.currentUser;
  if (!user) {
    debugError("❌ No authenticated user");
    return null;
  }

  await user.getIdToken(true);
  const tokenResult = await user.getIdTokenResult(true);

  debugLog("🔍 === TOKEN DIAGNOSTICS ===");
  debugLog("Claims keys:", Object.keys(tokenResult.claims));
  debugLog("👑 Role claim:", tokenResult.claims.role);
  debugLog("⏰ Token issued:", new Date(tokenResult.issuedAtTime));
  debugLog("⏰ Token expires:", new Date(tokenResult.expirationTime));
  debugLog("🔍 === END DIAGNOSTICS ===");

  return tokenResult;
}
