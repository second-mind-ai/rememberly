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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useNotesStore } from '@/lib/store';
import { useReminderStore } from '@/lib/reminderStore';
import { ArrowLeft, Calendar, Bell, LocationEdit as Edit3, Trash2, ExternalLink } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Database } from '@/lib/supabase';

type Note = Database['public']['Tables']['notes']['Row'];

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { notes, updateNote, deleteNote } = useNotesStore();
  const { createReminder } = useReminderStore();
  const [note, setNote] = useState<Note | null>(null);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [reminderData, setReminderData] = useState({
    title: '',
    description: '',
    dateTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  useEffect(() => {
    const foundNote = notes.find(n => n.id === id);
    if (foundNote) {
      setNote(foundNote);
      setReminderData(prev => ({
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
      Alert.alert('Error', 'Please enter a reminder title');
      return;
    }

    if (reminderData.dateTime <= new Date()) {
      Alert.alert('Error', 'Please select a future date and time');
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

      Alert.alert(
        'Reminder Set',
        `You'll be reminded about this note on ${reminderData.dateTime.toLocaleDateString()} at ${reminderData.dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      );
      
      setShowReminderForm(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to create reminder');
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
            await deleteNote(id);
            router.back();
          },
        },
      ]
    );
  }

  function handleOpenUrl() {
    if (note?.source_url) {
      Alert.alert('Open URL', `Would open: ${note.source_url}`);
    }
  }

  function onDateChange(event: any, selectedDate?: Date) {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDateTime = new Date(reminderData.dateTime);
      newDateTime.setFullYear(selectedDate.getFullYear());
      newDateTime.setMonth(selectedDate.getMonth());
      newDateTime.setDate(selectedDate.getDate());
      setReminderData(prev => ({ ...prev, dateTime: newDateTime }));
    }
  }

  function onTimeChange(event: any, selectedTime?: Date) {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDateTime = new Date(reminderData.dateTime);
      newDateTime.setHours(selectedTime.getHours());
      newDateTime.setMinutes(selectedTime.getMinutes());
      setReminderData(prev => ({ ...prev, dateTime: newDateTime }));
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => setShowReminderForm(!showReminderForm)} 
            style={[styles.actionButton, showReminderForm && styles.actionButtonActive]}
          >
            <Bell size={20} color={showReminderForm ? "#ffffff" : "#6B7280"} strokeWidth={2} />
          </TouchableOpacity>
          {note.source_url && (
            <TouchableOpacity onPress={handleOpenUrl} style={styles.actionButton}>
              <ExternalLink size={20} color="#6B7280" strokeWidth={2} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
            <Trash2 size={20} color="#DC2626" strokeWidth={2} />
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

          {note.summary && (
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>AI Summary</Text>
              <Text style={styles.summaryText}>{note.summary}</Text>
            </View>
          )}

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

        {showReminderForm && (
          <View style={styles.reminderSection}>
            <Text style={styles.sectionTitle}>Set Reminder for This Note</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reminder Title</Text>
              <TextInput
                style={styles.textInput}
                value={reminderData.title}
                onChangeText={(text) => setReminderData(prev => ({ ...prev, title: text }))}
                placeholder="What should we remind you about?"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={reminderData.description}
                onChangeText={(text) => setReminderData(prev => ({ ...prev, description: text }))}
                placeholder="Additional details..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={2}
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
                    {reminderData.dateTime.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Bell size={20} color="#6B7280" strokeWidth={2} />
                  <Text style={styles.dateTimeText}>
                    {reminderData.dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                      reminderData.priority === priority && styles.priorityButtonActive
                    ]}
                    onPress={() => setReminderData(prev => ({ ...prev, priority }))}
                  >
                    <Text style={[
                      styles.priorityText,
                      reminderData.priority === priority && styles.priorityTextActive
                    ]}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.setReminderButton, loading && styles.buttonDisabled]}
              onPress={handleSetReminder}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Bell size={16} color="#ffffff" strokeWidth={2} />
                  <Text style={styles.setReminderButtonText}>Set Reminder</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

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
  reminderSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 60,
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
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateTimeText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  priorityButtonActive: {
    backgroundColor: '#2563EB',
  },
  priorityText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  priorityTextActive: {
    color: '#ffffff',
  },
  setReminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  setReminderButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});