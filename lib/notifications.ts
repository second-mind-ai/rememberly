import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const priority = notification.request.content.data?.priority as string;
    const sound = notification.request.content.data?.sound as string;
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: sound !== 'none',
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
  id: string;
  type: 'reminder' | 'recurring' | 'custom';
  priority: 'low' | 'medium' | 'high';
  sound?: 'default' | 'custom' | 'none';
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
  };
  metadata?: Record<string, any>;
}

export interface ScheduleNotificationOptions {
  title: string;
  body: string;
  triggerDate: Date;
  data: NotificationData;
  sound?: 'default' | 'custom' | 'none';
  badge?: number;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
  };
}

export interface NotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
}

// Enhanced permission management
export async function registerForPushNotificationsAsync(): Promise<{
  token: string | null;
  permission: NotificationPermissionStatus;
}> {
  let token = null;
  let permission: NotificationPermissionStatus = {
    granted: false,
    canAskAgain: true,
    status: 'undetermined'
  };

  if (Platform.OS === 'web') {
    // Web notifications
    if ('Notification' in window) {
      const webPermission = await Notification.requestPermission();
      permission = {
        granted: webPermission === 'granted',
        canAskAgain: webPermission === 'default',
        status: webPermission
      };
      
      if (permission.granted) {
        token = 'web-notifications-enabled';
      }
    }
    return { token, permission };
  }

  // Set up notification channels for Android
  if (Platform.OS === 'android') {
    await setupAndroidChannels();
  }

  if (Constants.isDevice) {
    const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    permission.status = existingStatus;
    permission.canAskAgain = canAskAgain;
    
    if (existingStatus !== 'granted') {
      const { status, canAskAgain: newCanAskAgain } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
      });
      finalStatus = status;
      permission.canAskAgain = newCanAskAgain;
    }
    
    permission.granted = finalStatus === 'granted';
    permission.status = finalStatus;
    
    if (permission.granted) {
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        });
        token = tokenData.data;
      } catch (error) {
        console.error('Error getting push token:', error);
      }
    }
  } else {
    console.warn('Must use physical device for Push Notifications');
  }

  return { token, permission };
}

async function setupAndroidChannels(): Promise<void> {
  // Default channel
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
    sound: 'default',
  });

  // High priority channel
  await Notifications.setNotificationChannelAsync('high-priority', {
    name: 'High Priority',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
    sound: 'default',
    enableLights: true,
    enableVibrate: true,
  });

  // Low priority channel
  await Notifications.setNotificationChannelAsync('low-priority', {
    name: 'Low Priority',
    importance: Notifications.AndroidImportance.LOW,
    vibrationPattern: [0, 100],
    lightColor: '#FF231F7C',
    sound: undefined,
  });

  // Recurring notifications channel
  await Notifications.setNotificationChannelAsync('recurring', {
    name: 'Recurring Notifications',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
    sound: 'default',
  });
}

// Enhanced notification scheduling
export async function scheduleLocalNotification(
  options: ScheduleNotificationOptions
): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return scheduleWebNotification(options);
    }

    const { title, body, triggerDate, data, sound = 'default', badge, recurring } = options;
    
    // Determine channel based on priority and type
    let channelId = 'default';
    if (Platform.OS === 'android') {
      if (recurring) {
        channelId = 'recurring';
      } else if (data.priority === 'high') {
        channelId = 'high-priority';
      } else if (data.priority === 'low') {
        channelId = 'low-priority';
      }
    }

    const notificationContent: any = {
      title,
      body,
      data: {
        ...data,
        sound,
        scheduledAt: new Date().toISOString(),
      },
      sound: sound === 'none' ? false : (sound === 'default' ? 'default' : true),
      badge,
      categoryIdentifier: data.type,
    };

    // iOS-specific properties
    if (Platform.OS === 'ios') {
      notificationContent.priority = data.priority === 'high' 
        ? Notifications.IosNotificationPriority.HIGH 
        : Notifications.IosNotificationPriority.DEFAULT;
    }

    // Android-specific properties
    if (Platform.OS === 'android') {
      notificationContent.channelId = channelId;
      notificationContent.color = getPriorityColor(data.priority);
    }

    // Handle recurring notifications
    if (recurring) {
      return await scheduleRecurringNotification(notificationContent, triggerDate, recurring);
    }

    // Schedule single notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: {
        date: triggerDate,
      },
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    throw new Error(`Failed to schedule notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function scheduleRecurringNotification(
  content: any,
  startDate: Date,
  recurring: NonNullable<ScheduleNotificationOptions['recurring']>
): Promise<string> {
  const { frequency, interval, endDate } = recurring;
  const notificationIds: string[] = [];
  
  let currentDate = new Date(startDate);
  const maxNotifications = 50; // Limit to prevent too many scheduled notifications
  let count = 0;

  while (count < maxNotifications) {
    if (endDate && currentDate > endDate) {
      break;
    }

    if (currentDate > new Date()) {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          ...content,
          data: {
            ...content.data,
            recurringId: content.data.id,
            occurrence: count + 1,
          },
        },
        trigger: {
          date: currentDate,
        },
      });
      
      notificationIds.push(notificationId);
    }

    // Calculate next occurrence
    switch (frequency) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + interval);
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + (7 * interval));
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + interval);
        break;
    }

    count++;
  }

  // Return the first notification ID as the primary identifier
  return notificationIds[0] || '';
}

function scheduleWebNotification(options: ScheduleNotificationOptions): string | null {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null;
  }

  const { title, body, triggerDate, data, badge } = options;
  const timeUntilTrigger = triggerDate.getTime() - Date.now();
  
  if (timeUntilTrigger <= 0) {
    // Show immediately if time has passed
    new Notification(title, {
      body,
      icon: '/favicon.png',
      badge: '/favicon.png',
      tag: `notification-${data.id}`,
      requireInteraction: data.priority === 'high',
      data,
    });
    return `web-immediate-${data.id}`;
  }

  const timeoutId = setTimeout(() => {
    new Notification(title, {
      body,
      icon: '/favicon.png',
      badge: '/favicon.png',
      tag: `notification-${data.id}`,
      requireInteraction: data.priority === 'high',
      data,
    });
  }, timeUntilTrigger);

  return `web-${timeoutId}`;
}

// Enhanced notification management
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
    throw new Error(`Failed to cancel notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function cancelNotificationsByTag(tag: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      // Web doesn't have a direct way to cancel by tag
      return;
    }

    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const notificationsToCancel = scheduledNotifications.filter(
      notification => notification.content.data?.tag === tag
    );

    await Promise.all(
      notificationsToCancel.map(notification => 
        Notifications.cancelScheduledNotificationAsync(notification.identifier)
      )
    );
  } catch (error) {
    console.error('Error canceling notifications by tag:', error);
    throw new Error(`Failed to cancel notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      return;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling all notifications:', error);
    throw new Error(`Failed to cancel all notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Notification queries and management
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    if (Platform.OS === 'web') {
      return [];
    }

    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

export async function updateNotificationBadge(count: number): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      // Web doesn't support badge updates
      return;
    }

    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('Error updating badge count:', error);
  }
}

export async function clearNotificationBadge(): Promise<void> {
  await updateNotificationBadge(0);
}

// Utility functions
function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high':
      return '#DC2626';
    case 'medium':
      return '#2563EB';
    case 'low':
      return '#6B7280';
    default:
      return '#2563EB';
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

// Enhanced notification listeners
export function initializeNotificationListeners() {
  // Handle notification received while app is in foreground
  const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received in foreground:', notification);
    
    // Handle badge updates
    const badge = notification.request.content.badge;
    if (badge !== undefined) {
      updateNotificationBadge(badge);
    }
    
    // Custom handling based on notification type
    const data = notification.request.content.data as NotificationData;
    if (data?.type === 'recurring') {
      console.log('Recurring notification received:', data);
    }
  });

  // Handle notification response (user tapped notification)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification response:', response);
    const data = response.notification.request.content.data as NotificationData;
    
    // Clear badge when user interacts with notification
    clearNotificationBadge();
    
    // Handle navigation based on notification data
    if (data?.metadata?.noteId) {
      console.log('Navigate to note:', data.metadata.noteId);
      // You can use router.push here to navigate
    } else if (data?.type === 'reminder') {
      console.log('Navigate to reminders');
      // Navigate to reminders screen
    }
  });

  // Handle notification dropped (iOS only)
  const droppedSubscription = Platform.OS === 'ios' 
    ? Notifications.addNotificationDroppedListener(notification => {
        console.log('Notification dropped:', notification);
      })
    : null;

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
    if (droppedSubscription) {
      droppedSubscription.remove();
    }
  };
}

// Notification testing utilities (for development)
export async function testNotification(): Promise<void> {
  try {
    const { permission } = await registerForPushNotificationsAsync();
    
    if (!permission.granted) {
      throw new Error('Notification permission not granted');
    }

    await scheduleLocalNotification({
      title: 'Test Notification',
      body: 'This is a test notification to verify the system is working correctly.',
      triggerDate: new Date(Date.now() + 5000), // 5 seconds from now
      data: {
        id: 'test-notification',
        type: 'custom',
        priority: 'medium',
      },
    });

    console.log('Test notification scheduled successfully');
  } catch (error) {
    console.error('Test notification failed:', error);
    throw error;
  }
}