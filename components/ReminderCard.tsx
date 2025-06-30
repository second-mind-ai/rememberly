import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  Bell,
  Clock,
  Check,
  Volume2,
  VolumeX,
  Trash2,
  FileText,
  Link2,
  Image as ImageIcon,
  File,
  BellOff,
} from 'lucide-react-native';

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

export const ReminderCard = React.memo(({
  reminder,
  isOverdue,
  onComplete,
  onDelete,
  onSnooze,
  onMarkAsRead,
  onClearNotification,
  onNavigateToNote,
  priorityColors,
  notes,
}: ReminderCardProps) => {
  const priorityColor = priorityColors[reminder.priority || 'medium'];
  const reminderDate = new Date(reminder.remind_at);
  const linkedNote = notes.find(note => note.id === reminder.note_id);

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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  return (
    <View
      style={[
        styles.reminderCard,
        { borderColor: priorityColor.border },
        isOverdue && styles.overdueCard,
      ]}
    >
      <TouchableOpacity
        style={styles.reminderContent}
        onPress={() => linkedNote && onNavigateToNote(reminder.note_id)}
        disabled={!linkedNote}
        activeOpacity={linkedNote ? 0.7 : 1}
      >
        <View style={styles.reminderHeader}>
          <View style={[styles.priorityIndicator, { backgroundColor: priorityColor.bg }]}>
            <Bell size={16} color={priorityColor.text} strokeWidth={2} />
          </View>
          <View style={styles.reminderInfo}>
            <Text style={styles.reminderTitle} numberOfLines={1}>
              {reminder.title || 'Untitled Reminder'}
            </Text>
            {reminder.description && (
              <Text style={styles.reminderDescription} numberOfLines={2}>
                {reminder.description}
              </Text>
            )}
            <View style={styles.reminderMeta}>
              <Clock size={12} color={isOverdue ? '#DC2626' : '#6B7280'} strokeWidth={2} />
              <Text style={[styles.reminderTime, isOverdue && styles.overdueText]}>
                {formatDate(reminderDate)} at {formatTime(reminderDate)}
              </Text>
              {linkedNote && (
                <>
                  <View style={styles.separator} />
                  {getTypeIcon(linkedNote.type)}
                  <Text style={styles.linkedNoteText} numberOfLines={1}>
                    {linkedNote.title}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.reminderActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.completeButton]}
          onPress={() => onComplete(reminder.id, reminder.title)}
        >
          <Check size={16} color="#059669" strokeWidth={2.5} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onSnooze(reminder.id, reminder.title)}
        >
          <Clock size={16} color="#6B7280" strokeWidth={2} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onDelete(reminder.id, reminder.title)}
        >
          <Trash2 size={16} color="#DC2626" strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimization
  return (
    prevProps.reminder.id === nextProps.reminder.id &&
    prevProps.reminder.title === nextProps.reminder.title &&
    prevProps.reminder.remind_at === nextProps.reminder.remind_at &&
    prevProps.isOverdue === nextProps.isOverdue &&
    prevProps.notes.length === nextProps.notes.length
  );
});

ReminderCard.displayName = 'ReminderCard';

const styles = StyleSheet.create({
  reminderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  overdueCard: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  reminderContent: {
    padding: 16,
  },
  reminderHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityIndicator: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderInfo: {
    flex: 1,
    gap: 4,
  },
  reminderTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  reminderDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
  reminderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  reminderTime: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  overdueText: {
    color: '#DC2626',
  },
  separator: {
    width: 1,
    height: 12,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 2,
  },
  linkedNoteText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    flex: 1,
  },
  reminderActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
  },
  completeButton: {
    backgroundColor: '#F0FDF4',
  },
}); 