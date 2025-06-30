import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  Linking,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useNotesStore } from '@/lib/store';
import { useReminderStore } from '@/lib/reminderStore';
import { useToast } from '@/hooks/useToast';
import { Toast } from '@/components/Toast';
import {
  ArrowLeft,
  Calendar,
  Bell,
  Trash2,
  ExternalLink,
  File,
  Download,
  Clock,
  X,
  Check,
  BellRing,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Database } from '@/lib/supabase';
import { theme } from '@/lib/theme';

type Note = Database['public']['Tables']['notes']['Row'];

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { notes, deleteNote } = useNotesStore();
  const { createReminder, reminders } = useReminderStore();
  const { toast, showSuccess, showError, hideToast } = useToast();
  const [note, setNote] = useState<Note | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const [reminderData, setReminderData] = useState({
    title: '',
    description: '',
    dateTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  // Check if this note already has active reminders
  const noteReminders = reminders.filter(reminder => reminder.note_id === id);
  const hasActiveReminders = noteReminders.length > 0;

  useEffect(() => {
    const foundNote = notes.find((n) => n.id === id);
    if (foundNote) {
      setNote(foundNote as Note);
      setReminderData((prev) => ({
        ...prev,
        title: `Review: ${foundNote.title}`,
        description: foundNote.summary || 'Review this note',
      }));
    } else {
      router.back();
    }
  }, [id, notes]);

  async function handleSetReminder() {
    if (!reminderData.title.trim() || !note) {
      showError('Please enter a reminder title');
      return;
    }

    if (reminderData.dateTime <= new Date()) {
      showError('Please select a future date and time');
      return;
    }

    setLoading(true);
    try {
      await createReminder({
        title: reminderData.title.trim(),
        description: reminderData.description.trim(),
        remind_at: reminderData.dateTime.toISOString(),
        priority: reminderData.priority,
        note_id: note.id,
      });

      // Show success toast
      const formattedDate = reminderData.dateTime.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      const formattedTime = reminderData.dateTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      
      showSuccess(`Reminder set for ${formattedDate} at ${formattedTime}`);

      // Reset form
      setReminderData({
        title: `Review: ${note.title}`,
        description: note.summary || 'Review this note',
        dateTime: new Date(Date.now() + 60 * 60 * 1000),
        priority: 'medium',
      });

      // Auto-close modal after a brief delay to show the toast
      setTimeout(() => {
        setShowReminderModal(false);
      }, 500);

    } catch (error) {
      console.error('Failed to create reminder:', error);
      showError('Failed to create reminder. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteNote(id);
              showSuccess('Note deleted successfully');
              router.back();
            } catch (error) {
              console.error('Failed to delete note:', error);
              showError('Failed to delete note. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }

  async function handleOpenUrl() {
    if (note?.source_url) {
      try {
        const supported = await Linking.canOpenURL(note.source_url);
        if (supported) {
          await Linking.openURL(note.source_url);
        } else {
          showError('Cannot open this URL');
        }
      } catch (error) {
        console.error('Failed to open URL:', error);
        showError('Failed to open URL');
      }
    }
  }

  const renderFileAttachment = () => {
    if (!note?.file_url) return null;

    if (note.type === 'image') {
      return (
        <View style={styles.fileSection}>
          <Text style={styles.sectionTitle}>Attached Image</Text>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: note.file_url }}
              style={styles.attachedImage}
              onError={() => {
                console.log('Failed to load image:', note.file_url);
              }}
              resizeMode="contain"
            />
          </View>
        </View>
      );
    }

    if (note.type === 'file') {
      const fileName = note.file_url.split('/').pop() || 'Unknown file';
      return (
        <View style={styles.fileSection}>
          <Text style={styles.sectionTitle}>Attached File</Text>
          <TouchableOpacity
            style={styles.fileAttachment}
            onPress={() => {
              Alert.alert(
                'File Access',
                `File: ${fileName}\n\nNote: Local files are not currently supported for opening. This is stored as: ${note?.file_url}`
              );
            }}
          >
            <File size={32} color="#D97706" strokeWidth={1.5} />
            <View style={styles.fileAttachmentInfo}>
              <Text style={styles.fileAttachmentName} numberOfLines={2}>
                {fileName}
              </Text>
              <Text style={styles.fileAttachmentType}>
                {note.type.toUpperCase()} FILE • Tap for details
              </Text>
            </View>
            <Download size={20} color="#6B7280" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  function onDateChange(event: any, selectedDate?: Date) {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDateTime = new Date(reminderData.dateTime);
      newDateTime.setFullYear(selectedDate.getFullYear());
      newDateTime.setMonth(selectedDate.getMonth());
      newDateTime.setDate(selectedDate.getDate());
      setReminderData((prev) => ({ ...prev, dateTime: newDateTime }));
    }
  }

  function onTimeChange(event: any, selectedTime?: Date) {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDateTime = new Date(reminderData.dateTime);
      newDateTime.setHours(selectedTime.getHours());
      newDateTime.setMinutes(selectedTime.getMinutes());
      setReminderData((prev) => ({ ...prev, dateTime: newDateTime }));
    }
  }

  if (!note) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading note...</Text>
        </View>
      </SafeAreaView>
    );
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
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#111827" strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setShowReminderModal(true)}
            style={[
              styles.actionButton,
              hasActiveReminders && styles.actionButtonActive,
            ]}
          >
            {hasActiveReminders ? (
              <BellRing size={20} color="#ffffff" strokeWidth={2} />
            ) : (
              <Bell size={20} color="#6B7280" strokeWidth={2} />
            )}
          </TouchableOpacity>
          {note.source_url && (
            <TouchableOpacity
              onPress={handleOpenUrl}
              style={styles.actionButton}
            >
              <ExternalLink size={20} color="#6B7280" strokeWidth={2} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleDelete}
            style={[styles.actionButton, loading && styles.buttonDisabled]}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size={20} color="#DC2626" />
            ) : (
              <Trash2 size={20} color="#DC2626" strokeWidth={2} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.noteSection}>
          <Text style={styles.noteTitle}>{note.title}</Text>

          <View style={styles.noteMeta}>
            <View style={styles.typeIndicator}>
              <Text style={styles.typeText}>{note.type.toUpperCase()}</Text>
            </View>
            <Text style={styles.dateText}>
              {new Date(note.created_at).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>

          {/* Active Reminders Section */}
          {hasActiveReminders && (
            <View style={styles.activeRemindersSection}>
              <Text style={styles.sectionTitle}>Active Reminders</Text>
              {noteReminders.map((reminder) => (
                <View key={reminder.id} style={styles.reminderCard}>
                  <View style={styles.reminderHeader}>
                    <BellRing size={16} color="#2563EB" strokeWidth={2} />
                    <Text style={styles.reminderTitle}>{reminder.title}</Text>
                  </View>
                  <Text style={styles.reminderTime}>
                    {new Date(reminder.remind_at).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {note.summary && (
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>AI Summary</Text>
              <Text style={styles.summaryText}>{note.summary}</Text>
            </View>
          )}

          {/* Render file attachment if available */}
          {renderFileAttachment()}

          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Original Content</Text>
            <Text style={styles.contentText}>{note.original_content}</Text>
          </View>

          {note.tags && note.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsContainer}>
                {note.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Reminder Modal */}
      <Modal
        visible={showReminderModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReminderModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowReminderModal(false)}
              style={styles.modalCloseButton}
            >
              <X size={24} color="#6B7280" strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Set Reminder for Note</Text>
            <TouchableOpacity 
              onPress={handleSetReminder}
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

          <ScrollView style={styles.modalContent}>
            <View style={styles.notePreview}>
              <Text style={styles.notePreviewTitle}>{note.title}</Text>
              <Text style={styles.notePreviewSummary} numberOfLines={2}>
                {note.summary || note.original_content}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reminder Title</Text>
              <TextInput
                style={styles.textInput}
                value={reminderData.title}
                onChangeText={(text) =>
                  setReminderData((prev) => ({ ...prev, title: text }))
                }
                placeholder="What should we remind you about?"
                placeholderTextColor="#9CA3AF"
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={reminderData.description}
                onChangeText={(text) =>
                  setReminderData((prev) => ({ ...prev, description: text }))
                }
                placeholder="Additional details..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={2}
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
                    {reminderData.dateTime.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dateTimeButton, loading && styles.buttonDisabled]}
                  onPress={() => setShowTimePicker(true)}
                  disabled={loading}
                >
                  <Clock size={20} color="#6B7280" strokeWidth={2} />
                  <Text style={styles.dateTimeText}>
                    {reminderData.dateTime.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
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
                      reminderData.priority === priority &&
                        styles.priorityButtonActive,
                      loading && styles.buttonDisabled
                    ]}
                    onPress={() =>
                      setReminderData((prev) => ({ ...prev, priority }))
                    }
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.priorityText,
                        reminderData.priority === priority &&
                          styles.priorityTextActive,
                      ]}
                    >
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.previewSection}>
              <Text style={styles.inputLabel}>Notification Preview</Text>
              <View style={styles.notificationPreview}>
                <View style={styles.notificationHeader}>
                  <Bell size={16} color="#2563EB" strokeWidth={2} />
                  <Text style={styles.notificationAppName}>Rememberly</Text>
                </View>
                <Text style={styles.notificationTitle}>
                  {reminderData.title || 'Reminder Title'}
                </Text>
                <Text style={styles.notificationBody}>
                  {reminderData.description || 'Tap to view your note'}
                </Text>
                <Text style={styles.notificationTime}>
                  {reminderData.dateTime.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>

        {showDatePicker && (
          <DateTimePicker
            value={reminderData.dateTime}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={reminderData.dateTime}
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
    backgroundColor: theme.colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.neutral[100],
  },
  actionButtonActive: {
    backgroundColor: theme.colors.primary[600],
  },
  content: {
    flex: 1,
  },
  noteSection: {
    backgroundColor: theme.colors.background.primary,
    margin: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  noteTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    lineHeight: theme.typography.fontSize['2xl'] * theme.typography.lineHeight.tight,
    marginBottom: theme.spacing.md,
  },
  noteMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  typeIndicator: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  typeText: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.primary[600],
  },
  dateText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
  },
  activeRemindersSection: {
    marginBottom: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  reminderCard: {
    backgroundColor: theme.colors.primary[50],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary[600],
    marginTop: theme.spacing.sm,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  reminderTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
    flex: 1,
  },
  reminderTime: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.tertiary,
  },
  summarySection: {
    marginBottom: theme.spacing.xl,
  },
  contentSection: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  summaryText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.primary,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
    backgroundColor: theme.colors.success.light,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  contentText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
  },
  tagsSection: {
    marginBottom: 0,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  tag: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  tagText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.primary[600],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  fileSection: {
    marginBottom: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  imageContainer: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.neutral[100],
  },
  attachedImage: {
    width: '100%',
    height: 300,
    backgroundColor: theme.colors.neutral[100],
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning.light,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.warning.main,
  },
  fileAttachmentInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  fileAttachmentName: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.warning.dark,
    marginBottom: theme.spacing.xs,
  },
  fileAttachmentType: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.warning.dark,
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
  notePreview: {
    backgroundColor: theme.colors.background.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  notePreviewTitle: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  notePreviewSummary: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
    lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed,
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
});