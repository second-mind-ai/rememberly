import * as chrono from 'chrono-node';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    // For web, check if browser supports notifications
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
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
  priority: 'low' | 'medium' | 'high' = 'medium'
): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      // Web notifications
      if ('Notification' in window && Notification.permission === 'granted') {
        const timeUntilTrigger = triggerDate.getTime() - Date.now();
        if (timeUntilTrigger > 0) {
          const timeoutId = setTimeout(() => {
            new Notification(title, {
              body,
              icon: '/favicon.png',
              badge: '/favicon.png',
              tag: `reminder-${Date.now()}`,
              requireInteraction: priority === 'high',
            });
          }, timeUntilTrigger);
          return `web-${timeoutId}`;
        }
      }
      return null;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      throw new Error('Notification permission denied');
    }

    // Configure notification sound based on priority
    let sound: string | undefined;
    let priority_android: Notifications.AndroidNotificationPriority;
    
    switch (priority) {
      case 'high':
        sound = 'default';
        priority_android = Notifications.AndroidNotificationPriority.HIGH;
        break;
      case 'medium':
        sound = 'default';
        priority_android = Notifications.AndroidNotificationPriority.DEFAULT;
        break;
      case 'low':
        sound = undefined;
        priority_android = Notifications.AndroidNotificationPriority.LOW;
        break;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound,
        priority: priority === 'high' ? Notifications.IosNotificationPriority.HIGH : Notifications.IosNotificationPriority.DEFAULT,
        data: { 
          priority,
          timestamp: triggerDate.toISOString(),
        },
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

export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (notificationId.startsWith('web-')) {
        const timeoutId = parseInt(notificationId.replace('web-', ''));
        clearTimeout(timeoutId);
      }
      return;
    }

    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error canceling notification:', error);
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

// Initialize notification listeners
export function initializeNotificationListeners() {
  // Handle notification received while app is in foreground
  const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received in foreground:', notification);
  });

  // Handle notification response (user tapped notification)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification response:', response);
    // You can navigate to specific screens based on notification data
  });

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}