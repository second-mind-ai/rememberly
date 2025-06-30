import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const priority = notification.request.content.data?.priority as string;
    const sound = notification.request.content.data?.sound as string;
    
    console.log('📱 Notification received:', {
      title: notification.request.content.title,
      body: notification.request.content.body,
      data: notification.request.content.data,
      priority,
      sound
    });
    
    return {
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: sound !== 'none',
      shouldSetBadge: true,
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

// Enhanced permission management with better error handling
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

  try {
    console.log('🔔 Registering for push notifications...');
    
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
          console.log('✅ Web notifications enabled');
        } else {
          console.log('❌ Web notifications denied');
        }
      }
      return { token, permission };
    }

    // Note: Local notifications work in simulator, push notifications don't
    const isSimulator = !Constants.isDevice;
    if (isSimulator) {
      console.warn('⚠️ Push notifications only work on physical devices, but local notifications will work');
    }

    // Set up notification channels for Android first
    if (Platform.OS === 'android') {
      await setupAndroidChannels();
    }

    // Get existing permissions
    const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    permission.status = existingStatus;
    permission.canAskAgain = canAskAgain;
    
    console.log('📋 Current permission status:', existingStatus);
    
    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      console.log('🔄 Requesting notification permissions...');
      
      const permissionRequest = Platform.OS === 'ios' 
        ? {
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
              allowAnnouncements: true,
            },
          }
        : {};

      const { status, canAskAgain: newCanAskAgain } = await Notifications.requestPermissionsAsync(permissionRequest);
      finalStatus = status;
      permission.canAskAgain = newCanAskAgain;
      
      console.log('📋 New permission status:', status);
    }
    
    permission.granted = finalStatus === 'granted';
    permission.status = finalStatus;
    
    // Get push token only if permissions granted and on real device
    if (permission.granted && !isSimulator) {
      try {
        // Use project ID from expo config or constants
        const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                         Constants.easConfig?.projectId ||
                         Constants.manifest?.extra?.eas?.projectId;

        if (projectId) {
          const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: projectId,
          });
          token = tokenData.data;
          console.log('🎯 Got push token:', token?.substring(0, 20) + '...');
        } else {
          // Fallback for development
          console.warn('⚠️ No project ID found, using development token');
          const tokenData = await Notifications.getDevicePushTokenAsync();
          token = tokenData.data;
          console.log('🔧 Got device token:', typeof token);
        }
      } catch (error) {
        console.error('❌ Error getting push token:', error);
        // Don't throw here, just log the error
      }
    } else if (permission.granted && isSimulator) {
      // For simulator, just set a placeholder token to indicate permissions are granted
      token = 'simulator-local-notifications-enabled';
      console.log('🔧 Simulator: Local notifications enabled');
    }
    
    if (permission.granted) {
      console.log('✅ Notification permissions granted successfully');
    } else {
      console.log('❌ Notification permissions denied');
    }
  } catch (error) {
    console.error('❌ Error in registerForPushNotificationsAsync:', error);
    // Return default permission state on error
  }

  return { token, permission };
}

async function setupAndroidChannels(): Promise<void> {
  try {
    console.log('📱 Setting up Android notification channels...');
    
    // Default channel
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default Notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
      sound: 'default',
      showBadge: true,
    });

    // High priority channel
    await Notifications.setNotificationChannelAsync('high-priority', {
      name: 'High Priority Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#DC2626',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
    });

    // Low priority channel
    await Notifications.setNotificationChannelAsync('low-priority', {
      name: 'Low Priority Notifications',
      importance: Notifications.AndroidImportance.LOW,
      vibrationPattern: [0, 100],
      lightColor: '#6B7280',
      sound: undefined,
      showBadge: false,
    });

    // Recurring notifications channel
    await Notifications.setNotificationChannelAsync('recurring', {
      name: 'Recurring Notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#059669',
      sound: 'default',
      showBadge: true,
    });
    
    console.log('✅ Android channels set up successfully');
  } catch (error) {
    console.error('❌ Error setting up Android channels:', error);
  }
}

// Enhanced notification scheduling with better error handling
export async function scheduleLocalNotification(
  options: ScheduleNotificationOptions
): Promise<string | null> {
  try {
    console.log('📅 Scheduling notification:', {
      title: options.title,
      triggerDate: options.triggerDate,
      type: options.data.type,
      priority: options.data.priority
    });
    
    if (Platform.OS === 'web') {
      return scheduleWebNotification(options);
    }

    const { title, body, triggerDate, data, sound = 'default', badge, recurring } = options;
    
    // Validate inputs
    if (!title || !body) {
      throw new Error('Title and body are required');
    }

    if (triggerDate <= new Date()) {
      throw new Error('Trigger date must be in the future');
    }

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
      title: title.substring(0, 100), // Limit title length
      body: body.substring(0, 500), // Limit body length
      data: {
        ...data,
        sound,
        scheduledAt: new Date().toISOString(),
      },
      sound: sound === 'none' ? false : (sound === 'default' ? 'default' : true),
      categoryIdentifier: data.type,
    };

    // Add badge only if specified and valid
    if (badge !== undefined && badge >= 0) {
      notificationContent.badge = badge;
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
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    console.log('✅ Notification scheduled successfully:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('❌ Error scheduling notification:', error);
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

  try {
    console.log('🔄 Scheduling recurring notifications...');
    
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
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(currentDate), // Create new date object
          },
        });
        
        notificationIds.push(notificationId);
      }

      // Calculate next occurrence
      switch (frequency) {
        case 'daily':
          currentDate = new Date(currentDate.getTime() + (24 * 60 * 60 * 1000 * interval));
          break;
        case 'weekly':
          currentDate = new Date(currentDate.getTime() + (7 * 24 * 60 * 60 * 1000 * interval));
          break;
        case 'monthly':
          currentDate = new Date(currentDate);
          currentDate.setMonth(currentDate.getMonth() + interval);
          break;
      }

      count++;
    }

    console.log(`✅ Scheduled ${notificationIds.length} recurring notifications`);
    // Return the first notification ID as the primary identifier
    return notificationIds[0] || '';
  } catch (error) {
    console.error('❌ Error scheduling recurring notifications:', error);
    throw error;
  }
}

function scheduleWebNotification(options: ScheduleNotificationOptions): string | null {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    console.log('❌ Web notifications not available or not granted');
    return null;
  }

  const { title, body, triggerDate, data } = options;
  const timeUntilTrigger = triggerDate.getTime() - Date.now();
  
  console.log('🌐 Scheduling web notification for:', timeUntilTrigger, 'ms');
  
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
    console.log('🌐 Showing web notification:', title);
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

// Enhanced notification management with better error handling
export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    console.log('🗑️ Cancelling notification:', notificationId);
    
    if (!notificationId) {
      throw new Error('Notification ID is required');
    }

    if (Platform.OS === 'web') {
      if (notificationId.startsWith('web-') && !notificationId.includes('immediate')) {
        const timeoutId = parseInt(notificationId.replace('web-', ''));
        if (!isNaN(timeoutId)) {
          clearTimeout(timeoutId);
          console.log('✅ Web notification timeout cleared');
        }
      }
      return;
    }

    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log('✅ Notification cancelled successfully');
  } catch (error) {
    console.error('❌ Error canceling notification:', error);
    throw new Error(`Failed to cancel notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function cancelNotificationsByTag(tag: string): Promise<void> {
  try {
    console.log('🗑️ Cancelling notifications by tag:', tag);
    
    if (Platform.OS === 'web') {
      // Web doesn't have a direct way to cancel by tag
      return;
    }

    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const notificationsToCancel = scheduledNotifications.filter(
      notification => notification.content.data?.tag === tag
    );

    console.log(`🗑️ Found ${notificationsToCancel.length} notifications to cancel`);

    await Promise.all(
      notificationsToCancel.map(notification => 
        Notifications.cancelScheduledNotificationAsync(notification.identifier)
      )
    );
    
    console.log('✅ Notifications cancelled by tag successfully');
  } catch (error) {
    console.error('❌ Error canceling notifications by tag:', error);
    throw new Error(`Failed to cancel notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    console.log('🗑️ Cancelling all notifications...');
    
    if (Platform.OS === 'web') {
      return;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('✅ All notifications cancelled successfully');
  } catch (error) {
    console.error('❌ Error canceling all notifications:', error);
    throw new Error(`Failed to cancel all notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Notification queries and management
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    if (Platform.OS === 'web') {
      return [];
    }

    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`📋 Found ${notifications.length} scheduled notifications`);
    return notifications;
  } catch (error) {
    console.error('❌ Error getting scheduled notifications:', error);
    return [];
  }
}

export async function updateNotificationBadge(count: number): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      // Web doesn't support badge updates
      return;
    }

    // Ensure count is a valid number
    const badgeCount = Math.max(0, Math.floor(count));
    await Notifications.setBadgeCountAsync(badgeCount);
    console.log('✅ Badge count updated to:', badgeCount);
  } catch (error) {
    console.error('❌ Error updating badge count:', error);
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
  try {
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
  } catch (error) {
    console.error('❌ Error formatting reminder time:', error);
    return 'Invalid date';
  }
}

// Enhanced notification listeners with better error handling and navigation
export function initializeNotificationListeners() {
  try {
    console.log('🎧 Initializing notification listeners...');
    
    // Handle notification received while app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      try {
        console.log('📱 Notification received in foreground:', {
          title: notification.request.content.title,
          data: notification.request.content.data
        });
        
        // Handle badge updates
        const badge = notification.request.content.badge;
        if (badge !== undefined && typeof badge === 'number') {
          updateNotificationBadge(badge);
        }
        
        // Custom handling based on notification type
        const data = notification.request.content.data as NotificationData;
        if (data?.type === 'recurring') {
          console.log('🔄 Recurring notification received:', data);
        }
      } catch (error) {
        console.error('❌ Error handling foreground notification:', error);
      }
    });

    // Handle notification response (user tapped notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      try {
        console.log('👆 Notification tapped:', {
          title: response.notification.request.content.title,
          data: response.notification.request.content.data
        });
        
        const data = response.notification.request.content.data as NotificationData;
        
        // Clear badge when user interacts with notification
        clearNotificationBadge();
        
        // Handle navigation based on notification data
        if (data?.metadata?.noteId) {
          console.log('🧭 Navigate to note:', data.metadata.noteId);
          // Navigate to the specific note
          router.push(`/note/${data.metadata.noteId}`);
        } else if (data?.metadata?.reminderId) {
          console.log('🧭 Navigate to reminders');
          // Navigate to reminders screen
          router.push('/(tabs)/reminders');
        } else if (data?.type === 'reminder') {
          console.log('🧭 Navigate to reminders');
          // Navigate to reminders screen
          router.push('/(tabs)/reminders');
        }
      } catch (error) {
        console.error('❌ Error handling notification response:', error);
      }
    });

    console.log('✅ Notification listeners initialized successfully');

    return () => {
      try {
        foregroundSubscription.remove();
        responseSubscription.remove();
        console.log('🧹 Notification listeners cleaned up');
      } catch (error) {
        console.error('❌ Error removing notification listeners:', error);
      }
    };
  } catch (error) {
    console.error('❌ Error initializing notification listeners:', error);
    return () => {}; // Return empty cleanup function
  }
}

// Notification testing utilities (for development)
export async function testNotification(): Promise<void> {
  try {
    console.log('🧪 Testing notification...');
    
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

    console.log('✅ Test notification scheduled successfully');
  } catch (error) {
    console.error('❌ Test notification failed:', error);
    throw error;
  }
}

// Test function - add this at the end of the file
export async function testLocalNotificationWhenClosed(): Promise<void> {
  try {
    console.log('🧪 Testing local notification when app is closed...');
    
    const { permission } = await registerForPushNotificationsAsync();
    
    if (!permission.granted) {
      throw new Error('Notification permission not granted');
    }

    // Schedule a test notification for 10 seconds from now
    await scheduleLocalNotification({
      title: '🧪 Test: App Closed Notification',
      body: 'This proves local notifications work when app is closed! Close the app now.',
      triggerDate: new Date(Date.now() + 10000), // 10 seconds
      data: {
        id: 'test-closed-app',
        type: 'custom',
        priority: 'high',
        metadata: {
          test: true,
          instruction: 'Close the app and wait for this notification'
        }
      },
    });

    console.log('✅ Test notification scheduled! Close the app now and wait 10 seconds.');
  } catch (error) {
    console.error('❌ Test notification failed:', error);
    throw error;
  }
}