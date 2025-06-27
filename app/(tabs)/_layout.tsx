import { Tabs } from 'expo-router';
import { Home, Search, Bell, Plus, FolderOpen, Settings } from 'lucide-react-native';
import { Platform, Dimensions } from 'react-native';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

// Enhanced styling configuration
const TAB_CONFIG = {
  colors: {
    primary: '#3B82F6', // Modern blue
    primaryDark: '#1E40AF',
    secondary: '#6B7280',
    background: '#FFFFFF',
    border: '#F3F4F6',
    shadow: '#000000',
    inactive: '#9CA3AF',
  },
  spacing: {
    horizontal: 16,
    vertical: 8,
    iconLabel: 4,
  },
  borderRadius: 16,
  elevation: 8,
};

// Simplified responsive calculations
const getTabBarHeight = () => {
  if (Platform.OS === 'ios') {
    return screenHeight > 800 ? 90 : 85;
  }
  return screenHeight > 700 ? 75 : 70;
};

const getSafeAreaPadding = () => {
  if (Platform.OS === 'ios') {
    return screenHeight > 800 ? 25 : 20; // Handle different iPhone sizes
  }
  return 16; // Android
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: TAB_CONFIG.colors.primary,
        tabBarInactiveTintColor: TAB_CONFIG.colors.inactive,
        tabBarStyle: {
          backgroundColor: TAB_CONFIG.colors.background,
          borderTopColor: TAB_CONFIG.colors.border,
          borderTopWidth: 0.5,
          paddingBottom: getSafeAreaPadding(),
          paddingTop: TAB_CONFIG.spacing.vertical + 4,
          height: getTabBarHeight(),
          paddingHorizontal: TAB_CONFIG.spacing.horizontal,

          // Modern shadow and elevation
          ...Platform.select({
            ios: {
              shadowColor: TAB_CONFIG.colors.shadow,
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
            },
            android: {
              elevation: TAB_CONFIG.elevation,
            },
          }),

          // Subtle border radius for modern look
          borderTopLeftRadius: TAB_CONFIG.borderRadius,
          borderTopRightRadius: TAB_CONFIG.borderRadius,
        },

        tabBarLabelStyle: {
          fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto-Medium',
          fontSize: 11,
          fontWeight: '600',
          marginTop: TAB_CONFIG.spacing.iconLabel,
          marginBottom: 2,
          letterSpacing: 0.3,
        },

        tabBarIconStyle: {
          marginTop: 2,
          marginBottom: 0,
        },

        tabBarItemStyle: {
          paddingVertical: TAB_CONFIG.spacing.vertical,
          paddingHorizontal: 4,
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: 12,
          marginHorizontal: 2,
          // Add subtle background for active state
          backgroundColor: 'transparent',
        },

        // Enhanced accessibility
        tabBarAccessibilityLabel: 'Navigation Tabs',
        tabBarAllowFontScaling: false,
        tabBarHideOnKeyboard: Platform.OS === 'android',

        // Better label positioning
        tabBarLabelPosition: 'below-icon',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color, focused }) => (
            <Home
              size={focused ? size + 2 : size}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
              fill={focused ? `${color}20` : 'transparent'}
            />
          ),
          tabBarAccessibilityLabel: 'Home Tab',
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ size, color, focused }) => (
            <Search
              size={focused ? size + 2 : size}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
              fill={focused ? `${color}20` : 'transparent'}
            />
          ),
          tabBarAccessibilityLabel: 'Explore Notes Tab',
        }}
      />

      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ size, color, focused }) => (
            <Plus
              size={focused ? size + 3 : size + 1}
              color={focused ? TAB_CONFIG.colors.primaryDark : color}
              strokeWidth={focused ? 3 : 2.5}
              style={{
                backgroundColor: focused
                  ? `${TAB_CONFIG.colors.primary}15`
                  : 'transparent',
                borderRadius: 8,
                padding: 2,
              }}
            />
          ),
          tabBarAccessibilityLabel: 'Create New Note Tab',
        }}
      />

      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categories',
          tabBarIcon: ({ size, color, focused }) => (
            <FolderOpen
              size={focused ? size + 2 : size}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
              fill={focused ? `${color}20` : 'transparent'}
            />
          ),
          tabBarAccessibilityLabel: 'Categories Tab',
        }}
      />

      <Tabs.Screen
        name="reminders"
        options={{
          title: 'Reminders',
          tabBarIcon: ({ size, color, focused }) => (
            <Bell
              size={focused ? size + 2 : size}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
              fill={focused ? `${color}20` : 'transparent'}
            />
          ),
          tabBarAccessibilityLabel: 'Reminders Tab',
          tabBarBadge: undefined, // Can be used for notification count
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ size, color, focused }) => (
            <Settings
              size={focused ? size + 2 : size}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
              fill={focused ? `${color}20` : 'transparent'}
            />
          ),
          tabBarAccessibilityLabel: 'Notification Settings Tab',
        }}
      />
    </Tabs>
  );
}