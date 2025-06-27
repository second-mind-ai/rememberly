import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  Modal,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Bell, Plus, Settings, Trash2, Calendar, Clock, Volume2, VolumeX, Repeat, X, Check, CircleAlert as AlertCircle } from 'lucide-react-native';
import {
  registerForPushNotificationsAsync,
  scheduleLocalNotification,
  cancelNotification,
  cancelAllNotifications,
  getScheduledNotifications,
  updateNotificationBadge,
  clearNotificationBadge,
  testNotification,
  NotificationData,
  ScheduleNotificationOptions,
  NotificationPermissionStatus,
} from '@/lib/notifications';
import * as Notifications from 'expo-notifications';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  triggerDate: Date;
  priority: 'low' | 'medium' | 'high';
  sound: 'default' | 'custom' | 'none';
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
  };
  badge?: number;
}

export default function NotificationManager() {
  const [notifications, setNotifications] = useState<Notifications.NotificationRequest[]>([]);
  const [permission, setPermission] = useState<NotificationPermissionStatus>({
    granted: false,
    canAskAgain: true,
    status: 'undetermined'
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<NotificationItem>({
    id: '',
    title: '',
    body: '',
    triggerDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    priority: 'medium',
    sound: 'default',
    badge: 1,
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);

  useEffect(() => {
    initializeNotifications();
  }, []);

  async function initializeNotifications() {
    try {
      setLoading(true);
      setError(null);
      
      const { permission: permissionStatus } = await registerForPushNotificationsAsync();
      setPermission(permissionStatus);
      
      if (permissionStatus.granted) {
        await loadScheduledNotifications();
      }
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      setError('Failed to initialize notification system');
    } finally {
      setLoading(false);
    }
  }

  async function loadScheduledNotifications() {
    try {
      const scheduled = await getScheduledNotifications();
      setNotifications(scheduled);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setError('Failed to load scheduled notifications');
    }
  }

  async function requestPermissions() {
    try {
      setLoading(true);
      setError(null);
      
      const { permission: newPermission } = await registerForPushNotificationsAsync();
      setPermission(newPermission);
      
      if (newPermission.granted) {
        await loadScheduledNotifications();
      } else if (!newPermission.canAskAgain) {
        Alert.alert(
          'Permission Denied',
          'Notifications are disabled. Please enable them in your device settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to request permissions:', error);
      setError('Failed to request notification permissions');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateNotification() {
    if (!formData.title.trim() || !formData.body.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (formData.triggerDate <= new Date()) {
      Alert.alert('Error', 'Please select a future date and time');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const notificationData: NotificationData = {
        id: `notification-${Date.now()}`,
        type: isRecurring ? 'recurring' : 'custom',
        priority: formData.priority,
        sound: formData.sound,
        ...(isRecurring && formData.recurring && {
          recurring: formData.recurring,
        }),
      };

      const options: ScheduleNotificationOptions = {
        title: formData.title.trim(),
        body: formData.body.trim(),
        triggerDate: formData.triggerDate,
        data: notificationData,
        sound: formData.sound,
        badge: formData.badge,
        ...(isRecurring && formData.recurring && {
          recurring: formData.recurring,
        }),
      };

      await scheduleLocalNotification(options);
      await loadScheduledNotifications();
      
      // Reset form
      setFormData({
        id: '',
        title: '',
        body: '',
        triggerDate: new Date(Date.now() + 60 * 60 * 1000),
        priority: 'medium',
        sound: 'default',
        badge: 1,
      });
      setIsRecurring(false);
      setShowCreateModal(false);

      Alert.alert('Success', 'Notification scheduled successfully!');
    } catch (error) {
      console.error('Failed to create notification:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to schedule notification';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelNotification(notificationId: string) {
    try {
      setError(null);
      await cancelNotification(notificationId);
      await loadScheduledNotifications();
      Alert.alert('Success', 'Notification cancelled');
    } catch (error) {
      console.error('Failed to cancel notification:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel notification';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    }
  }

  async function handleCancelAllNotifications() {
    Alert.alert(
      'Cancel All Notifications',
      'Are you sure you want to cancel all scheduled notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Cancel All',
          style: 'destructive',
          onPress: async () => {
            try {
              setError(null);
              await cancelAllNotifications();
              await loadScheduledNotifications();
              Alert.alert('Success', 'All notifications cancelled');
            } catch (error) {
              console.error('Failed to cancel all notifications:', error);
              const errorMessage = error instanceof Error ? error.message : 'Failed to cancel notifications';
              setError(errorMessage);
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  }

  async function handleTestNotification() {
    try {
      setError(null);
      await testNotification();
      Alert.alert('Success', 'Test notification scheduled for 5 seconds from now');
    } catch (error) {
      console.error('Failed to test notification:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to schedule test notification';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    }
  }

  async function handleUpdateBadge() {
    try {
      setError(null);
      await updateNotificationBadge(badgeCount);
      Alert.alert('Success', `Badge count updated to ${badgeCount}`);
    } catch (error) {
      console.error('Failed to update badge:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update badge count';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    }
  }

  async function handleClearBadge() {
    try {
      setError(null);
      await clearNotificationBadge();
      setBadgeCount(0);
      Alert.alert('Success', 'Badge cleared');
    } catch (error) {
      console.error('Failed to clear badge:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear badge';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    }
  }

  function onDateChange(event: any, selectedDate?: Date) {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDateTime = new Date(formData.triggerDate);
      newDateTime.setFullYear(selectedDate.getFullYear());
      newDateTime.setMonth(selectedDate.getMonth());
      newDateTime.setDate(selectedDate.getDate());
      setFormData(prev => ({ ...prev, triggerDate: newDateTime }));
    }
  }

  function onTimeChange(event: any, selectedTime?: Date) {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDateTime = new Date(formData.triggerDate);
      newDateTime.setHours(selectedTime.getHours());
      newDateTime.setMinutes(selectedTime.getMinutes());
      setFormData(prev => ({ ...prev, triggerDate: newDateTime }));
    }
  }

  const priorityColors = {
    low: { bg: '#F0FDF4', border: '#BBF7D0', text: '#059669' },
    medium: { bg: '#FEF3C7', border: '#FDE68A', text: '#D97706' },
    high: { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' },
  };

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <AlertCircle size={64} color="#DC2626" strokeWidth={2} />
          <Text style={styles.permissionTitle}>Notification Permission Required</Text>
          <Text style={styles.permissionText}>
            To use notifications, please grant permission to send notifications.
          </Text>
          
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          <TouchableOpacity
            style={[styles.permissionButton, loading && styles.buttonDisabled]}
            onPress={requestPermissions}
            disabled={loading || !permission.canAskAgain}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Bell size={20} color="#ffffff" strokeWidth={2} />
            )}
            <Text style={styles.permissionButtonText}>
              {loading ? 'Requesting...' : (permission.canAskAgain ? 'Grant Permission' : 'Open Settings')}
            </Text>
          </TouchableOpacity>
          
          {!permission.canAskAgain && (
            <Text style={styles.settingsHint}>
              Please enable notifications in your device settings
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notification Manager</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleTestNotification}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#6B7280" />
            ) : (
              <Settings size={20} color="#6B7280" strokeWidth={2} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, loading && styles.buttonDisabled]}
            onPress={() => setShowCreateModal(true)}
            disabled={loading}
          >
            <Plus size={20} color="#ffffff" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <AlertCircle size={16} color="#DC2626" strokeWidth={2} />
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <X size={16} color="#DC2626" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      )}

      {/* Badge Management */}
      <View style={styles.badgeSection}>
        <Text style={styles.sectionTitle}>Badge Management</Text>
        <View style={styles.badgeControls}>
          <View style={styles.badgeInput}>
            <Text style={styles.badgeLabel}>Badge Count:</Text>
            <TextInput
              style={styles.badgeTextInput}
              value={badgeCount.toString()}
              onChangeText={(text) => {
                const num = parseInt(text) || 0;
                setBadgeCount(Math.max(0, num));
              }}
              keyboardType="numeric"
              placeholder="0"
              maxLength={3}
            />
          </View>
          <TouchableOpacity 
            style={[styles.badgeButton, loading && styles.buttonDisabled]} 
            onPress={handleUpdateBadge}
            disabled={loading}
          >
            <Text style={styles.badgeButtonText}>Update</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.badgeButton, loading && styles.buttonDisabled]} 
            onPress={handleClearBadge}
            disabled={loading}
          >
            <Text style={styles.badgeButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scheduled Notifications */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Scheduled Notifications ({notifications.length})
          </Text>
          {notifications.length > 0 && (
            <TouchableOpacity
              style={styles.clearAllButton}
              onPress={handleCancelAllNotifications}
              disabled={loading}
            >
              <Trash2 size={16} color="#DC2626" strokeWidth={2} />
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
          {loading && notifications.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Loading notifications...</Text>
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Bell size={48} color="#9CA3AF" strokeWidth={2} />
              <Text style={styles.emptyTitle}>No Scheduled Notifications</Text>
              <Text style={styles.emptySubtitle}>
                Create your first notification to get started
              </Text>
            </View>
          ) : (
            notifications.map((notification) => (
              <NotificationCard
                key={notification.identifier}
                notification={notification}
                onCancel={handleCancelNotification}
                priorityColors={priorityColors}
                disabled={loading}
              />
            ))
          )}
        </ScrollView>
      </View>

      {/* Create Notification Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowCreateModal(false)}
              style={styles.modalCloseButton}
              disabled={loading}
            >
              <X size={24} color="#6B7280" strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Notification</Text>
            <TouchableOpacity
              onPress={handleCreateNotification}
              style={[styles.modalSaveButton, loading && styles.buttonDisabled]}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#059669" />
              ) : (
                <Check size={24} color="#059669" strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                placeholder="Notification title"
                placeholderTextColor="#9CA3AF"
                maxLength={100}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Message *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.body}
                onChangeText={(text) => setFormData(prev => ({ ...prev, body: text }))}
                placeholder="Notification message"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                maxLength={500}
                textAlignVertical="top"
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date & Time</Text>
              <View style={styles.dateTimeContainer}>
                <TouchableOpacity
                  style={[styles.dateTimeButton, loading && styles.buttonDisabled]}
                  onPress={() => setShowDatePicker(true)}
                  disabled={loading}
                >
                  <Calendar size={20} color="#6B7280" strokeWidth={2} />
                  <Text style={styles.dateTimeText}>
                    {formData.triggerDate.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.dateTimeButton, loading && styles.buttonDisabled]}
                  onPress={() => setShowTimePicker(true)}
                  disabled={loading}
                >
                  <Clock size={20} color="#6B7280" strokeWidth={2} />
                  <Text style={styles.dateTimeText}>
                    {formData.triggerDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.priorityContainer}>
                {(['low', 'medium', 'high'] as const).map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityButton,
                      formData.priority === priority && styles.priorityButtonActive,
                      { borderColor: priorityColors[priority].border },
                      loading && styles.buttonDisabled
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, priority }))}
                    disabled={loading}
                  >
                    <Text style={[
                      styles.priorityText,
                      formData.priority === priority && { color: priorityColors[priority].text }
                    ]}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Sound</Text>
              <View style={styles.soundContainer}>
                {(['default', 'none'] as const).map((sound) => (
                  <TouchableOpacity
                    key={sound}
                    style={[
                      styles.soundButton,
                      formData.sound === sound && styles.soundButtonActive,
                      loading && styles.buttonDisabled
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, sound }))}
                    disabled={loading}
                  >
                    {sound === 'default' ? (
                      <Volume2 size={16} color={formData.sound === sound ? "#ffffff" : "#6B7280"} strokeWidth={2} />
                    ) : (
                      <VolumeX size={16} color={formData.sound === sound ? "#ffffff" : "#6B7280"} strokeWidth={2} />
                    )}
                    <Text style={[
                      styles.soundText,
                      formData.sound === sound && styles.soundTextActive
                    ]}>
                      {sound === 'default' ? 'Default' : 'Silent'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.recurringHeader}>
                <Text style={styles.inputLabel}>Recurring</Text>
                <Switch
                  value={isRecurring}
                  onValueChange={setIsRecurring}
                  trackColor={{ false: '#E5E7EB', true: '#2563EB' }}
                  thumbColor={isRecurring ? '#ffffff' : '#ffffff'}
                  disabled={loading}
                />
              </View>
              
              {isRecurring && (
                <View style={styles.recurringOptions}>
                  <Text style={styles.recurringLabel}>Frequency:</Text>
                  <View style={styles.frequencyContainer}>
                    {(['daily', 'weekly', 'monthly'] as const).map((frequency) => (
                      <TouchableOpacity
                        key={frequency}
                        style={[
                          styles.frequencyButton,
                          formData.recurring?.frequency === frequency && styles.frequencyButtonActive,
                          loading && styles.buttonDisabled
                        ]}
                        onPress={() => setFormData(prev => ({
                          ...prev,
                          recurring: { frequency, interval: 1 }
                        }))}
                        disabled={loading}
                      >
                        <Text style={[
                          styles.frequencyText,
                          formData.recurring?.frequency === frequency && styles.frequencyTextActive
                        ]}>
                          {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Badge Count</Text>
              <TextInput
                style={styles.textInput}
                value={formData.badge?.toString() || ''}
                onChangeText={(text) => {
                  const num = parseInt(text) || undefined;
                  setFormData(prev => ({ 
                    ...prev, 
                    badge: num !== undefined ? Math.max(0, num) : undefined 
                  }));
                }}
                placeholder="1"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                maxLength={3}
                editable={!loading}
              />
            </View>
          </ScrollView>
        </SafeAreaView>

        {showDatePicker && (
          <DateTimePicker
            value={formData.triggerDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={formData.triggerDate}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

interface NotificationCardProps {
  notification: Notifications.NotificationRequest;
  onCancel: (id: string) => void;
  priorityColors: any;
  disabled?: boolean;
}

function NotificationCard({ notification, onCancel, priorityColors, disabled = false }: NotificationCardProps) {
  const data = notification.content.data as NotificationData;
  const priority = data?.priority || 'medium';
  
  // Safely handle trigger date
  let triggerDate: Date;
  try {
    if (notification.trigger && 'date' in notification.trigger) {
      triggerDate = new Date(notification.trigger.date as number);
    } else {
      triggerDate = new Date();
    }
  } catch (error) {
    console.error('Error parsing trigger date:', error);
    triggerDate = new Date();
  }

  return (
    <View style={[styles.notificationCard, { borderLeftColor: priorityColors[priority].text }]}>
      <View style={styles.notificationHeader}>
        <View style={styles.notificationInfo}>
          <Text style={styles.notificationTitle} numberOfLines={1}>
            {notification.content.title || 'Untitled'}
          </Text>
          <Text style={styles.notificationBody} numberOfLines={2}>
            {notification.content.body || 'No message'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.cancelButton, disabled && styles.buttonDisabled]}
          onPress={() => onCancel(notification.identifier)}
          disabled={disabled}
        >
          <Trash2 size={16} color="#DC2626" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.notificationFooter}>
        <View style={styles.notificationMeta}>
          <View style={styles.metaItem}>
            <Calendar size={12} color="#6B7280" strokeWidth={2} />
            <Text style={styles.metaText}>
              {triggerDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </View>
          
          {data?.recurring && (
            <View style={styles.metaItem}>
              <Repeat size={12} color="#6B7280" strokeWidth={2} />
              <Text style={styles.metaText}>
                {data.recurring.frequency}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.priorityBadge, { backgroundColor: priorityColors[priority].bg }]}>
          <Text style={[styles.priorityBadgeText, { color: priorityColors[priority].text }]}>
            {priority.toUpperCase()}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 16,
  },
  permissionTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 24,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  permissionButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  settingsHint: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginVertical: 8,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#DC2626',
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#DC2626',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  addButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  badgeSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  badgeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  badgeLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  badgeTextInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 60,
    textAlign: 'center',
  },
  badgeButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  badgeButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  section: {
    flex: 1,
    backgroundColor: '#ffffff',
    margin: 20,
    borderRadius: 16,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#DC2626',
  },
  notificationsList: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  notificationCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  notificationInfo: {
    flex: 1,
    marginRight: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
  cancelButton: {
    padding: 4,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  modalSaveButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateTimeText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  priorityButtonActive: {
    borderWidth: 2,
  },
  priorityText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  soundContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  soundButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    gap: 8,
  },
  soundButtonActive: {
    backgroundColor: '#2563EB',
  },
  soundText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  soundTextActive: {
    color: '#ffffff',
  },
  recurringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recurringOptions: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  recurringLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  frequencyContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  frequencyButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  frequencyText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  frequencyTextActive: {
    color: '#ffffff',
  },
});