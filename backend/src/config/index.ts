import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

// The webhook secret must never have a default that is visible in the repository.
// Production refuses to start without one; development gets a random secret per run.
function webhookSecret(): string {
  const fromEnv = process.env.AWS_WEBHOOK_SECRET;
  if (fromEnv) return fromEnv;
  if (nodeEnv === 'production') throw new Error('AWS_WEBHOOK_SECRET must be set in production');
  console.warn('[config] AWS_WEBHOOK_SECRET not set: using a random secret for this run (webhook calls will be rejected).');
  return randomBytes(24).toString('hex');
}

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/raha_db',
  awsWebhookSecret: webhookSecret(),
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
