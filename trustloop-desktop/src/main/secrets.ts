import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const SECRET_NAME = process.env.AWS_SECRET_NAME || "trustloop/production";
const REGION = process.env.AWS_REGION || "us-east-1";

/**
 * In production, fetch ALL env vars from AWS Secrets Manager —
 * the same JSON blob the web app's ECS tasks use (trustloop/production).
 * In development, .env file is sufficient — this is a no-op.
 */
export async function loadAwsSecrets(): Promise<void> {
  if (process.env.NODE_ENV !== "production") return;

  const client = new SecretsManagerClient({ region: REGION });
  const res = await client.send(new GetSecretValueCommand({ SecretId: SECRET_NAME }));
  if (!res.SecretString) throw new Error(`Empty secret: ${SECRET_NAME}`);

  const secrets: Record<string, string> = JSON.parse(res.SecretString);
  for (const [key, value] of Object.entries(secrets)) {
    // Don't overwrite values explicitly set via CLI or environment
    if (!process.env[key]) process.env[key] = value;
  }
}
