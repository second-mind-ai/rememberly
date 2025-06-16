import { Tabs } from 'expo-router';
import { Chrome as Home, Search, Bell, Plus, FolderOpen } from 'lucide-react-native';
import { Platform, Dimensions } from 'react-native';

const { height: screenHeight } = Dimensions.get('window');

// Calculate appropriate bottom padding based on device
const getBottomPadding = () => {
  if (Platform.OS === 'ios') {
    return 20; // iOS safe area
  }
  
  // Android - proper bottom padding for gesture navigation
  if (screenHeight > 800) {
    return 24; // Larger Android devices
  } else if (screenHeight > 700) {
    return 22; // Medium Android devices (like Galaxy Note 9) - increased for gestures
  } else {
    return 20; // Smaller Android devices
  }
};

const getTabBarHeight = () => {
  if (Platform.OS === 'ios') {
    return 88;
  }
  
  // Android - balanced height for proper text display
  if (screenHeight > 800) {
    return 76;
  } else if (screenHeight > 700) {
    return 74; // Galaxy Note 9 - balanced for text visibility
  } else {
    return 72;
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
          paddingTop: 12, // Reduced top padding to give more space for text
          height: getTabBarHeight(),
          borderTopWidth: 1,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          // Ensure proper spacing from screen edges
          marginHorizontal: 0,
          paddingHorizontal: 8, // Reduced horizontal padding
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter-Medium',
          fontSize: 12, // Standard font size
          marginTop: 4, // Reduced spacing between icon and label
          marginBottom: 2, // Small bottom margin for text
          lineHeight: 14, // Tighter line height
        },
        tabBarIconStyle: {
          marginTop: 4, // Reduced top margin for icons
          marginBottom: 0, // No bottom margin
        },
        // Improve touch area and text positioning
        tabBarItemStyle: {
          paddingVertical: 4, // Reduced vertical padding
          paddingHorizontal: 2, // Minimal horizontal padding
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1,
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