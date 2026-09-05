import { normalizeBangladeshiPhone } from '@/lib/auth';

export interface SmsMessage {
  to: string; // E.164 phone (+8801XXXXXXXXX) or local format (01XXXXXXXXX)
  text: string; // Message content (Bengali or English)
  bookingId?: string;
  metadata?: Record<string, unknown>;
}

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  provider: string;
  recipient: string;
  error?: string;
  timestamp: string;
}

/**
 * Clean abstract provider interface allowing easy swapping of SMS vendors
 * or adding push notification providers (e.g., Firebase Cloud Messaging)
 * without touching core booking or scheduling logic.
 */
export interface NotificationProvider {
  readonly name: string;
  send(message: SmsMessage): Promise<SmsSendResult>;
  sendBatch?(messages: SmsMessage[]): Promise<SmsSendResult[]>;
}

// -----------------------------------------------------------------------------
// 1. Mock / Development In-Memory SMS Provider
// -----------------------------------------------------------------------------
export class MockSmsProvider implements NotificationProvider {
  readonly name = 'mock';
  private sentHistory: Array<SmsMessage & { sentAt: string; messageId: string }> = [];

  async send(message: SmsMessage): Promise<SmsSendResult> {
    const { isValid, formatted } = normalizeBangladeshiPhone(message.to);
    const recipient = isValid ? formatted : message.to;
    const messageId = `mock_sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record = {
      ...message,
      to: recipient,
      sentAt: new Date().toISOString(),
      messageId,
    };

    this.sentHistory.push(record);

    if (process.env.NODE_ENV !== 'test') {
      console.log(`\n📱 [MOCK SMS DELIVERED via ${this.name}]`);
      console.log(`   To: ${recipient}`);
      console.log(`   Text: ${message.text}`);
      if (message.bookingId) console.log(`   Booking ID: ${message.bookingId}`);
      console.log(`   Message ID: ${messageId}\n`);
    }

    return {
      success: true,
      messageId,
      provider: this.name,
      recipient,
      timestamp: record.sentAt,
    };
  }

  async sendBatch(messages: SmsMessage[]): Promise<SmsSendResult[]> {
    return Promise.all(messages.map((m) => this.send(m)));
  }

  getHistory() {
    return [...this.sentHistory];
  }

  clearHistory() {
    this.sentHistory = [];
  }
}

// -----------------------------------------------------------------------------
// 2. Twilio SMS Provider
// -----------------------------------------------------------------------------
export class TwilioSmsProvider implements NotificationProvider {
  readonly name = 'twilio';
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(options?: { accountSid?: string; authToken?: string; fromNumber?: string }) {
    this.accountSid = options?.accountSid || process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = options?.authToken || process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = options?.fromNumber || process.env.TWILIO_PHONE_NUMBER || '';
  }

  async send(message: SmsMessage): Promise<SmsSendResult> {
    const { isValid, formatted } = normalizeBangladeshiPhone(message.to);
    const recipient = isValid ? formatted : message.to;

    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      return {
        success: false,
        provider: this.name,
        recipient,
        error: 'Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', recipient);
      params.append('From', this.fromNumber);
      params.append('Body', message.text);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          provider: this.name,
          recipient,
          error: data?.message || 'Twilio SMS dispatch failed',
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        messageId: data.sid,
        provider: this.name,
        recipient,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        success: false,
        provider: this.name,
        recipient,
        error: err instanceof Error ? err.message : 'Twilio network error',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// -----------------------------------------------------------------------------
// 3. Greenweb Bangladesh SMS Provider
// -----------------------------------------------------------------------------
export class GreenwebSmsProvider implements NotificationProvider {
  readonly name = 'greenweb';
  private token: string;

  constructor(token?: string) {
    this.token = token || process.env.GREENWEB_SMS_API_KEY || process.env.GREENWEB_TOKEN || '';
  }

  async send(message: SmsMessage): Promise<SmsSendResult> {
    const { isValid, formatted } = normalizeBangladeshiPhone(message.to);
    const recipient = isValid ? formatted : message.to;

    if (!this.token) {
      return {
        success: false,
        provider: this.name,
        recipient,
        error: 'Greenweb SMS token not configured (GREENWEB_SMS_API_KEY)',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const endpoint = 'https://api.greenweb.com.bd/api.php?json';
      const params = new URLSearchParams();
      params.append('token', this.token);
      params.append('to', recipient);
      params.append('message', message.text);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      const data = await res.json();
      const isSuccess = Array.isArray(data) ? data[0]?.status === 'SENT' : data?.status === 'SENT';

      return {
        success: isSuccess,
        messageId: Array.isArray(data) ? data[0]?.msgid : data?.msgid,
        provider: this.name,
        recipient,
        error: isSuccess ? undefined : (Array.isArray(data) ? data[0]?.status : data?.status) || 'Greenweb dispatch failed',
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        success: false,
        provider: this.name,
        recipient,
        error: err instanceof Error ? err.message : 'Greenweb connection error',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// -----------------------------------------------------------------------------
// 4. SSL Wireless Bangladesh SMS Provider
// -----------------------------------------------------------------------------
export class SslWirelessSmsProvider implements NotificationProvider {
  readonly name = 'ssl_wireless';
  private apiToken: string;
  private sid: string;
  private apiUrl: string;

  constructor(options?: { apiToken?: string; sid?: string; apiUrl?: string }) {
    this.apiToken = options?.apiToken || process.env.SSL_SMS_API_TOKEN || '';
    this.sid = options?.sid || process.env.SSL_SMS_SID || '';
    this.apiUrl = options?.apiUrl || process.env.SSL_SMS_API_URL || 'https://smsplus.sslwireless.com/api/v3/send-sms';
  }

  async send(message: SmsMessage): Promise<SmsSendResult> {
    const { isValid, formatted } = normalizeBangladeshiPhone(message.to);
    const recipient = isValid ? formatted : message.to;

    if (!this.apiToken || !this.sid) {
      return {
        success: false,
        provider: this.name,
        recipient,
        error: 'SSL Wireless credentials not configured (SSL_SMS_API_TOKEN, SSL_SMS_SID)',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const payload = {
        api_token: this.apiToken,
        sid: this.sid,
        msisdn: recipient,
        sms: message.text,
        csms_id: `hb_${Date.now()}`,
      };

      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      const isSuccess = data?.status === 'SUCCESS' || data?.status_code === 200;

      return {
        success: isSuccess,
        messageId: data?.smsinfo?.[0]?.sms_id || data?.csms_id,
        provider: this.name,
        recipient,
        error: isSuccess ? undefined : data?.error_message || 'SSL Wireless SMS failed',
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        success: false,
        provider: this.name,
        recipient,
        error: err instanceof Error ? err.message : 'SSL Wireless connection error',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// -----------------------------------------------------------------------------
// 5. Generic HTTP Gateway Provider
// -----------------------------------------------------------------------------
export class GenericHttpSmsProvider implements NotificationProvider {
  readonly name = 'generic';
  private gatewayUrl: string;
  private apiKey: string;
  private senderId: string;

  constructor(options?: { gatewayUrl?: string; apiKey?: string; senderId?: string }) {
    this.gatewayUrl = options?.gatewayUrl || process.env.SMS_GATEWAY_URL || '';
    this.apiKey = options?.apiKey || process.env.SMS_API_KEY || '';
    this.senderId = options?.senderId || process.env.SMS_SENDER_ID || 'HuzurBooking';
  }

  async send(message: SmsMessage): Promise<SmsSendResult> {
    const { isValid, formatted } = normalizeBangladeshiPhone(message.to);
    const recipient = isValid ? formatted : message.to;

    if (!this.gatewayUrl) {
      return {
        success: false,
        provider: this.name,
        recipient,
        error: 'Generic SMS gateway URL not configured (SMS_GATEWAY_URL)',
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const res = await fetch(this.gatewayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          to: recipient,
          text: message.text,
          sender: this.senderId,
          bookingId: message.bookingId,
        }),
      });

      const data = await res.json().catch(() => ({}));
      return {
        success: res.ok,
        messageId: data?.id || data?.messageId,
        provider: this.name,
        recipient,
        error: res.ok ? undefined : data?.error || `HTTP ${res.status}`,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        success: false,
        provider: this.name,
        recipient,
        error: err instanceof Error ? err.message : 'Generic gateway connection failed',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// -----------------------------------------------------------------------------
// Shared Singleton & Provider Factory
// -----------------------------------------------------------------------------
const defaultMockProvider = new MockSmsProvider();

export function getNotificationProvider(): NotificationProvider {
  const explicitProvider = process.env.SMS_PROVIDER?.toLowerCase();

  if (explicitProvider === 'twilio') {
    return new TwilioSmsProvider();
  }
  if (explicitProvider === 'greenweb') {
    return new GreenwebSmsProvider();
  }
  if (explicitProvider === 'ssl_wireless') {
    return new SslWirelessSmsProvider();
  }
  if (explicitProvider === 'generic') {
    return new GenericHttpSmsProvider();
  }
  if (explicitProvider === 'mock') {
    return defaultMockProvider;
  }

  // Auto-detect based on presence of credentials
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    return new TwilioSmsProvider();
  }
  if (process.env.GREENWEB_SMS_API_KEY || process.env.GREENWEB_TOKEN) {
    return new GreenwebSmsProvider();
  }
  if (process.env.SSL_SMS_API_TOKEN && process.env.SSL_SMS_SID) {
    return new SslWirelessSmsProvider();
  }
  if (process.env.SMS_GATEWAY_URL) {
    return new GenericHttpSmsProvider();
  }

  // Default fallback for test / demo environment
  return defaultMockProvider;
}

/**
 * Universal SMS send helper called across booking and scheduled reminder flows
 */
export async function sendSms(message: SmsMessage): Promise<SmsSendResult> {
  const provider = getNotificationProvider();
  return provider.send(message);
}

/**
 * Helper to retrieve mock provider history during testing
 */
export function getMockSmsHistory() {
  return defaultMockProvider.getHistory();
}

/**
 * Helper to clear mock provider history during testing
 */
export function clearMockSmsHistory() {
  defaultMockProvider.clearHistory();
}
