import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { useQuizStore } from '../store/useQuizStore';
// 1. Import the splash screen controller here too
import * as SplashScreen from 'expo-splash-screen'; 

export default function CustomSplashScreen({ navigation }) {
  const { theme } = useQuizStore();
  const isDark = theme === 'dark';

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // 2. THE MAGIC TRICK: Hide the native splash screen immediately!
    SplashScreen.hideAsync();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 20,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      navigation.replace('MainTabs'); 
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigation, fadeAnim, scaleAnim]);

  return (
    <View className={`flex-1 justify-center items-center ${isDark ? 'bg-[]' : 'bg-white'}`}>
      <Animated.Image 
        source={
          isDark 
            ? require('../../assets/splash-icon.png') 
            : require('../../assets/splash-icon.png') 
        } 
        style={{ 
          width: '80%', 
          height: '80%',
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }}
        resizeMode="contain"
      />
    </View>
  );
}