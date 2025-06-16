import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const priority = notification.request.content.data?.priority as string;
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      ...(Platform.OS === 'ios' && {
        priority: priority === 'high' 
          ? Notifications.IosNotificationPriority.HIGH 
          : Notifications.IosNotificationPriority.DEFAULT,
      }),
    };
  },
});

export interface NotificationData {
  reminderId: string;
  noteId?: string;
  priority: 'low' | 'medium' | 'high';
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token = null;

  if (Platform.OS === 'web') {
    // Web notifications
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        return 'web-notifications-enabled';
      }
    }
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('high-priority', {
      name: 'High Priority Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
    });
  }

  if (Constants.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      throw new Error('Permission not granted for push notifications');
    }
    
    try {
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;
    } catch (error) {
      console.error('Error getting push token:', error);
    }
  } else {
    console.warn('Must use physical device for Push Notifications');
  }

  return token;
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  triggerDate: Date,
  data: NotificationData
): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return scheduleWebNotification(title, body, triggerDate, data);
    }

    const channelId = data.priority === 'high' ? 'high-priority' : 'reminders';
    
    const notificationContent: any = {
      title,
      body,
      data,
      sound: data.priority === 'high' ? 'default' : true,
      categoryIdentifier: 'reminder',
    };

    // Only set iOS-specific priority on iOS
    if (Platform.OS === 'ios') {
      notificationContent.priority = data.priority === 'high' 
        ? Notifications.IosNotificationPriority.HIGH 
        : Notifications.IosNotificationPriority.DEFAULT;
    }

    // Only set Android-specific properties on Android
    if (Platform.OS === 'android') {
      notificationContent.channelId = channelId;
      notificationContent.color = data.priority === 'high' ? '#DC2626' : '#2563EB';
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
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

function scheduleWebNotification(
  title: string,
  body: string,
  triggerDate: Date,
  data: NotificationData
): string | null {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null;
  }

  const timeUntilTrigger = triggerDate.getTime() - Date.now();
  
  if (timeUntilTrigger <= 0) {
    // Show immediately if time has passed
    new Notification(title, {
      body,
      icon: '/favicon.png',
      badge: '/favicon.png',
      tag: `reminder-${data.reminderId}`,
      requireInteraction: data.priority === 'high',
      data,
    });
    return `web-immediate-${data.reminderId}`;
  }

  const timeoutId = setTimeout(() => {
    new Notification(title, {
      body,
      icon: '/favicon.png',
      badge: '/favicon.png',
      tag: `reminder-${data.reminderId}`,
      requireInteraction: data.priority === 'high',
      data,
    });
  }, timeUntilTrigger);

  return `web-${timeoutId}`;
}

export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (notificationId.startsWith('web-') && !notificationId.includes('immediate')) {
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

export async function cancelAllNotifications(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      // Web doesn't have a direct way to cancel all, but we can clear by tag
      return;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling all notifications:', error);
  }
}

export function formatReminderTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    const pastMinutes = Math.abs(diffMinutes);
    const pastHours = Math.abs(diffHours);
    const pastDays = Math.abs(diffDays);
    
    if (pastMinutes < 60) {
      return `${pastMinutes} minute${pastMinutes !== 1 ? 's' : ''} ago`;
    } else if (pastHours < 24) {
      return `${pastHours} hour${pastHours !== 1 ? 's' : ''} ago`;
    } else {
      return `${pastDays} day${pastDays !== 1 ? 's' : ''} ago`;
    }
  }

  if (diffMinutes < 60) {
    return `in ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
  } else if (diffHours < 24) {
    return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  } else if (diffDays < 7) {
    return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
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
    const data = response.notification.request.content.data as NotificationData;
    
    // You can navigate to specific screens based on notification data
    if (data.noteId) {
      // Navigate to note detail
      console.log('Navigate to note:', data.noteId);
    } else {
      // Navigate to reminders screen
      console.log('Navigate to reminders');
    }
  });

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}