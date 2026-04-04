import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useQuizStore } from '../store/useQuizStore'; // Import the store
import { 
  BookOpenIcon as LibraryIcon, 
  PlayIcon, 
  ChartBarIcon, 
  Cog6ToothIcon 
} from 'react-native-heroicons/outline';
import { 
  BookOpenIcon as LibraryIconSolid, 
  PlayIcon as PlayIconSolid, 
  ChartBarIcon as ChartBarIconSolid, 
  Cog6ToothIcon as Cog6ToothIconSolid 
} from 'react-native-heroicons/solid';

// Import your tab screens
import LibraryScreen from '../screens/LibraryScreen';
import PlayScreen from '../screens/PlayScreen';
import StatsScreen from '../screens/StatsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  // Pull the theme from your store
  const { theme } = useQuizStore();
  const isDark = theme === 'dark';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        // DYNAMIC COLORS based on theme
        tabBarStyle: {
          backgroundColor: isDark ? '#0f172a' : '#ffffff', 
          borderTopWidth: isDark ? 0 : 1,
          borderTopColor: isDark ? 'transparent' : '#e2e8f0',
          height: 70,
          paddingBottom: 12,
          elevation: 0,
        },
        tabBarActiveTintColor: isDark ? '#818cf8' : '#4f46e5',
        tabBarInactiveTintColor: isDark ? '#9ca3af' : '#64748b',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Library') {
            return focused ? <LibraryIconSolid size={size} color={color} /> : <LibraryIcon size={size} color={color} />;
          } else if (route.name === 'Play') {
            return focused ? <PlayIconSolid size={size} color={color} /> : <PlayIcon size={size} color={color} />;
          } else if (route.name === 'Stats') {
            return focused ? <ChartBarIconSolid size={size} color={color} /> : <ChartBarIcon size={size} color={color} />;
          } else if (route.name === 'Settings') {
            return focused ? <Cog6ToothIconSolid size={size} color={color} /> : <Cog6ToothIcon size={size} color={color} />;
          }
        },
      })}
    >
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="Play" component={PlayScreen} />
      <Tab.Screen name="Stats" component={StatsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}