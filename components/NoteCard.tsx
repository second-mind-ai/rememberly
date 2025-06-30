import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import {
  FileText,
  Link2,
  Image as ImageIcon,
  Calendar,
  ExternalLink,
  File,
  BellRing,
} from 'lucide-react-native';
import { Database } from '@/lib/supabase';
import { useReminderStore } from '@/lib/reminderStore';
import { theme } from '@/lib/theme';

type Note = Database['public']['Tables']['notes']['Row'];

interface NoteCardProps {
  note: Note;
}

// Optimize with React.memo and custom comparison
export const NoteCard = React.memo(({ note }: NoteCardProps) => {
  const { reminders } = useReminderStore();
  const [scaleAnim] = React.useState(new Animated.Value(1));
  
  // Check if this note has active reminders
  const noteReminders = reminders.filter(reminder => reminder.note_id === note.id);
  const hasActiveReminders = noteReminders.length > 0;
  const nextReminder = noteReminders.sort((a, b) => 
    new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime()
  )[0];

  const getTypeIcon = () => {
    const iconProps = { size: 16, strokeWidth: 1.5 };
    switch (note.type) {
      case 'url':
        return <Link2 {...iconProps} color={theme.colors.success.main} />;
      case 'file':
        return <File {...iconProps} color={theme.colors.warning.main} />;
      case 'image':
        return <ImageIcon {...iconProps} color={theme.colors.error.main} />;
      default:
        return <FileText {...iconProps} color={theme.colors.primary[600]} />;
    }
  };

  const getTypeColor = () => {
    switch (note.type) {
      case 'url':
        return theme.colors.success.light;
      case 'file':
        return theme.colors.warning.light;
      case 'image':
        return theme.colors.error.light;
      default:
        return theme.colors.primary[50];
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatReminderTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffMs < 0) return 'Overdue';
    if (diffHours < 1) return 'Soon';
    if (diffHours < 24) return `${Math.round(diffHours)}h`;
    if (diffDays < 7) return `${Math.round(diffDays)}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleOpenSourceLink = async (e: any) => {
    e.stopPropagation();

    if (!displaySourceUrl) return;

    try {
      const supported = await Linking.canOpenURL(displaySourceUrl);
      if (supported) {
        await Linking.openURL(displaySourceUrl);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }
    } catch (error) {
      console.error('Failed to open source URL:', error);
      Alert.alert('Error', 'Failed to open URL');
    }
  };

  const handleCardPress = () => {
    // Animate press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.push(`/note/${note.id}`);
    });
  };

  const extractLinksFromText = (text: string): string[] => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  const handleTextLinkPress = async (url: string, e: any) => {
    e.stopPropagation();

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }
    } catch (error) {
      console.error('Failed to open text URL:', error);
      Alert.alert('Error', 'Failed to open URL');
    }
  };

  // Check if content has links
  const contentLinks = extractLinksFromText(note.original_content);
  const summaryLinks = extractLinksFromText(note.summary || '');
  const allContentLinks = [...new Set([...contentLinks, ...summaryLinks])];
  const hasContentLinks = allContentLinks.length > 0;

  // Use first content link as source URL if no source_url exists
  const displaySourceUrl =
    note.source_url || (hasContentLinks ? allContentLinks[0] : null);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.card}
        onPress={handleCardPress}
        activeOpacity={0.9}
      >
        <View style={styles.header}>
          <View
            style={[styles.typeIndicator, { backgroundColor: getTypeColor() }]}
          >
            {getTypeIcon()}
          </View>
          <View style={styles.headerInfo}>
            <View style={styles.dateContainer}>
              <Calendar size={12} color={theme.colors.text.tertiary} strokeWidth={1.5} />
              <Text style={styles.dateText}>{formatDate(note.created_at)}</Text>
            </View>
            {hasActiveReminders && (
              <View style={styles.reminderBadge}>
                <BellRing size={12} color={theme.colors.primary[600]} strokeWidth={1.5} />
                <Text style={styles.reminderText}>
                  {formatReminderTime(nextReminder.remind_at)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {note.title || 'Untitled Note'}
        </Text>

        <Text style={styles.summary} numberOfLines={3}>
          {note.summary || note.original_content}
        </Text>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {note.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {note.tags.length > 3 && (
              <Text style={styles.moreTagsText}>
                +{note.tags.length - 3}
              </Text>
            )}
          </View>
        )}

        {/* Source Link */}
        {displaySourceUrl && (
          <TouchableOpacity
            style={styles.sourceLink}
            onPress={handleOpenSourceLink}
            activeOpacity={0.7}
          >
            <ExternalLink size={14} color={theme.colors.primary[600]} strokeWidth={1.5} />
            <Text style={styles.sourceLinkText} numberOfLines={1}>
              {displaySourceUrl.replace(/^https?:\/\//, '').replace(/^www\./, '')}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.note.id === nextProps.note.id &&
    prevProps.note.title === nextProps.note.title &&
    prevProps.note.summary === nextProps.note.summary &&
    prevProps.note.updated_at === nextProps.note.updated_at
  );
});

NoteCard.displayName = 'NoteCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  typeIndicator: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  dateText: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.tertiary,
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  reminderText: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.primary[600],
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
    lineHeight: theme.typography.fontSize.lg * theme.typography.lineHeight.tight,
    marginBottom: theme.spacing.sm,
  },
  summary: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
    marginBottom: theme.spacing.md,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  tag: {
    backgroundColor: theme.colors.neutral[100],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  tagText: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
  },
  moreTagsText: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.tertiary,
    paddingHorizontal: theme.spacing.xs,
    alignSelf: 'center',
  },
  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  sourceLinkText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.primary[600],
    flex: 1,
  },
  // Removed all other unused styles for cleaner code
});