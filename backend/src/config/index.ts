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
  // Messaging is off until AWS is ready: SMS_PROVIDER=sns picks Amazon SNS, SOS_LIVE=true lets the SOS
  // button actually message contacts. Both default to off, and the app then says so honestly.
  sms: {
    provider: (process.env.SMS_PROVIDER === 'sns' ? 'sns' : 'none') as 'sns' | 'none',
    region: process.env.AWS_REGION || 'ap-south-1',
    senderId: process.env.SMS_SENDER_ID || '',
  },
  sos: {
    live: process.env.SOS_LIVE === 'true',
    maxPerUserPerDay: parseInt(process.env.SOS_MAX_PER_DAY || '5', 10),
  },
};
