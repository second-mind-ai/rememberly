import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotesStore } from '@/lib/store';
import { formatReminderTime } from '@/lib/reminders';
import { Bell, Calendar, Check, Clock } from 'lucide-react-native';

export default function RemindersScreen() {
  const { reminders, loading, fetchReminders, completeReminder, error } = useNotesStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchReminders();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchReminders();
    setRefreshing(false);
  }

  async function handleCompleteReminder(id: string, title: string) {
    Alert.alert(
      'Complete Reminder',
      `Mark "${title}" as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Complete', 
          onPress: () => completeReminder(id),
          style: 'default'
        }
      ]
    );
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reminders</Text>
        <Text style={styles.subtitle}>Stay on top of your saved content</Text>
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

        {/* Overdue Reminders */}
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
                />
              ))}
            </View>
          </View>
        )}

        {/* Upcoming Reminders */}
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
                />
              ))}
            </View>
          </View>
        )}

        {/* Empty State */}
        {reminders.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Bell size={48} color="#9CA3AF" strokeWidth={2} />
            <Text style={styles.emptyTitle}>No reminders set</Text>
            <Text style={styles.emptySubtitle}>
              Create notes and set reminders to revisit them later
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface ReminderCardProps {
  reminder: any; // Type would be more specific with proper Supabase types
  isOverdue: boolean;
  onComplete: (id: string, title: string) => void;
}

function ReminderCard({ reminder, isOverdue, onComplete }: ReminderCardProps) {
  const remindDate = new Date(reminder.remind_at);
  
  return (
    <View style={[styles.reminderCard, isOverdue && styles.overdueCard]}>
      <View style={styles.reminderHeader}>
        <View style={styles.reminderTime}>
          <Calendar size={16} color={isOverdue ? '#DC2626' : '#6B7280'} strokeWidth={2} />
          <Text style={[styles.timeText, isOverdue && styles.overdueText]}>
            {isOverdue ? 'Overdue' : formatReminderTime(remindDate)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.completeButton}
          onPress={() => onComplete(reminder.id, reminder.notes?.title || 'Reminder')}
        >
          <Check size={20} color="#059669" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <Text style={styles.reminderTitle} numberOfLines={2}>
        {reminder.notes?.title || 'Untitled Note'}
      </Text>

      <Text style={styles.reminderSummary} numberOfLines={2}>
        {reminder.notes?.summary || reminder.notes?.original_content || ''}
      </Text>

      <View style={styles.reminderFooter}>
        <Text style={styles.naturalInput}>"{reminder.natural_input}"</Text>
        <Text style={styles.exactTime}>
          {remindDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
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
  },
  overdueCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    backgroundColor: '#FEF2F2',
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
  completeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
  },
  reminderTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    lineHeight: 22,
    marginBottom: 8,
  },
  reminderSummary: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  reminderFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    gap: 4,
  },
  naturalInput: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#059669',
    fontStyle: 'italic',
  },
  exactTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
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
});