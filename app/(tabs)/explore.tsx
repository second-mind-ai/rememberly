import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotesStore } from '@/lib/store';
import { Search, ListFilter as Filter, ArrowUpDown, Grid2x2 as Grid, List, ChevronDown, ChevronUp } from 'lucide-react-native';
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
  const [showFilters, setShowFilters] = useState(false);
  const [filterAnimation] = useState(new Animated.Value(0));
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    Animated.timing(filterAnimation, {
      toValue: showFilters ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showFilters]);

  async function handleRefresh() {
    if (isMounted.current) {
      setRefreshing(true);
    }
    await fetchNotes();
    if (isMounted.current) {
      setRefreshing(false);
    }
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

  const activeFiltersCount = (selectedType ? 1 : 0) + (sortBy !== 'newest' ? 1 : 0);

  const filterHeight = filterAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  });

  const filterOpacity = filterAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Notes</Text>
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

      {/* Controls Bar */}
      <View style={styles.controlsBar}>
        <TouchableOpacity
          style={[styles.filtersButton, activeFiltersCount > 0 && styles.filtersButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} color={activeFiltersCount > 0 ? "#ffffff" : "#6B7280"} strokeWidth={2} />
          <Text style={[styles.filtersButtonText, activeFiltersCount > 0 && styles.filtersButtonTextActive]}>
            Filters
          </Text>
          {activeFiltersCount > 0 && (
            <View style={styles.filtersBadge}>
              <Text style={styles.filtersBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
          {showFilters ? (
            <ChevronUp size={16} color={activeFiltersCount > 0 ? "#ffffff" : "#6B7280"} strokeWidth={2} />
          ) : (
            <ChevronDown size={16} color={activeFiltersCount > 0 ? "#ffffff" : "#6B7280"} strokeWidth={2} />
          )}
        </TouchableOpacity>

        <View style={styles.controlsRight}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
          >
            {viewMode === 'list' ? (
              <Grid size={18} color="#6B7280" strokeWidth={2} />
            ) : (
              <List size={18} color="#6B7280" strokeWidth={2} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Collapsible Filters Section */}
      <Animated.View 
        style={[
          styles.filtersSection,
          {
            height: filterHeight,
            opacity: filterOpacity,
          }
        ]}
      >
        <View style={styles.filtersContent}>
          {/* Type Filters */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupTitle}>Type</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.filterChipsContainer}
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
          </View>

          {/* Sort Options */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupTitle}>Sort by</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.filterChipsContainer}
            >
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.filterChip, sortBy === option.value && styles.filterChipActive]}
                  onPress={() => setSortBy(option.value)}
                >
                  <ArrowUpDown size={14} color={sortBy === option.value ? "#ffffff" : "#6B7280"} strokeWidth={2} />
                  <Text style={[styles.filterChipText, sortBy === option.value && styles.filterChipTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Animated.View>

      {/* Results Summary */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {filteredAndSortedNotes.length} note{filteredAndSortedNotes.length !== 1 ? 's' : ''}
          {searchQuery && ` matching "${searchQuery}"`}
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
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filtersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  filtersButtonActive: {
    backgroundColor: '#2563EB',
  },
  filtersButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  filtersButtonTextActive: {
    color: '#ffffff',
  },
  filtersBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  filtersBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
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
  filtersSection: {
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    overflow: 'hidden',
  },
  filtersContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  filterGroup: {
    gap: 8,
  },
  filterGroupTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  filterChipsContainer: {
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    marginRight: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  resultsBar: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  resultsText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
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