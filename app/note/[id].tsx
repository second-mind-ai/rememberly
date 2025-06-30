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
      setNote(foundNote);
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
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
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
  backButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  actionButtonActive: {
    backgroundColor: '#2563EB',
  },
  content: {
    flex: 1,
  },
  noteSection: {
    backgroundColor: '#ffffff',
    margin: 20,
    borderRadius: 16,
    padding: 20,
  },
  noteTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    lineHeight: 32,
    marginBottom: 16,
  },
  noteMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  typeIndicator: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#2563EB',
  },
  dateText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  activeRemindersSection: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  reminderCard: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2563EB',
    marginTop: 8,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  reminderTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    flex: 1,
  },
  reminderTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  summarySection: {
    marginBottom: 24,
  },
  contentSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 24,
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
  },
  contentText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 22,
  },
  tagsSection: {
    marginBottom: 0,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  fileSection: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  attachedImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#F3F4F6',
  },
  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  fileAttachmentInfo: {
    flex: 1,
    marginLeft: 16,
  },
  fileAttachmentName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
    marginBottom: 4,
  },
  fileAttachmentType: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#B45309',
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
  notePreview: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notePreviewTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  notePreviewSummary: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
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
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  priorityText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  priorityTextActive: {
    color: '#2563EB',
  },
  previewSection: {
    marginTop: 8,
  },
  notificationPreview: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  notificationAppName: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#2563EB',
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
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
});