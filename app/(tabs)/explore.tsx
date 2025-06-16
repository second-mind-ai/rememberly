import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotesStore } from '@/lib/store';
import { Search, ListFilter as Filter, Import as SortAsc, Grid2x2 as Grid, List } from 'lucide-react-native';
import { NoteCard } from '@/components/NoteCard';

type SortOption = 'newest' | 'oldest' | 'title' | 'type';
type ViewMode = 'grid' | 'list';

export default function ExploreScreen() {
  const { notes, loading, fetchNotes, error } = useNotesStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchNotes();
    setRefreshing(false);
  }

  // Filter and sort notes
  const filteredAndSortedNotes = notes
    .filter(note => {
      const matchesSearch = searchQuery === '' || 
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.original_content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesType = selectedType === null || note.type === selectedType;
      
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

  const noteTypes = ['text', 'url', 'file', 'image'];
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'title', label: 'Title A-Z' },
    { value: 'type', label: 'Type' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Explore Notes</Text>
        <Text style={styles.subtitle}>Browse and search all your notes</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#6B7280" strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search notes, tags, or content..."
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      {/* Filters and Controls */}
      <View style={styles.controlsSection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
        >
          <TouchableOpacity
            style={[styles.filterChip, selectedType === null && styles.filterChipActive]}
            onPress={() => setSelectedType(null)}
          >
            <Text style={[styles.filterChipText, selectedType === null && styles.filterChipTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          
          {noteTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.filterChip, selectedType === type && styles.filterChipActive]}
              onPress={() => setSelectedType(selectedType === type ? null : type)}
            >
              <Text style={[styles.filterChipText, selectedType === type && styles.filterChipTextActive]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.controlsRight}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => {
              const currentIndex = sortOptions.findIndex(option => option.value === sortBy);
              const nextIndex = (currentIndex + 1) % sortOptions.length;
              setSortBy(sortOptions[nextIndex].value);
            }}
          >
            <SortAsc size={20} color="#6B7280" strokeWidth={2} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
          >
            {viewMode === 'list' ? (
              <Grid size={20} color="#6B7280" strokeWidth={2} />
            ) : (
              <List size={20} color="#6B7280" strokeWidth={2} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Sort Indicator */}
      <View style={styles.sortIndicator}>
        <Text style={styles.sortText}>
          Sorted by: {sortOptions.find(option => option.value === sortBy)?.label}
        </Text>
        <Text style={styles.countText}>
          {filteredAndSortedNotes.length} note{filteredAndSortedNotes.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Notes List */}
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

        {filteredAndSortedNotes.length > 0 ? (
          <View style={[
            styles.notesContainer,
            viewMode === 'grid' && styles.notesGrid
          ]}>
            {filteredAndSortedNotes.map((note) => (
              <View 
                key={note.id} 
                style={viewMode === 'grid' ? styles.gridItem : styles.listItem}
              >
                <NoteCard note={note} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Search size={48} color="#9CA3AF" strokeWidth={2} />
            <Text style={styles.emptyTitle}>
              {searchQuery || selectedType ? 'No matching notes' : 'No notes yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery || selectedType 
                ? 'Try adjusting your search or filters'
                : 'Create your first note to get started'
              }
            </Text>
          </View>
        )}
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
  searchSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchContainer: {
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
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  controlsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filtersContainer: {
    flex: 1,
    marginRight: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  controlsRight: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  sortIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sortText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  countText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  content: {
    flex: 1,
  },
  notesContainer: {
    padding: 20,
    gap: 12,
  },
  notesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  listItem: {
    width: '100%',
  },
  gridItem: {
    width: '48%',
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