import * as functions from "firebase-functions";
import { GoogleAuth } from "google-auth-library";
import { resolveAdminProjectId } from "./adminApp.js";

export async function readLatestSecretValue(secretName: string, projectId = resolveAdminProjectId()) {
  if (!projectId) {
    throw new Error(`Project ID is unavailable for secret ${secretName}`);
  }

  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const url = `https://secretmanager.googleapis.com/v1/projects/${projectId}/secrets/${secretName}/versions/latest:access`;
  const response = await client.request<{ payload?: { data?: string } }>({ url });
  const encoded = response.data.payload?.data;

  if (!encoded) {
    throw new Error(`Secret ${secretName} payload is empty`);
  }

  return Buffer.from(encoded, "base64").toString("utf8");
}

export async function tryReadLatestSecretValue(secretName: string, projectId = resolveAdminProjectId()) {
  try {
    return await readLatestSecretValue(secretName, projectId);
  } catch (error: any) {
    functions.logger.warn("Secret is unavailable", {
      error: error?.message || String(error),
      projectId,
      secretName,
    });
    return null;
  }
}
