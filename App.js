import React, { useEffect } from 'react';
import { StatusBar as RNStatusBar } from 'react-native'; // Import the manual API
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui'; 
import { useQuizStore } from './src/store/useQuizStore'; 

import TabNavigator from './src/navigation/TabNavigator';
import QuizPlayer from './src/screens/QuizPlayer'; 
import ActiveQuizScreen from './src/screens/ActiveQuizScreen'; 
import ResultsScreen from './src/screens/ResultsScreen'; 
import EditQuizScreen from './src/screens/EditQuizScreen'; 
import CreateQuizScreen from './src/screens/CreateQuizScreen';
import FlashcardScreen from './src/screens/FlashcardScreen';
import TimeAttackScreen from './src/screens/TimeAttackScreen';
import SurvivalModeScreen from './src/screens/SurvivalModeScreen';
import MatchMasterScreen from './src/screens/MatchMasterScreen';
import AIAssistantScreen from './src/screens/AIAssistantScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CollectionScreen from './src/screens/CollectionScreen';
import SpellingScreen from './src/screens/SpellingScreen';
import GrammarScreen from './src/screens/GrammarScreen';
import GrammarPracticeScreen from './src/screens/GrammarPracticeScreen';
import SpeakingScreen from './src/screens/SpeakingScreen';
import AllCollectionsScreen from './src/screens/AllCollectionsScreen';
import RecentActivityScreen from './src/screens/RecentActivityScreen';


// SplashScreen.preventAutoHideAsync();
const Stack = createNativeStackNavigator();

export default function App() {
  const { theme } = useQuizStore();
  const isDark = theme === 'dark';
  
  useEffect(() => {
    const configureSystemUI = async () => {
      try {
        // 1. Set the background of the actual Android Window
        await SystemUI.setBackgroundColorAsync(isDark ? '#0f172a' : '#ffffff');

        // 2. Control the STATUS BAR (Top Icons) manually
        // This changes the icons WITHOUT touching the layout/gap
        RNStatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');
        RNStatusBar.setTranslucent(true);
        RNStatusBar.setBackgroundColor('transparent');

        // 3. Control the NAVIGATION BAR (Bottom Buttons)
        await NavigationBar.setVisibilityAsync("hidden");
        await NavigationBar.setBehaviorAsync("overlay-swipe");
        
        // Ensure buttons are the right color if they are swiped up
        await NavigationBar.setBackgroundColorAsync(isDark ? '#0f172a' : '#ffffff');
        await NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark");
      } catch (e) {
        console.warn("System UI Configuration Error:", e);
      }
    };

    configureSystemUI();
  }, [isDark]); // Re-runs instantly when you toggle the theme

  // Define a theme that explicitly removes background colors that might flash white
  const customTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: isDark ? '#0f172a' : '#ffffff',
      card: isDark ? '#0f172a' : '#ffffff',
    },
  };

  return (
    <SafeAreaProvider>
    <NavigationContainer theme={customTheme} initialRouteName="Splash" 
  screenOptions={{ headerShown: false }}>
      
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          contentStyle: { backgroundColor: isDark ? '#0f172a' : '#ffffff' } 
        }}
      >
        {/* <Stack.Screen name="Splash" component={CustomSplashScreen} /> */}
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen name="QuizPlayer" component={QuizPlayer} />
        <Stack.Screen name="ActiveQuiz" component={ActiveQuizScreen} />
        <Stack.Screen name="Results" component={ResultsScreen} />
        <Stack.Screen name="EditQuiz" component={EditQuizScreen} />
        <Stack.Screen name="CreateQuiz" component={CreateQuizScreen} />
        <Stack.Screen name="AIAssistant" component={AIAssistantScreen} />
        <Stack.Screen name="CollectionScreen" component={CollectionScreen} />
        <Stack.Screen name="GrammarScreen" component={GrammarScreen} />
        <Stack.Screen name="GrammarPracticeScreen" component={GrammarPracticeScreen} />
        <Stack.Screen name="SpeakingScreen" component={SpeakingScreen} />
        <Stack.Screen name="AllCollectionsScreen" component={AllCollectionsScreen} />
        <Stack.Screen name="RecentActivityScreen" component={RecentActivityScreen} />

        <Stack.Screen name="Flashcards" component={FlashcardScreen} />
        <Stack.Screen name="TimeAttack" component={TimeAttackScreen} />
        <Stack.Screen name="SurvivalMode" component={SurvivalModeScreen} />
        <Stack.Screen name="MatchMaster" component={MatchMasterScreen} />
        <Stack.Screen name="SpellingScreen" component={SpellingScreen} />
        {/* <Stack.Screen name="QuizPreview" component={QuizPreviewScreen} /> */}


      </Stack.Navigator>
    </NavigationContainer>
    </SafeAreaProvider>
  );
}