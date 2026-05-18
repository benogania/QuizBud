import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useQuizStore } from '../store/useQuizStore'; 
import { 
  BookOpenIcon as LibraryIcon, 
  AcademicCapIcon, 
  ChartBarIcon, 
  Cog6ToothIcon, 
  SparklesIcon
} from 'react-native-heroicons/outline';
import { 
  BookOpenIcon as LibraryIconSolid, 
  AcademicCapIcon as AcademicCapIconSolid, 
  ChartBarIcon as ChartBarIconSolid, 
  Cog6ToothIcon as Cog6ToothIconSolid, 
  SparklesIcon as SparklesIconSolid
} from 'react-native-heroicons/solid';

import LibraryScreen from '../screens/LibraryScreen';
import LearnScreen from '../screens/LearnScreen'; 
import StatsScreen from '../screens/StatsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AIAssistantScreen from '../screens/AIAssistantScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { theme } = useQuizStore();
  const isDark = theme === 'dark';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
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
          } else if (route.name === 'Learn') { 
            return focused ? <AcademicCapIconSolid size={size} color={color} /> : <AcademicCapIcon size={size} color={color} />;
          } else if (route.name === 'Stats') {
            return focused ? <ChartBarIconSolid size={size} color={color} /> : <ChartBarIcon size={size} color={color} />;
          } else if (route.name === 'Settings') {
            return focused ? <Cog6ToothIconSolid size={size} color={color} /> : <Cog6ToothIcon size={size} color={color} />;
          } else if (route.name === 'AIChat') {
            return focused ? <SparklesIconSolid size={size} color={color} /> : <SparklesIcon size={size} color={color} />;
          }
        },
      })}
    >
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="Learn" component={LearnScreen} />
      <Tab.Screen name="AIChat" component={AIAssistantScreen} />
      <Tab.Screen name="Stats" component={StatsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}