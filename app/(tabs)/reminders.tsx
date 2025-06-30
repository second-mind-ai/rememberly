import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  BackHandler,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { getCurrentUser } from '@/lib/auth';
import { useReminderStore } from '@/lib/reminderStore';
import { useNotesStore } from '@/lib/store';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/Toast';
import { registerForPushNotificationsAsync, formatReminderTime, testLocalNotificationWhenClosed } from '@/lib/notifications';
import { testSupabaseConnection } from '@/lib/supabase';
import { Bell, Calendar, Check, Clock, Plus, X, CircleAlert as AlertCircle, Volume2, VolumeX, Trash2, FileText, Link2, Image as ImageIcon, File, BellOff } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ReminderCard } from '@/components/ReminderCard';
import { theme } from '@/lib/theme';

type Priority = 'low' | 'medium' | 'high';

interface ReminderFormData {
  title: string;
  description: string;
  dateTime: Date;
  priority: Priority;
}

export default function RemindersScreen() {
  const router = useRouter();
  const { 
    reminders, 
    loading, 
    fetchReminders, 
    createReminder, 
    completeReminder, 
    deleteReminder,
    snoozeReminder,
    markAsRead,
    clearNotification,
    error 
  } = useReminderStore();
  
  const { notes } = useNotesStore();
  const { toast, showSuccess, showError, showInfo, hideToast } = useToast();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const isMounted = useRef(true);
  
  const [formData, setFormData] = useState<ReminderFormData>({
    title: '',
    description: '',
    dateTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    priority: 'medium',
  });

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setAuthLoading(true);
        const { user, error } = await getCurrentUser();
        
        if (cancelled) return;
        
        if (error || !user) {
          console.log('User not authenticated, redirecting to login');
          router.replace('/auth/login');
          return;
        }

        setIsAuthenticated(true);
        await initializeReminders();
      } catch (error) {
        console.error('Authentication check failed:', error);
        if (!cancelled) {
          router.replace('/auth/login');
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  // Handle hardware/system back button
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (showAddModal) {
          if (isMounted.current) {
            setShowAddModal(false);
          }
          return true; // Prevent default behavior
        }
        
        return false; // Allow default behavior (exit app or go to previous screen)
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [showAddModal])
  );

  async function initializeReminders() {
    try {
      const { permission } = await registerForPushNotificationsAsync();
      if (isMounted.current) {
        setHasPermission(permission.granted);
      }
    } catch (error) {
      console.error('Failed to register for notifications:', error);
      if (isMounted.current) {
        setHasPermission(false);
      }
    }
    await fetchReminders();
  }

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchReminders();
    } finally {
      setRefreshing(false);
    }
  }, [fetchReminders]);

  function resetForm() {
    if (isMounted.current) {
      setFormData({
        title: '',
        description: '',
        dateTime: new Date(Date.now() + 60 * 60 * 1000),
        priority: 'medium',
      });
    }
  }

  async function handleCreateReminder() {
    if (!formData.title.trim()) {
      showError('Please enter a reminder title');
      return;
    }

    if (formData.dateTime <= new Date()) {
      showError('Please select a future date and time');
      return;
    }

    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Please enable notifications to receive reminders',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Enable', 
            onPress: async () => {
              try {
                const { permission } = await registerForPushNotificationsAsync();
                if (isMounted.current) {
                  setHasPermission(permission.granted);
                }
                if (!permission.granted) {
                  showError('Notifications are required for reminders to work');
                  return;
                }
              } catch (error) {
                showError('Failed to enable notifications');
                return;
              }
            }
          }
        ]
      );
      return;
    }

    try {
      await createReminder({
        title: formData.title.trim(),
        description: formData.description.trim(),
        remind_at: formData.dateTime.toISOString(),
        priority: formData.priority,
      });

      const formattedDate = formData.dateTime.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      const formattedTime = formData.dateTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      
      showSuccess(`Reminder set for ${formattedDate} at ${formattedTime}`);

      resetForm();
      
      // Auto-close modal after a brief delay
      setTimeout(() => {
        if (isMounted.current) {
          setShowAddModal(false);
        }
      }, 500);
    } catch (error) {
      console.error('Failed to create reminder:', error);
      showError('Failed to create reminder. Please try again.');
    }
  }

  async function handleMarkAsRead(id: string, title: string) {
    try {
      await markAsRead(id);
      showSuccess(`"${title}" marked as read`);
    } catch (error) {
      console.error('Failed to mark as read:', error);
      showError('Failed to mark reminder as read');
    }
  }

  async function handleClearNotification(id: string, title: string) {
    Alert.alert(
      'Clear Notification',
      `Remove "${title}" from your reminders?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          onPress: async () => {
            try {
              await clearNotification(id);
              showSuccess('Notification cleared');
            } catch (error) {
              console.error('Failed to clear notification:', error);
              showError('Failed to clear notification');
            }
          },
          style: 'destructive'
        }
      ]
    );
  }

  async function handleCompleteReminder(id: string, title: string) {
    try {
      await completeReminder(id);
      showSuccess('Reminder completed');
    } catch (error) {
      console.error('Failed to complete reminder:', error);
      showError('Failed to complete reminder');
    }
  }

  async function handleDeleteReminder(id: string, title: string) {
    Alert.alert(
      'Delete Reminder',
      `Delete "${title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          onPress: async () => {
            try {
              await deleteReminder(id);
              showSuccess('Reminder deleted');
            } catch (error) {
              console.error('Failed to delete reminder:', error);
              showError('Failed to delete reminder');
            }
          },
          style: 'destructive'
        }
      ]
    );
  }

  async function handleSnoozeReminder(id: string, title: string) {
    Alert.alert(
      'Snooze Reminder',
      `Snooze "${title}" for how long?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: '15 minutes', 
          onPress: async () => {
            try {
              await snoozeReminder(id, 15);
              showSuccess('Reminder snoozed for 15 minutes');
            } catch (error) {
              console.error('Failed to snooze reminder:', error);
              showError('Failed to snooze reminder');
            }
          }
        },
        { 
          text: '1 hour', 
          onPress: async () => {
            try {
              await snoozeReminder(id, 60);
              showSuccess('Reminder snoozed for 1 hour');
            } catch (error) {
              console.error('Failed to snooze reminder:', error);
              showError('Failed to snooze reminder');
            }
          }
        },
        { 
          text: '1 day', 
          onPress: async () => {
            try {
              await snoozeReminder(id, 24 * 60);
              showSuccess('Reminder snoozed for 1 day');
            } catch (error) {
              console.error('Failed to snooze reminder:', error);
              showError('Failed to snooze reminder');
            }
          }
        },
      ]
    );
  }

  function handleNavigateToNote(noteId: string) {
    router.push(`/note/${noteId}`);
  }

  function onDateChange(event: any, selectedDate?: Date) {
    if (isMounted.current) {
      setShowDatePicker(false);
    }
    if (selectedDate && isMounted.current) {
      const newDateTime = new Date(formData.dateTime);
      newDateTime.setFullYear(selectedDate.getFullYear());
      newDateTime.setMonth(selectedDate.getMonth());
      newDateTime.setDate(selectedDate.getDate());
      setFormData(prev => ({ ...prev, dateTime: newDateTime }));
    }
  }

  function onTimeChange(event: any, selectedTime?: Date) {
    if (isMounted.current) {
      setShowTimePicker(false);
    }
    if (selectedTime && isMounted.current) {
      const newDateTime = new Date(formData.dateTime);
      newDateTime.setHours(selectedTime.getHours());
      newDateTime.setMinutes(selectedTime.getMinutes());
      setFormData(prev => ({ ...prev, dateTime: newDateTime }));
    }
  }

  // Memoize sorted reminders
  const { overdueReminders, upcomingReminders } = useMemo(() => {
    const sortedReminders = [...reminders].sort((a, b) => 
      new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime()
    );

    const now = new Date();
    const overdue = sortedReminders.filter(reminder => 
      new Date(reminder.remind_at) < now
    );
    const upcoming = sortedReminders.filter(reminder => 
      new Date(reminder.remind_at) >= now
    );

    return { overdueReminders: overdue, upcomingReminders: upcoming };
  }, [reminders]);

  const priorityColors = useMemo(() => ({
    low: { bg: '#F0FDF4', border: '#BBF7D0', text: '#059669' },
    medium: { bg: '#FEF3C7', border: '#FDE68A', text: '#D97706' },
    high: { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' },
  }), []);

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Toast Component */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Reminders</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.7}
          >
            <Plus size={20} color="#ffffff" strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>Never forget important tasks</Text>
        
        {!hasPermission && (
          <TouchableOpacity 
            style={styles.permissionBanner}
            onPress={async () => {
              try {
                const { permission } = await registerForPushNotificationsAsync();
                if (isMounted.current) {
                  setHasPermission(permission.granted);
                }
                if (permission.granted) {
                  showSuccess('Notifications enabled successfully');
                } else {
                  showError('Failed to enable notifications');
                }
              } catch (error) {
                showError('Failed to enable notifications');
              }
            }}
          >
            <AlertCircle size={16} color="#DC2626" strokeWidth={2} />
            <Text style={styles.permissionText}>
              Enable notifications to receive reminders
            </Text>
          </TouchableOpacity>
        )}

        {/* Test Buttons */}
        {hasPermission && (
          <View style={styles.testContainer}>
            <TouchableOpacity 
              style={styles.testButton}
              onPress={async () => {
                try {
                  await testLocalNotificationWhenClosed();
                  showInfo('Test notification scheduled for 10 seconds. Close the app now!');
                } catch (error) {
                  showError('Could not schedule test notification');
                }
              }}
            >
              <Text style={styles.testButtonText}>🧪 Test Notifications</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.testButton, { backgroundColor: '#059669' }]}
              onPress={async () => {
                try {
                  const result = await testSupabaseConnection();
                  if (result.success) {
                    showSuccess('Supabase connection successful!');
                  } else {
                    showError(`Supabase error: ${result.error}`);
                  }
                } catch (error) {
                  showError('Could not test Supabase connection');
                }
              }}
            >
              <Text style={styles.testButtonText}>🔗 Test Supabase</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {overdueReminders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={20} color="#DC2626" strokeWidth={2} />
              <Text style={[styles.sectionTitle, { color: '#DC2626' }]}>
                Overdue ({overdueReminders.length})
              </Text>
            </View>
            <View style={styles.remindersContainer}>
              {overdueReminders.map((reminder) => (
                <ReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  isOverdue={true}
                  onComplete={handleCompleteReminder}
                  onDelete={handleDeleteReminder}
                  onSnooze={handleSnoozeReminder}
                  onMarkAsRead={handleMarkAsRead}
                  onClearNotification={handleClearNotification}
                  onNavigateToNote={handleNavigateToNote}
                  priorityColors={priorityColors}
                  notes={notes}
                />
              ))}
            </View>
          </View>
        )}

        {upcomingReminders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Bell size={20} color="#2563EB" strokeWidth={2} />
              <Text style={styles.sectionTitle}>
                Upcoming ({upcomingReminders.length})
              </Text>
            </View>
            <View style={styles.remindersContainer}>
              {upcomingReminders.map((reminder) => (
                <ReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  isOverdue={false}
                  onComplete={handleCompleteReminder}
                  onDelete={handleDeleteReminder}
                  onSnooze={handleSnoozeReminder}
                  onMarkAsRead={handleMarkAsRead}
                  onClearNotification={handleClearNotification}
                  onNavigateToNote={handleNavigateToNote}
                  priorityColors={priorityColors}
                  notes={notes}
                />
              ))}
            </View>
          </View>
        )}

        {reminders.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Bell size={48} color="#9CA3AF" strokeWidth={2} />
            <Text style={styles.emptyTitle}>No reminders set</Text>
            <Text style={styles.emptySubtitle}>
              Create your first reminder to stay organized
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowAddModal(true)}
            >
              <Plus size={20} color="#ffffff" strokeWidth={2} />
              <Text style={styles.createButtonText}>Create Reminder</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowAddModal(false)}
              style={styles.modalCloseButton}
            >
              <X size={24} color="#6B7280" strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Reminder</Text>
            <TouchableOpacity 
              onPress={handleCreateReminder}
              style={styles.modalSaveButton}
            >
              <Check size={24} color="#059669" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                placeholder="What do you want to be reminded about?"
                placeholderTextColor="#9CA3AF"
                maxLength={100}
                autoFocus={true}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="Add additional details..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                maxLength={500}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date & Time</Text>
              <View style={styles.dateTimeContainer}>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Calendar size={20} color="#6B7280" strokeWidth={2} />
                  <Text style={styles.dateTimeText}>
                    {formData.dateTime.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Clock size={20} color="#6B7280" strokeWidth={2} />
                  <Text style={styles.dateTimeText}>
                    {formData.dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.priorityContainer}>
                {(['low', 'medium', 'high'] as Priority[]).map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityButton,
                      formData.priority === priority && styles.priorityButtonActive,
                      { borderColor: priorityColors[priority].border }
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, priority }))}
                  >
                    <Text style={[
                      styles.priorityText,
                      formData.priority === priority && styles.priorityTextActive
                    ]}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Text>
                    {priority === 'high' && <Volume2 size={16} color={priorityColors[priority].text} strokeWidth={2} />}
                    {priority === 'low' && <VolumeX size={16} color={priorityColors[priority].text} strokeWidth={2} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.previewSection}>
              <Text style={styles.inputLabel}>Preview</Text>
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>{formData.title || 'Reminder Title'}</Text>
                <Text style={styles.previewTime}>
                  {formData.dateTime.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
                {formData.description && (
                  <Text style={styles.previewDescription}>{formData.description}</Text>
                )}
                <View style={[styles.previewPriority, { backgroundColor: priorityColors[formData.priority].bg }]}>
                  <Text style={[styles.previewPriorityText, { color: priorityColors[formData.priority].text }]}>
                    {formData.priority.toUpperCase()} PRIORITY
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>

        {showDatePicker && (
          <DateTimePicker
            value={formData.dateTime}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={formData.dateTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.regular,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  permissionText: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.medium,
    color: '#DC2626',
    flex: 1,
  },
  testContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  testButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
  },
  seeAllText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.primary[600],
  },
  remindersContainer: {
    gap: theme.spacing.md,
  },
  reminderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderLeftWidth: 4,
  },
  overdueCard: {
    backgroundColor: '#FEF2F2',
    borderLeftColor: '#DC2626',
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reminderTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.medium,
    color: '#6B7280',
  },
  overdueText: {
    color: '#DC2626',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontFamily: theme.typography.fontFamily.bold,
    letterSpacing: 0.5,
  },
  reminderTitle: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: '#111827',
    lineHeight: 22,
    marginBottom: 8,
  },
  reminderDescription: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.regular,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  associatedNote: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  noteLabel: {
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noteTitle: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: '#1E293B',
    marginBottom: 4,
  },
  noteSummary: {
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.regular,
    color: '#64748B',
  },
  reminderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  exactTime: {
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.regular,
    color: '#9CA3AF',
  },
  reminderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
  },
  clearButton: {
    backgroundColor: '#FEF2F2',
  },
  completeButton: {
    backgroundColor: '#F0FDF4',
  },
  snoozeButton: {
    backgroundColor: '#FEF3C7',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing['3xl'],
    gap: theme.spacing.md,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.neutral[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
  },
  emptySubtitle: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    ...theme.shadows.md,
  },
  createButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.inverse,
  },
  errorContainer: {
    backgroundColor: theme.colors.error.light,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.error.dark,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  modalCloseButton: {
    padding: theme.spacing.sm,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
  },
  modalSaveButton: {
    padding: theme.spacing.sm,
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg,
  },
  inputLabel: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  textInput: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.primary,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  dateTimeText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.primary,
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background.primary,
    borderWidth: 2,
    borderColor: theme.colors.neutral[200],
    alignItems: 'center',
  },
  priorityButtonActive: {
    borderColor: theme.colors.primary[600],
    backgroundColor: theme.colors.primary[50],
  },
  priorityText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
  },
  priorityTextActive: {
    color: theme.colors.primary[600],
  },
  previewSection: {
    marginTop: theme.spacing.sm,
  },
  notificationPreview: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    ...theme.shadows.sm,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  notificationAppName: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.primary[600],
  },
  notificationTitle: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  notificationBody: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  notificationTime: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.tertiary,
  },
  previewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewTitle: {
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: '#111827',
    marginBottom: 8,
  },
  previewTime: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.medium,
    color: '#6B7280',
    marginBottom: 8,
  },
  previewDescription: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.regular,
    color: '#6B7280',
    marginBottom: 12,
  },
  previewPriority: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  previewPriorityText: {
    fontSize: 10,
    fontFamily: theme.typography.fontFamily.bold,
    letterSpacing: 0.5,
  },
});