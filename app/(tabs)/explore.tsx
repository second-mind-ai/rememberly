import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotesStore } from '@/lib/store';
import { Search, Filter, Tag } from 'lucide-react-native';
import { NoteCard } from '@/components/NoteCard';

export default function ExploreScreen() {
  const { notes, loading, fetchNotes, error } = useNotesStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchNotes();
    setRefreshing(false);
  }

  // Get all unique tags from notes
  const allTags = Array.from(new Set(notes.flatMap(note => note.tags || [])));

  // Filter notes based on search and selected tag
  const filteredNotes = notes.filter(note => {
    const matchesSearch = !searchQuery || 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.original_content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTag = !selectedTag || (note.tags && note.tags.includes(selectedTag));
    
    return matchesSearch && matchesTag;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Explore Notes</Text>
        <Text style={styles.subtitle}>Search and discover your saved content</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#6B7280" strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search notes..."
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Tags Filter */}
        {allTags.length > 0 && (
          <View style={styles.tagsSection}>
            <View style={styles.tagsSectionHeader}>
              <Tag size={16} color="#6B7280" strokeWidth={2} />
              <Text style={styles.tagsTitle}>Filter by Tag</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsContainer}>
              <TouchableOpacity
                style={[styles.tagFilter, !selectedTag && styles.activeTagFilter]}
                onPress={() => setSelectedTag(null)}
              >
                <Text style={[styles.tagFilterText, !selectedTag && styles.activeTagFilterText]}>
                  All
                </Text>
              </TouchableOpacity>
              {allTags.map((tag, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.tagFilter, selectedTag === tag && styles.activeTagFilter]}
                  onPress={() => setSelectedTag(selectedTag === tag ? null : tag)}
                >
                  <Text style={[styles.tagFilterText, selectedTag === tag && styles.activeTagFilterText]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Results */}
        <View style={styles.resultsSection}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>
              {filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''}
              {searchQuery && ` for "${searchQuery}"`}
              {selectedTag && ` tagged "${selectedTag}"`}
            </Text>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {filteredNotes.length > 0 ? (
            <View style={styles.notesContainer}>
              {filteredNotes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Search size={48} color="#9CA3AF" strokeWidth={2} />
              <Text style={styles.emptyTitle}>No notes found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || selectedTag
                  ? 'Try adjusting your search or filter criteria'
                  : 'Create your first note to see it here'
                }
              </Text>
            </View>
          )}
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
  searchContainer: {
    padding: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  tagsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tagsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tagsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  tagsContainer: {
    flexDirection: 'row',
  },
  tagFilter: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeTagFilter: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  tagFilterText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  activeTagFilterText: {
    color: '#ffffff',
  },
  resultsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  resultsHeader: {
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  notesContainer: {
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#DC2626',
    textAlign: 'center',
  },
});