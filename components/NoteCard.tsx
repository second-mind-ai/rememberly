import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert, I18nManager } from 'react-native';
import { router } from 'expo-router';
import { FileText, Link2, Image as ImageIcon, Calendar, ExternalLink, Globe } from 'lucide-react-native';
import { Database } from '@/lib/supabase';

type Note = Database['public']['Tables']['notes']['Row'];

interface NoteCardProps {
  note: Note;
}

export function NoteCard({ note }: NoteCardProps) {
  const getTypeIcon = () => {
    switch (note.type) {
      case 'url':
        return <Link2 size={16} color="#059669" strokeWidth={2} />;
      case 'file':
      case 'image':
        return <ImageIcon size={16} color="#D97706" strokeWidth={2} />;
      default:
        return <FileText size={16} color="#2563EB" strokeWidth={2} />;
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
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const handleSourceUrlPress = async (event: any) => {
    event.stopPropagation(); // Prevent card navigation
    
    if (note.source_url) {
      try {
        const canOpen = await Linking.canOpenURL(note.source_url);
        if (canOpen) {
          await Linking.openURL(note.source_url);
        } else {
          Alert.alert('Error', 'Cannot open this URL');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to open URL');
      }
    }
  };

  const isRTL = I18nManager.isRTL;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/note/${note.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.typeContainer}>
          {getTypeIcon()}
        </View>
        <View style={styles.dateContainer}>
          <Calendar size={12} color="#9CA3AF" strokeWidth={2} />
          <Text style={styles.dateText}>{formatDate(note.created_at)}</Text>
        </View>
      </View>

      <Text style={[styles.title, isRTL && styles.rtlText]} numberOfLines={2}>
        {note.title || 'Untitled Note'}
      </Text>

      <Text style={[styles.summary, isRTL && styles.rtlText]} numberOfLines={3}>
        {note.summary || note.original_content}
      </Text>

      {/* Source URL Display */}
      {note.source_url && (
        <TouchableOpacity 
          style={styles.sourceUrlContainer} 
          onPress={handleSourceUrlPress}
          activeOpacity={0.7}
        >
          <Globe size={14} color="#2563EB" strokeWidth={2} />
          <Text style={[styles.sourceUrlText, isRTL && styles.rtlText]} numberOfLines={1}>
            {note.source_url}
          </Text>
          <ExternalLink size={12} color="#2563EB" strokeWidth={2} />
        </TouchableOpacity>
      )}

      {note.tags && note.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {note.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={[styles.tagText, isRTL && styles.rtlText]}>{tag}</Text>
            </View>
          ))}
          {note.tags.length > 3 && (
            <Text style={styles.moreTagsText}>+{note.tags.length - 3} more</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    lineHeight: 22,
    marginBottom: 8,
  },
  summary: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  rtlText: {
    textAlign: I18nManager.isRTL ? 'right' : 'left',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  },
  sourceUrlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  sourceUrlText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  tag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
  },
  moreTagsText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
});