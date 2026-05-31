import { db } from '../db/client.js';
import { logger } from './logger.js';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export async function sendPushNotificationToAll(payload: PushNotificationPayload): Promise<void> {
  try {
    const devices = db.prepare('SELECT push_token FROM registered_devices').all() as Array<{ push_token: string }>;
    if (devices.length === 0) {
      logger.info('No registered devices for push notifications.');
      return;
    }

    const messages = devices.map((d) => ({
      to: d.push_token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data,
    }));

    logger.info(`Sending push notifications to ${devices.length} devices...`);

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Expo push API returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    logger.info('Push notifications sent successfully', { result });
  } catch (err) {
    logger.error('Failed to send push notifications:', {}, err as Error);
  }
}
