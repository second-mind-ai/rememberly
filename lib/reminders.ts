import * as chrono from 'chrono-node';
import { 
  scheduleLocalNotification, 
  cancelNotification, 
  registerForPushNotificationsAsync,
  NotificationData,
  ScheduleNotificationOptions 
} from './notifications';
import { Platform } from 'react-native';

// Note: Notification handler is configured in lib/notifications.ts to avoid conflicts

export function parseReminderTime(naturalInput: string, maxDaysInFuture: number = 730): Date | null {
  try {
    const parsed = chrono.parseDate(naturalInput);
    const now = new Date();

    // Validation: Date must be valid and in the future
    if (!parsed || isNaN(parsed.getTime())) {
      console.warn('Invalid date parsed from input:', naturalInput);
      return null;
    }

    if (parsed <= now) {
      console.warn('Parsed date is in the past:', parsed);
      return null;
    }

    // Validation: Date must not be too far in the future (default max 2 years)
    const maxDate = new Date(now.getTime() + maxDaysInFuture * 24 * 60 * 60 * 1000);
    if (parsed > maxDate) {
      console.warn(`Parsed date is too far in the future (max ${maxDaysInFuture} days):`, parsed);
      return null;
    }

    // Validation: Date must be reasonable (not year 9999, etc.)
    if (parsed.getFullYear() > 2100) {
      console.warn('Parsed date year is unreasonably far in future:', parsed.getFullYear());
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Error parsing reminder time:', error);
    return null;
  }
}

export async function scheduleNotification(
  title: string,
  body: string,
  triggerDate: Date,
  priority: 'low' | 'medium' | 'high' = 'medium'
): Promise<string | null> {
  try {
    // Validate inputs
    if (!title || !body) {
      throw new Error('Title and body are required');
    }

    if (triggerDate <= new Date()) {
      throw new Error('Trigger date must be in the future');
    }

    // Check permissions first
    const { permission } = await registerForPushNotificationsAsync();
    if (!permission.granted) {
      throw new Error('Notification permission denied');
    }

    // Create notification data
    const notificationData: NotificationData = {
      id: `reminder-${Date.now()}`,
      type: 'reminder',
      priority,
      sound: priority === 'high' ? 'default' : 'default',
      metadata: {
        createdAt: new Date().toISOString(),
        source: 'reminder'
      }
    };

    // Schedule using the main notification service
    const options: ScheduleNotificationOptions = {
      title: title.substring(0, 100),
      body: body.substring(0, 500),
      triggerDate,
      data: notificationData,
      sound: priority === 'high' ? 'default' : 'default',
      badge: 1
    };

    return await scheduleLocalNotification(options);
  } catch (error) {
    console.error('Error scheduling notification:', error);
    throw error;
  }
}

export async function cancelReminderNotification(notificationId: string): Promise<void> {
  try {
    await cancelNotification(notificationId);
  } catch (error) {
    console.error('Error canceling reminder notification:', error);
    throw error;
  }
}

export function formatReminderTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffHours < 1) {
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    if (diffMinutes <= 0) return 'Now';
    return `in ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
  } else if (diffHours < 24) {
    const hours = Math.round(diffHours);
    return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
  } else if (diffDays < 7) {
    const days = Math.round(diffDays);
    return `in ${days} day${days !== 1 ? 's' : ''}`;
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}

// Note: Notification listeners are initialized in lib/notifications.ts