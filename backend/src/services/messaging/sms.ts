import { config } from '../../config/index.js';

// Outbound SMS behind one small interface. Nothing is sent unless SMS_PROVIDER=sns AND the caller's
// own gate (for SOS: SOS_LIVE=true) is on, so the app can run with no AWS at all.

export interface SmsResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export interface SmsProvider {
  readonly name: string;
  send(to: string, body: string): Promise<SmsResult>;
}

/** Used when no provider is configured: reports honestly that nothing was sent. */
export class NoSmsProvider implements SmsProvider {
  readonly name = 'none';
  async send(): Promise<SmsResult> {
    return { ok: false, error: 'SMS is not configured on this server' };
  }
}

/** Amazon SNS, transactional SMS. Credentials come from the usual AWS chain (Lambda role, profile, env). */
export class SnsSmsProvider implements SmsProvider {
  readonly name = 'sns';
  private clientPromise: Promise<{ send: (cmd: unknown) => Promise<{ MessageId?: string }> }> | null = null;

  private client() {
    // Loaded on first use so servers that never send SMS do not need AWS set up.
    this.clientPromise ??= import('@aws-sdk/client-sns').then(
      (m) => new m.SNSClient({ region: config.sms.region }) as unknown as { send: (cmd: unknown) => Promise<{ MessageId?: string }> }
    );
    return this.clientPromise;
  }

  async send(to: string, body: string): Promise<SmsResult> {
    try {
      const { PublishCommand } = await import('@aws-sdk/client-sns');
      const attributes: Record<string, { DataType: string; StringValue: string }> = {
        'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' },
      };
      if (config.sms.senderId) attributes['AWS.SNS.SMS.SenderID'] = { DataType: 'String', StringValue: config.sms.senderId };
      const out = await (await this.client()).send(new PublishCommand({ PhoneNumber: to, Message: body, MessageAttributes: attributes }));
      return { ok: true, messageId: out.MessageId };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }
}

let provider: SmsProvider | null = null;

export function smsProvider(): SmsProvider {
  provider ??= config.sms.provider === 'sns' ? new SnsSmsProvider() : new NoSmsProvider();
  return provider;
}

/** Tests swap the provider. */
export function setSmsProvider(p: SmsProvider | null) {
  provider = p;
}

/** E.164 digits only, or null when the number cannot be used. */
export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, '');
  const plus = digits.startsWith('+') ? digits : `+${digits}`;
  return /^\+\d{8,15}$/.test(plus) ? plus : null;
}
