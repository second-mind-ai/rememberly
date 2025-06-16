import * as chrono from 'chrono-node';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return true; // Web doesn't need explicit permission request
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
}

export function parseReminderTime(naturalInput: string): Date | null {
  try {
    const parsed = chrono.parseDate(naturalInput);
    if (parsed && parsed > new Date()) {
      return parsed;
    }
    return null;
  } catch (error) {
    console.error('Error parsing reminder time:', error);
    return null;
  }
}

export async function scheduleNotification(
  title: string,
  body: string,
  triggerDate: Date,
  noteId: string
): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      // Web notifications would be handled differently
      console.log('Would schedule web notification:', { title, body, triggerDate });
      return 'web-notification-id';
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      throw new Error('Notification permission denied');
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { noteId },
      },
      trigger: {
        date: triggerDate,
      },
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}

export function formatReminderTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffHours < 1) {
    const diffMinutes = Math.round(diffMs / (1000 * 60));
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