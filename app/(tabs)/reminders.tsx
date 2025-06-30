import React, { useEffect, useState, useRef } from 'react';
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
import { Bell, Calendar, Check, Clock, Plus, X, CircleAlert as AlertCircle, Volume2, VolumeX, Trash2, FileText, Link2, Image as ImageIcon, File, CircleCheck as CheckCircle, BellOff } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

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
  const { toast, showSuccess, showError, hideToast } = useToast();
  
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
    checkAuthAndInitialize();
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

  async function checkAuthAndInitialize() {
    try {
      setAuthLoading(true);
      const { user, error } = await getCurrentUser();
      
      if (error || !user) {
        console.log('User not authenticated, redirecting to login');
        router.replace('/auth/login');
        return;
      }

      if (isMounted.current) {
        setIsAuthenticated(true);
        await initializeReminders();
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      router.replace('/auth/login');
    } finally {
      if (isMounted.current) {
        setAuthLoading(false);
      }
    }
  }

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

  async function handleRefresh() {
    if (isMounted.current) {
      setRefreshing(true);
    }
    await fetchReminders();
    if (isMounted.current) {
      setRefreshing(false);
    }
  }

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
    Alert.alert(
      'Complete Reminder',
      `Mark "${title}" as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Complete', 
          onPress: async () => {
            try {
              await completeReminder(id);
              showSuccess('Reminder completed');
            } catch (error) {
              console.error('Failed to complete reminder:', error);
              showError('Failed to complete reminder');
            }
          },
          style: 'default'
        }
      ]
    );
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

  // Sort reminders by remind_at date
  const sortedReminders = [...reminders].sort((a, b) => 
    new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime()
  );

  // Separate overdue and upcoming reminders
  const now = new Date();
  const overdueReminders = sortedReminders.filter(reminder => 
    new Date(reminder.remind_at) < now
  );
  const upcomingReminders = sortedReminders.filter(reminder => 
    new Date(reminder.remind_at) >= now
  );

  const priorityColors = {
    low: { bg: '#F0FDF4', border: '#BBF7D0', text: '#059669' },
    medium: { bg: '#FEF3C7', border: '#FDE68A', text: '#D97706' },
    high: { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' },
  };

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
          <Text style={styles.title}>Reminders</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.7}
          >
            <Plus size={20} color="#ffffff" strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>Never forget important tasks</Text>
        
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
                    <View style={[styles.priorityIndicator, { backgroundColor: priorityColors[priority].text }]} />
                    <Text style={[
                      styles.priorityText,
                      formData.priority === priority && { color: priorityColors[priority].text }
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

interface ReminderCardProps {
  reminder: any;
  isOverdue: boolean;
  onComplete: (id: string, title: string) => void;
  onDelete: (id: string, title: string) => void;
  onSnooze: (id: string, title: string) => void;
  onMarkAsRead: (id: string, title: string) => void;
  onClearNotification: (id: string, title: string) => void;
  onNavigateToNote: (noteId: string) => void;
  priorityColors: any;
  notes: any[];
}

function ReminderCard({ 
  reminder, 
  isOverdue, 
  onComplete, 
  onDelete, 
  onSnooze, 
  onMarkAsRead,
  onClearNotification,
  onNavigateToNote,
  priorityColors,
  notes 
}: ReminderCardProps) {
  const remindDate = new Date(reminder.remind_at);
  const priority = reminder.priority || 'medium';
  
  // Find associated note if exists
  const associatedNote = reminder.note_id ? notes.find(note => note.id === reminder.note_id) : null;
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'url':
        return <Link2 size={14} color="#059669" strokeWidth={2} />;
      case 'file':
        return <File size={14} color="#D97706" strokeWidth={2} />;
      case 'image':
        return <ImageIcon size={14} color="#DC2626" strokeWidth={2} />;
      default:
        return <FileText size={14} color="#2563EB" strokeWidth={2} />;
    }
  };
  
  return (
    <View style={[
      styles.reminderCard, 
      isOverdue && styles.overdueCard,
      { borderLeftColor: priorityColors[priority].text }
    ]}>
      <View style={styles.reminderHeader}>
        <View style={styles.reminderTime}>
          <Calendar size={16} color={isOverdue ? '#DC2626' : '#6B7280'} strokeWidth={2} />
          <Text style={[styles.timeText, isOverdue && styles.overdueText]}>
            {isOverdue ? 'Overdue' : formatReminderTime(remindDate)}
          </Text>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: priorityColors[priority].bg }]}>
          <Text style={[styles.priorityBadgeText, { color: priorityColors[priority].text }]}>
            {priority.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.reminderTitle} numberOfLines={2}>
        {reminder.title}
      </Text>

      {reminder.description && (
        <Text style={styles.reminderDescription} numberOfLines={2}>
          {reminder.description}
        </Text>
      )}

      {/* Associated Note Section */}
      {associatedNote && (
        <TouchableOpacity 
          style={styles.associatedNote}
          onPress={() => onNavigateToNote(associatedNote.id)}
          activeOpacity={0.7}
        >
          <View style={styles.noteHeader}>
            {getTypeIcon(associatedNote.type)}
            <Text style={styles.noteLabel}>Related Note</Text>
          </View>
          <Text style={styles.noteTitle} numberOfLines={1}>
            {associatedNote.title}
          </Text>
          <Text style={styles.noteSummary} numberOfLines={1}>
            {associatedNote.summary || associatedNote.original_content}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.reminderFooter}>
        <Text style={styles.exactTime}>
          {remindDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>
        
        <View style={styles.reminderActions}>
          {/* Mark as Read Button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.readButton]}
            onPress={() => onMarkAsRead(reminder.id, reminder.title)}
          >
            <CheckCircle size={16} color="#059669" strokeWidth={2} />
          </TouchableOpacity>

          {/* Clear Notification Button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.clearButton]}
            onPress={() => onClearNotification(reminder.id, reminder.title)}
          >
            <BellOff size={16} color="#6B7280" strokeWidth={2} />
          </TouchableOpacity>

          {isOverdue && (
            <TouchableOpacity
              style={[styles.actionButton, styles.snoozeButton]}
              onPress={() => onSnooze(reminder.id, reminder.title)}
            >
              <Clock size={16} color="#D97706" strokeWidth={2} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={() => onComplete(reminder.id, reminder.title)}
          >
            <Check size={16} color="#059669" strokeWidth={2} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => onDelete(reminder.id, reminder.title)}
          >
            <Trash2 size={16} color="#DC2626" strokeWidth={2} />
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
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
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontFamily: 'Inter-Medium',
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
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  remindersContainer: {
    gap: 12,
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
    fontFamily: 'Inter-SemiBold',
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
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.5,
  },
  reminderTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    lineHeight: 22,
    marginBottom: 8,
  },
  reminderDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-SemiBold',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noteTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 4,
  },
  noteSummary: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-Regular',
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
  readButton: {
    backgroundColor: '#F0FDF4',
  },
  clearButton: {
    backgroundColor: '#F8FAFC',
  },
  snoozeButton: {
    backgroundColor: '#FEF3C7',
  },
  completeButton: {
    backgroundColor: '#F0FDF4',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  createButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    margin: 20,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#DC2626',
    textAlign: 'center',
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
    marginBottom: 24,
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
    gap: 12,
  },
  priorityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  priorityButtonActive: {
    borderWidth: 2,
  },
  priorityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    flex: 1,
  },
  previewSection: {
    marginTop: 8,
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
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  previewTime: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 8,
  },
  previewDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.5,
  },
});