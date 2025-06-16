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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useNotesStore } from '@/lib/store';
import { parseReminderTime, scheduleNotification } from '@/lib/reminders';
import { ArrowLeft, Calendar, Bell, Edit3, Trash2, ExternalLink } from 'lucide-react-native';
import { Database } from '@/lib/supabase';

type Note = Database['public']['Tables']['notes']['Row'];

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { notes, updateNote, deleteNote, createReminder } = useNotesStore();
  const [note, setNote] = useState<Note | null>(null);
  const [reminderInput, setReminderInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const foundNote = notes.find(n => n.id === id);
    if (foundNote) {
      setNote(foundNote);
    } else {
      // Note not found, go back
      router.back();
    }
  }, [id, notes]);

  async function handleSetReminder() {
    if (!reminderInput.trim() || !note) {
      Alert.alert('Error', 'Please enter a reminder time');
      return;
    }

    setLoading(true);
    try {
      const parsedDate = parseReminderTime(reminderInput);
      
      if (!parsedDate) {
        Alert.alert('Error', 'Could not understand the reminder time. Try "tomorrow at 9am" or "next week"');
        setLoading(false);
        return;
      }

      // Create reminder in database
      const reminder = await createReminder({
        note_id: note.id,
        remind_at: parsedDate.toISOString(),
        natural_input: reminderInput,
      });

      if (reminder) {
        // Schedule local notification
        await scheduleNotification(
          `Reminder: ${note.title}`,
          note.summary || 'Check your note',
          parsedDate,
          note.id
        );

        Alert.alert('Success', `Reminder set for ${parsedDate.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })}`);
        setReminderInput('');
      } else {
        Alert.alert('Error', 'Failed to create reminder');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Reminder creation error:', error);
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
      // In a real app, you'd use Linking.openURL
      Alert.alert('Open URL', `Would open: ${note.source_url}`);
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#111827" strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
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
        {/* Note Content */}
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

        {/* Set Reminder */}
        <View style={styles.reminderSection}>
          <Text style={styles.sectionTitle}>Set Reminder</Text>
          <Text style={styles.reminderSubtitle}>
            Use natural language like "tomorrow at 9am" or "next Friday"
          </Text>
          
          <View style={styles.reminderInput}>
            <View style={styles.reminderInputContainer}>
              <Calendar size={20} color="#6B7280" strokeWidth={2} />
              <TextInput
                style={styles.reminderTextInput}
                value={reminderInput}
                onChangeText={setReminderInput}
                placeholder="Remind me in 2 hours"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <TouchableOpacity
              style={[styles.setReminderButton, (!reminderInput.trim() || loading) && styles.buttonDisabled]}
              onPress={handleSetReminder}
              disabled={!reminderInput.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Bell size={16} color="#ffffff" strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  reminderSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 16,
  },
  reminderInput: {
    flexDirection: 'row',
    gap: 8,
  },
  reminderInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reminderTextInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  setReminderButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});