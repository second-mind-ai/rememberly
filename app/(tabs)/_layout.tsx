import { Tabs } from 'expo-router';
import { Chrome as Home, Search, Bell, Plus, FolderOpen } from 'lucide-react-native';
import { Platform, Dimensions } from 'react-native';

const { height: screenHeight } = Dimensions.get('window');

// Calculate appropriate bottom padding based on device
const getBottomPadding = () => {
  if (Platform.OS === 'ios') {
    return 20; // iOS safe area
  }
  
  // Android - adjust based on screen height for better compatibility
  if (screenHeight > 800) {
    return 16; // Larger Android devices
  } else if (screenHeight > 700) {
    return 14; // Medium Android devices (like Galaxy Note 9)
  } else {
    return 12; // Smaller Android devices
  }
};

const getTabBarHeight = () => {
  if (Platform.OS === 'ios') {
    return 88;
  }
  
  // Android - more generous height for better touch targets
  if (screenHeight > 800) {
    return 76;
  } else if (screenHeight > 700) {
    return 72; // Galaxy Note 9 and similar
  } else {
    return 68;
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
          paddingTop: 16, // Increased top padding
          height: getTabBarHeight(),
          borderTopWidth: 1,
          elevation: 12, // Increased elevation for Android
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          // Ensure proper spacing from screen edges
          marginHorizontal: 0,
          paddingHorizontal: 8, // Add horizontal padding
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter-Medium',
          fontSize: 12,
          marginTop: 6, // Increased spacing between icon and label
          marginBottom: 2,
        },
        tabBarIconStyle: {
          marginTop: 6, // Increased top margin for icons
        },
        // Improve touch area
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        // Better active indicator
        tabBarIndicatorStyle: {
          backgroundColor: '#2563EB',
          height: 3,
        },
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