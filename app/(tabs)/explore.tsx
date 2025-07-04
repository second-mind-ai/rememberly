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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotesStore } from '@/lib/store';
import { Search, ListFilter as Filter, ArrowUpDown, Grid2x2 as Grid, List, ChevronDown, ChevronUp } from 'lucide-react-native';
import { NoteCard } from '@/components/NoteCard';
import { theme } from '@/lib/theme';

type SortOption = 'newest' | 'oldest' | 'title' | 'type';
type ViewMode = 'grid' | 'list';

const { width: screenWidth } = Dimensions.get('window');

export default function ExploreScreen() {
  const { notes, loading, fetchNotes, error } = useNotesStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterAnimation] = useState(new Animated.Value(0));
  const [filterHeight, setFilterHeight] = useState(0);
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

  const animatedHeight = filterAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, filterHeight || 160], // Dynamic height based on content
  });

  const filterOpacity = filterAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const handleFilterLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0 && height !== filterHeight) {
      setFilterHeight(height);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notes</Text>
        <Text style={styles.headerSubtitle}>Browse and search all your notes</Text>
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
            height: animatedHeight,
            opacity: filterOpacity,
          }
        ]}
      >
        <View 
          style={styles.filtersContent}
          onLayout={handleFilterLayout}
        >
          {/* Type Filters */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupTitle}>Type</Text>
            <View style={styles.filterChipsContainer}>
              <View style={styles.filterChipsRow}>
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
              </View>
            </View>
          </View>

          {/* Sort Options */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupTitle}>Sort by</Text>
            <View style={styles.filterChipsContainer}>
              <View style={styles.filterChipsRow}>
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
              </View>
            </View>
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
  headerTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
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
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.primary,
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
    fontFamily: theme.typography.fontFamily.medium,
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
    fontFamily: theme.typography.fontFamily.bold,
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 20,
  },
  filterGroup: {
    gap: 12,
  },
  filterGroupTitle: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: '#374151',
  },
  filterChipsContainer: {
    width: '100%',
  },
  filterChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    gap: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 36,
    // Ensure chips don't get too small on smaller screens
    minWidth: screenWidth < 400 ? 70 : 80,
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.medium,
    color: '#6B7280',
    textAlign: 'center',
    flexShrink: 1,
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
    fontFamily: theme.typography.fontFamily.medium,
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
    width: screenWidth < 600 ? '48%' : '31%', // Responsive grid columns
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing['3xl'],
    gap: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
  },
  errorContainer: {
    backgroundColor: theme.colors.error.light,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    margin: theme.spacing.lg,
  },
  errorText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.error.dark,
    textAlign: 'center',
  },
});