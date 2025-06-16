import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotesStore } from '@/lib/store';
import { 
  Search, 
  Plus, 
  Heart, 
  DollarSign, 
  Newspaper, 
  Settings, 
  Briefcase, 
  Home,
  Edit3,
  Trash2,
  Sparkles
} from 'lucide-react-native';
import { NoteCard } from '@/components/NoteCard';

interface Category {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  backgroundColor: string;
  count: number;
  isAI?: boolean;
}

interface UserCategory {
  id: string;
  name: string;
  count: number;
  color: string;
}

export default function CategoriesScreen() {
  const { notes, loading, fetchNotes, error } = useNotesStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchNotes();
    setRefreshing(false);
  }

  // AI-generated categories based on common tags
  const aiCategories: Category[] = [
    {
      id: 'health',
      name: 'Health',
      description: 'Medical, fitness, wellness',
      icon: Heart,
      color: '#059669',
      backgroundColor: '#ECFDF5',
      count: notes.filter(note => 
        note.tags?.some(tag => 
          ['health', 'fitness', 'medical', 'wellness', 'exercise', 'diet'].includes(tag.toLowerCase())
        )
      ).length,
      isAI: true
    },
    {
      id: 'technology',
      name: 'Technology',
      description: 'AI, software, gadgets',
      icon: Settings,
      color: '#2563EB',
      backgroundColor: '#EFF6FF',
      count: notes.filter(note => 
        note.tags?.some(tag => 
          ['technology', 'ai', 'software', 'programming', 'tech', 'code'].includes(tag.toLowerCase())
        )
      ).length,
      isAI: true
    },
    {
      id: 'finance',
      name: 'Finance',
      description: 'Investment, banking, crypto',
      icon: DollarSign,
      color: '#D97706',
      backgroundColor: '#FEF3C7',
      count: notes.filter(note => 
        note.tags?.some(tag => 
          ['finance', 'money', 'investment', 'banking', 'crypto', 'stocks'].includes(tag.toLowerCase())
        )
      ).length,
      isAI: true
    },
    {
      id: 'news',
      name: 'News',
      description: 'Current events, politics',
      icon: Newspaper,
      color: '#DC2626',
      backgroundColor: '#FEF2F2',
      count: notes.filter(note => 
        note.tags?.some(tag => 
          ['news', 'politics', 'current', 'events', 'world', 'breaking'].includes(tag.toLowerCase())
        )
      ).length,
      isAI: true
    }
  ];

  // User-created categories (mock data for now)
  const userCategories: UserCategory[] = [
    {
      id: 'work-projects',
      name: 'Work Projects',
      count: 4,
      color: '#F97316'
    },
    {
      id: 'personal',
      name: 'Personal',
      count: 6,
      color: '#059669'
    }
  ];

  // Get filtered notes based on selected category
  const getFilteredNotes = () => {
    if (!selectedCategory) return notes;
    
    const category = aiCategories.find(cat => cat.id === selectedCategory);
    if (!category) return notes;

    return notes.filter(note => {
      switch (selectedCategory) {
        case 'health':
          return note.tags?.some(tag => 
            ['health', 'fitness', 'medical', 'wellness', 'exercise', 'diet'].includes(tag.toLowerCase())
          );
        case 'technology':
          return note.tags?.some(tag => 
            ['technology', 'ai', 'software', 'programming', 'tech', 'code'].includes(tag.toLowerCase())
          );
        case 'finance':
          return note.tags?.some(tag => 
            ['finance', 'money', 'investment', 'banking', 'crypto', 'stocks'].includes(tag.toLowerCase())
          );
        case 'news':
          return note.tags?.some(tag => 
            ['news', 'politics', 'current', 'events', 'world', 'breaking'].includes(tag.toLowerCase())
          );
        default:
          return true;
      }
    });
  };

  const filteredNotes = getFilteredNotes();
  const totalCategories = aiCategories.length + userCategories.length;
  const totalItems = notes.length;

  if (selectedCategory) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => setSelectedCategory(null)}
            style={styles.backButton}
          >
            <Text style={styles.backText}>← Categories</Text>
          </TouchableOpacity>
          <Text style={styles.categoryTitle}>
            {aiCategories.find(cat => cat.id === selectedCategory)?.name}
          </Text>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {filteredNotes.length > 0 ? (
            <View style={styles.notesContainer}>
              {filteredNotes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No notes in this category</Text>
              <Text style={styles.emptySubtitle}>
                Create notes with relevant tags to see them here
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Categories</Text>
          <TouchableOpacity style={styles.addButton}>
            <Plus size={20} color="#6B7280" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* AI-Tagged Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Sparkles size={16} color="#7C3AED" strokeWidth={2} />
            <Text style={styles.sectionTitle}>AI-Tagged Categories</Text>
          </View>

          <View style={styles.categoriesGrid}>
            {aiCategories.map((category) => {
              const Icon = category.icon;
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.categoryCard, { backgroundColor: category.backgroundColor }]}
                  onPress={() => setSelectedCategory(category.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.categoryHeader}>
                    <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                      <Icon size={20} color={category.color} strokeWidth={2} />
                    </View>
                    <Text style={styles.categoryCount}>{category.count}</Text>
                  </View>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryDescription}>{category.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* My Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.folderIcon}>
              <View style={styles.folderIconInner} />
            </View>
            <Text style={styles.sectionTitle}>My Categories</Text>
            <TouchableOpacity style={styles.addNewButton}>
              <Text style={styles.addNewText}>Add New</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.userCategoriesList}>
            {userCategories.map((category) => (
              <View key={category.id} style={styles.userCategoryCard}>
                <View style={styles.userCategoryLeft}>
                  <View style={[styles.userCategoryIcon, { backgroundColor: category.color }]}>
                    <Briefcase size={16} color="#ffffff" strokeWidth={2} />
                  </View>
                  <View style={styles.userCategoryInfo}>
                    <Text style={styles.userCategoryName}>{category.name}</Text>
                    <Text style={styles.userCategoryCount}>{category.count} items</Text>
                  </View>
                </View>
                <View style={styles.userCategoryActions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <Edit3 size={16} color="#6B7280" strokeWidth={2} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Trash2 size={16} color="#6B7280" strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Category Overview */}
        <View style={styles.overviewSection}>
          <Text style={styles.overviewTitle}>Category Overview</Text>
          <View style={styles.overviewStats}>
            <View style={styles.overviewStat}>
              <Text style={styles.overviewNumber}>{totalCategories}</Text>
              <Text style={styles.overviewLabel}>Total Categories</Text>
            </View>
            <View style={styles.overviewStat}>
              <Text style={styles.overviewNumber}>{totalItems}</Text>
              <Text style={styles.overviewLabel}>Total Items</Text>
            </View>
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  backText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#475569',
  },
  categoryTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    flex: 1,
  },
  addNewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
  },
  addNewText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#2563EB',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCount: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
  },
  categoryName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    lineHeight: 16,
  },
  userCategoriesList: {
    gap: 12,
  },
  userCategoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  userCategoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  userCategoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCategoryInfo: {
    flex: 1,
  },
  userCategoryName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 2,
  },
  userCategoryCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  userCategoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
  },
  folderIcon: {
    width: 16,
    height: 16,
    backgroundColor: '#64748B',
    borderRadius: 2,
    position: 'relative',
  },
  folderIconInner: {
    position: 'absolute',
    top: -2,
    left: 2,
    right: 2,
    height: 4,
    backgroundColor: '#64748B',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  overviewSection: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  overviewTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 16,
  },
  overviewStats: {
    flexDirection: 'row',
    gap: 24,
  },
  overviewStat: {
    alignItems: 'center',
  },
  overviewNumber: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#2563EB',
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  notesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
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