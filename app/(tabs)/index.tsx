import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
// import { LinearGradient } from 'expo-linear-gradient'; // Commented out as not used
import { useNotesStore } from '@/lib/store';
import { getCurrentUser, signOut } from '@/lib/auth';
import { Brain, Plus, FileText, Link2, Image, LogOut } from 'lucide-react-native';
import { NoteCard } from '@/components/NoteCard';
import { theme } from '@/lib/theme';

export default function HomeScreen() {
  const { notes, loading, fetchNotes, error } = useNotesStore();
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    let cancelled = false;
    
    async function init() {
      try {
        // Check auth
        const { user } = await getCurrentUser();
        if (cancelled) return;
        
        if (!user) {
          router.replace('/auth/login');
          return;
        }
        
        setUser(user);
        setAuthChecking(false);
        
        // Animate content in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: theme.animation.duration.normal,
          useNativeDriver: true,
        }).start();
        
        // Fetch notes only after auth check
        await fetchNotes();
      } catch (error) {
        console.error('Initialization error:', error);
        if (!cancelled) {
          setAuthChecking(false);
        }
      }
    }
    
    init();
    
    return () => {
      cancelled = true;
    };
  }, [fadeAnim]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchNotes();
    } finally {
      setRefreshing(false);
    }
  }, [fetchNotes]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      router.replace('/auth/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, []);

  // Show loading screen while checking auth
  if (authChecking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Brain size={48} color={theme.colors.primary[600]} strokeWidth={1.5} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const recentNotes = notes.slice(0, 5);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary[600]}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Welcome back</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
            <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
              <LogOut size={22} color={theme.colors.text.secondary} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Capture</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/(tabs)/create')}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIcon, { backgroundColor: theme.colors.primary[50] }]}>
                  <FileText size={24} color={theme.colors.primary[600]} strokeWidth={1.5} />
                </View>
                <Text style={styles.actionTitle}>Text Note</Text>
                <Text style={styles.actionSubtitle}>Write or paste</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/(tabs)/create')}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIcon, { backgroundColor: theme.colors.success.light }]}>
                  <Link2 size={24} color={theme.colors.success.dark} strokeWidth={1.5} />
                </View>
                <Text style={styles.actionTitle}>Save URL</Text>
                <Text style={styles.actionSubtitle}>From the web</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push('/(tabs)/create')}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIcon, { backgroundColor: theme.colors.warning.light }]}>
                  <Image size={24} color={theme.colors.warning.dark} strokeWidth={1.5} />
                </View>
                <Text style={styles.actionTitle}>Add Media</Text>
                <Text style={styles.actionSubtitle}>Photo or file</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Notes */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Notes</Text>
              {notes.length > 0 && (
                <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
                  <Text style={styles.seeAllText}>See all</Text>
                </TouchableOpacity>
              )}
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {recentNotes.length > 0 ? (
              <View style={styles.notesContainer}>
                {recentNotes.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Brain size={48} color={theme.colors.neutral[300]} strokeWidth={1} />
                </View>
                <Text style={styles.emptyTitle}>No notes yet</Text>
                <Text style={styles.emptySubtitle}>
                  Create your first note and let AI organize it
                </Text>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => router.push('/(tabs)/create')}
                  activeOpacity={0.8}
                >
                  <Plus size={20} color={theme.colors.text.inverse} strokeWidth={2} />
                  <Text style={styles.createButtonText}>Create Note</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.primary[600],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  greeting: {
    fontSize: theme.typography.fontSize['3xl'],
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  userEmail: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
  },
  signOutButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
  },
  seeAllText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.primary[600],
  },
  quickActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    gap: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xs,
  },
  actionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
  },
  notesContainer: {
    gap: theme.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing['3xl'],
    gap: theme.spacing.md,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.neutral[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.primary,
  },
  emptySubtitle: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.relaxed,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    ...theme.shadows.md,
  },
  createButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.semiBold,
    color: theme.colors.text.inverse,
  },
  errorContainer: {
    backgroundColor: theme.colors.error.light,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.error.dark,
    textAlign: 'center',
  },
});