import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { router } from 'expo-router';
import { FileText, Link2, Image as ImageIcon, Calendar, ExternalLink } from 'lucide-react-native';
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

  const handleOpenSourceLink = async (e: any) => {
    e.stopPropagation(); // Prevent card navigation when clicking link
    
    if (!note.source_url) return;

    try {
      const supported = await Linking.canOpenURL(note.source_url);
      if (supported) {
        await Linking.openURL(note.source_url);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open URL');
    }
  };

  const handleCardPress = () => {
    router.push(`/note/${note.id}`);
  };

  const extractLinksFromText = (text: string): string[] => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  const handleTextLinkPress = async (url: string, e: any) => {
    e.stopPropagation(); // Prevent card navigation
    
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open URL');
    }
  };

  const renderTextWithLinks = (text: string) => {
    const links = extractLinksFromText(text);
    
    if (links.length === 0) {
      return <Text style={styles.summary} numberOfLines={3}>{text}</Text>;
    }

    let parts = [text];
    links.forEach(link => {
      const newParts: any[] = [];
      parts.forEach(part => {
        if (typeof part === 'string') {
          const splitParts = part.split(link);
          for (let i = 0; i < splitParts.length; i++) {
            if (i > 0) {
              newParts.push(
                <TouchableOpacity
                  key={`${link}-${i}`}
                  onPress={(e) => handleTextLinkPress(link, e)}
                  style={styles.inlineLink}
                >
                  <Text style={styles.inlineLinkText}>
                    {link.length > 30 ? `${link.substring(0, 30)}...` : link}
                  </Text>
                </TouchableOpacity>
              );
            }
            if (splitParts[i]) {
              newParts.push(splitParts[i]);
            }
          }
        } else {
          newParts.push(part);
        }
      });
      parts = newParts;
    });

    return (
      <View style={styles.textWithLinks}>
        <Text style={styles.summary} numberOfLines={3}>
          {parts.map((part, index) => 
            typeof part === 'string' ? part : part
          )}
        </Text>
      </View>
    );
  };

  // Check if content has links
  const contentLinks = extractLinksFromText(note.original_content);
  const summaryLinks = extractLinksFromText(note.summary || '');
  const hasContentLinks = contentLinks.length > 0 || summaryLinks.length > 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handleCardPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.typeContainer}>
          {getTypeIcon()}
        </View>
        <View style={styles.headerRight}>
          <View style={styles.dateContainer}>
            <Calendar size={12} color="#9CA3AF" strokeWidth={2} />
            <Text style={styles.dateText}>{formatDate(note.created_at)}</Text>
          </View>
          {note.source_url && (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleOpenSourceLink}
              activeOpacity={0.7}
            >
              <ExternalLink size={14} color="#2563EB" strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {note.title || 'Untitled Note'}
      </Text>

      {/* Render summary with clickable links */}
      {renderTextWithLinks(note.summary || note.original_content)}

      {/* Source URL section */}
      {note.source_url && (
        <TouchableOpacity 
          style={styles.sourceLink}
          onPress={handleOpenSourceLink}
          activeOpacity={0.7}
        >
          <Link2 size={12} color="#2563EB" strokeWidth={2} />
          <Text style={styles.sourceLinkText} numberOfLines={1}>
            {note.source_url.replace(/^https?:\/\//, '').replace(/^www\./, '')}
          </Text>
          <ExternalLink size={12} color="#2563EB" strokeWidth={2} />
        </TouchableOpacity>
      )}

      {/* Additional links found in content */}
      {hasContentLinks && !note.source_url && (
        <View style={styles.additionalLinksContainer}>
          <View style={styles.additionalLinksHeader}>
            <Link2 size={12} color="#6B7280" strokeWidth={2} />
            <Text style={styles.additionalLinksTitle}>
              {contentLinks.length + summaryLinks.length} link{(contentLinks.length + summaryLinks.length) !== 1 ? 's' : ''} found
            </Text>
          </View>
          {[...new Set([...contentLinks, ...summaryLinks])].slice(0, 2).map((link, index) => (
            <TouchableOpacity
              key={index}
              style={styles.additionalLink}
              onPress={(e) => handleTextLinkPress(link, e)}
              activeOpacity={0.7}
            >
              <ExternalLink size={10} color="#6B7280" strokeWidth={2} />
              <Text style={styles.additionalLinkText} numberOfLines={1}>
                {link.replace(/^https?:\/\//, '').replace(/^www\./, '')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {note.tags && note.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {note.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  linkButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
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
  textWithLinks: {
    marginBottom: 12,
  },
  inlineLink: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginHorizontal: 2,
  },
  inlineLinkText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  sourceLinkText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
    flex: 1,
  },
  additionalLinksContainer: {
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  additionalLinksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  additionalLinksTitle: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  additionalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  additionalLinkText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    flex: 1,
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