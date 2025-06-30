import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Chrome as Home, Search, Plus, FolderOpen, Grid2x2 } from 'lucide-react-native';
import { theme } from '@/lib/theme';
import { useNotesStore } from '@/lib/store';
import { useGuestMode } from '@/lib/guestContext';

type TabIconProps = {
  name: any;
  color: string;
  focused: boolean;
  label: string;
};

function TabIcon({ name: Icon, color, focused, label }: TabIconProps) {
  return (
    <View style={styles.tabIconContainer}>
      <Icon
        size={20}
        color={color}
        strokeWidth={focused ? 2 : 1.5}
      />
      {focused && (
        <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
          {label}
        </Text>
      )}
    </View>
  );
}

export default function TabLayout() {
  const { isGuestMode } = useNotesStore();
  const { guestUsage } = useGuestMode();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary[600],
        tabBarInactiveTintColor: theme.colors.text.tertiary,
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={Home} color={color} focused={focused} label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={Search} color={color} focused={focused} label="Explore" />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.createButton, focused && styles.createButtonActive]}>
              <Plus size={22} color={theme.colors.text.inverse} strokeWidth={2} />
            </View>
          ),
          tabBarAccessibilityLabel: 'Create New Note Tab',
          tabBarBadge: isGuestMode && guestUsage.notes >= guestUsage.maxNotes ? '!' : undefined,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categories',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={FolderOpen} color={color} focused={focused} label="Categories" />
          ),
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: 'Reminders',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={Grid2x2} color={color} focused={focused} label="Reminders" />
          ),
          tabBarAccessibilityLabel: 'Reminders Tab',
          tabBarBadge: isGuestMode && guestUsage.reminders >= guestUsage.maxReminders ? '!' : undefined,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    backgroundColor: theme.colors.background.primary,
    borderTopWidth: 0,
    height: 85,
    paddingBottom: 25,
    paddingTop: 8,
    ...theme.shadows.lg,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
  },
  tabBarItem: {
    paddingVertical: 0,
    height: 60,
    justifyContent: 'center',
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    width: 60,
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.medium,
    marginTop: 2,
    textAlign: 'center',
    position: 'absolute',
    bottom: 2,
    left: 0,
    right: 0,
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
  },
  createButtonActive: {
    backgroundColor: theme.colors.primary[700],
    transform: [{ scale: 1.05 }],
  },
});