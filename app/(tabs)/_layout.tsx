import { Tabs } from 'expo-router';
import { Chrome as Home, Search, Bell, Plus, FolderOpen } from 'lucide-react-native';
import { Platform, Dimensions } from 'react-native';

const { height: screenHeight } = Dimensions.get('window');

// Calculate appropriate bottom padding based on device
const getBottomPadding = () => {
  if (Platform.OS === 'ios') {
    return 20; // iOS safe area
  }
  
  // Android - more generous padding for Galaxy Note 9 and similar devices
  if (screenHeight > 800) {
    return 20; // Larger Android devices
  } else if (screenHeight > 700) {
    return 18; // Medium Android devices (like Galaxy Note 9) - increased
  } else {
    return 16; // Smaller Android devices
  }
};

const getTabBarHeight = () => {
  if (Platform.OS === 'ios') {
    return 88;
  }
  
  // Android - much more generous height for better text visibility
  if (screenHeight > 800) {
    return 84;
  } else if (screenHeight > 700) {
    return 80; // Galaxy Note 9 and similar - significantly increased
  } else {
    return 76;
  }
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#E5E7EB',
          paddingBottom: getBottomPadding(),
          paddingTop: 20, // Increased top padding for better text visibility
          height: getTabBarHeight(),
          borderTopWidth: 1,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          // Ensure proper spacing from screen edges
          marginHorizontal: 0,
          paddingHorizontal: 12, // Increased horizontal padding
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter-Medium',
          fontSize: 13, // Slightly larger font
          marginTop: 8, // More spacing between icon and label
          marginBottom: 4, // Bottom margin for text
          lineHeight: 16, // Explicit line height
        },
        tabBarIconStyle: {
          marginTop: 8, // More top margin for icons
          marginBottom: 2, // Small bottom margin
        },
        // Improve touch area and text positioning
        tabBarItemStyle: {
          paddingVertical: 6, // Increased vertical padding
          paddingHorizontal: 4, // Horizontal padding for touch area
          justifyContent: 'center',
          alignItems: 'center',
        },
        // Better active indicator
        tabBarIndicatorStyle: {
          backgroundColor: '#2563EB',
          height: 3,
        },
        // Ensure labels are always visible
        tabBarLabelPosition: 'below-icon',
        tabBarAllowFontScaling: false, // Prevent system font scaling issues
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => (
            <Home size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Notes',
          tabBarIcon: ({ size, color }) => (
            <Search size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categories',
          tabBarIcon: ({ size, color }) => (
            <FolderOpen size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ size, color }) => (
            <Plus size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: 'Reminders',
          tabBarIcon: ({ size, color }) => (
            <Bell size={size} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}