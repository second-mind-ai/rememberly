import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useNotesStore } from '@/lib/store';
import { Search, Plus, Heart, DollarSign, Newspaper, Settings, Briefcase, LocationEdit as Edit3, Trash2, Sparkles, X, Check, ArrowLeft } from 'lucide-react-native';
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
  description?: string;
}

const CATEGORY_COLORS = [
  '#F97316', // Orange
  '#059669', // Green
  '#2563EB', // Blue
  '#DC2626', // Red
  '#7C3AED', // Purple
  '#DB2777', // Pink
  '#0891B2', // Cyan
  '#65A30D', // Lime
];

export default function CategoriesScreen() {
  const { notes, loading, fetchNotes, error } = useNotesStore();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [scrollPosition, setScrollPosition] = useState(0);
  const [userCategories, setUserCategories] = useState<UserCategory[]>([
    {
      id: 'work-projects',
      name: 'Work Projects',
      count: 4,
      color: '#F97316',
      description: 'Professional tasks and projects'
    },
    {
      id: 'personal',
      name: 'Personal',
      count: 6,
      color: '#059669',
      description: 'Personal notes and thoughts'
    }
  ]);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    fetchNotes();
  }, []);

  // Handle hardware/system back button
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (showAddModal) {
          if (isMounted.current) {
            setShowAddModal(false);
          }
          return true; // Prevent default behavior
        }
        
        if (selectedCategory) {
          handleBackPress();
          return true; // Prevent default behavior
        }
        
        return false; // Allow default behavior (exit app or go to previous screen)
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [selectedCategory, showAddModal])
  );

  async function handleRefresh() {
    if (isMounted.current) {
      setRefreshing(true);
    }
    await fetchNotes();
    if (isMounted.current) {
      setRefreshing(false);
    }
  }

  function handleAddCategory() {
    if (!newCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    const newCategory: UserCategory = {
      id: `user-${Date.now()}`,
      name: newCategoryName.trim(),
      description: newCategoryDescription.trim() || 'Custom category',
      count: 0,
      color: CATEGORY_COLORS[userCategories.length % CATEGORY_COLORS.length],
    };

    if (isMounted.current) {
      setUserCategories(prev => [...prev, newCategory]);
      setNewCategoryName('');
      setNewCategoryDescription('');
      setShowAddModal(false);
    }
    
    Alert.alert('Success', `Category "${newCategory.name}" created successfully!`);
  }

  function handleDeleteCategory(categoryId: string) {
    const category = userCategories.find(cat => cat.id === categoryId);
    if (!category) return;

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (isMounted.current) {
              setUserCategories(prev => prev.filter(cat => cat.id !== categoryId));
            }
          },
        },
      ]
    );
  }

  function handleBackPress() {
    // Store current scroll position before going back
    if (isMounted.current) {
      setSelectedCategory(null);
    }
    // Scroll position will be restored when returning to main categories view
  }

  function handleCategorySelect(categoryId: string) {
    if (isMounted.current) {
      setSelectedCategory(categoryId);
    }
  }

  function handleScrollPositionChange(event: any) {
    if (!selectedCategory && isMounted.current) {
      setScrollPosition(event.nativeEvent.contentOffset.y);
    }
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
            onPress={handleBackPress}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#475569" strokeWidth={2} />
            <Text style={styles.backText}>Categories</Text>
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
          showsVerticalScrollIndicator={true}
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
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.7}
          >
            <Plus size={20} color="#6B7280" strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>Organize your notes intelligently</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onScroll={handleScrollPositionChange}
        scrollEventThrottle={16}
        contentOffset={{ x: 0, y: scrollPosition }}
        showsVerticalScrollIndicator={true}
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
                  onPress={() => handleCategorySelect(category.id)}
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
            <TouchableOpacity 
              style={styles.addNewButton}
              onPress={() => setShowAddModal(true)}
              activeOpacity={0.7}
            >
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
                  <TouchableOpacity 
                    style={styles.actionButton}
                    activeOpacity={0.7}
                  >
                    <Edit3 size={16} color="#6B7280" strokeWidth={2} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleDeleteCategory(category.id)}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={16} color="#DC2626" strokeWidth={2} />
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

      {/* Add Category Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowAddModal(false)}
              style={styles.modalCloseButton}
              activeOpacity={0.7}
            >
              <X size={24} color="#6B7280" strokeWidth={2} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add New Category</Text>
            <TouchableOpacity 
              onPress={handleAddCategory}
              style={styles.modalSaveButton}
              activeOpacity={0.7}
            >
              <Check size={24} color="#059669" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category Name</Text>
              <TextInput
                style={styles.textInput}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="Enter category name"
                placeholderTextColor="#9CA3AF"
                maxLength={50}
                autoFocus={true}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={newCategoryDescription}
                onChangeText={setNewCategoryDescription}
                placeholder="Enter a brief description"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </View>

            <View style={styles.colorPreview}>
              <Text style={styles.inputLabel}>Color Preview</Text>
              <View style={styles.colorPreviewContainer}>
                <View 
                  style={[
                    styles.colorSwatch, 
                    { backgroundColor: CATEGORY_COLORS[userCategories.length % CATEGORY_COLORS.length] }
                  ]} 
                />
                <Text style={styles.colorPreviewText}>
                  Your category will use this color
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
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
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
    gap: 6,
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  modalSaveButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 20,
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  colorPreview: {
    gap: 8,
  },
  colorPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  colorPreviewText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
});