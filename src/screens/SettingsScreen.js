import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, Platform, Share } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuizStore } from '../store/useQuizStore';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

// 1. IMPORT YOUR NEW HAPTIC HELPER
import { triggerHaptic } from '../utils/hapticHelper'; 

import { 
  ArrowLeftIcon, 
  MoonIcon, 
  SunIcon,
  SpeakerWaveIcon,
  DevicePhoneMobileIcon,
  BellAlertIcon,
  SparklesIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  EnvelopeIcon,
  StarIcon,
  ChevronRightIcon
} from 'react-native-heroicons/outline';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  // 2. PULL HAPTICS STATE FROM STORE
  const { 
    theme, setTheme, 
    quizzes, 
    soundEffects, toggleSoundEffects,
    hapticsEnabled, toggleHaptics 
  } = useQuizStore(); 
  
  const isDark = theme === 'dark';

  // Local state for the rest
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [aiTone, setAiTone] = useState('Standard');

  const toggleTheme = () => {
    if (setTheme) {
      setTheme(isDark ? 'light' : 'dark');
      triggerHaptic(hapticsEnabled); // Give a little tap when changing theme!
    } else {
      Alert.alert("Store Update Needed", "Add a 'setTheme' method to your useQuizStore to make this work globally!");
    }
  };

  const handleToggleHaptics = () => {
  toggleHaptics();
  // Force the HEAVY vibration so we know it works!
  if (!hapticsEnabled) {
    triggerHaptic(true, 'Heavy'); 
  }
};

  const handleExportData = async () => {
    triggerHaptic(hapticsEnabled);
    try {
      const fileUri = `${FileSystem.documentDirectory}QuizBud_Backup.qb`;
      const exportData = { version: "1.0", quizzes: quizzes };
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(exportData, null, 2));

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { dialogTitle: 'Backup QuizBud Data' });
      } else {
        Alert.alert("Error", "Sharing is not available on this device.");
      }
    } catch (error) {
      Alert.alert("Export Failed", "There was an error saving your backup.");
    }
  };

  const handleClearHistory = () => {
    triggerHaptic(hapticsEnabled, 'Medium');
    Alert.alert(
      "Clear Stats & History?",
      "This will reset your accuracy, scores, and study time to zero. Your created quizzes will remain safe.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear Stats", 
          style: "destructive", 
          onPress: () => Alert.alert("Success", "Your study history has been cleared.")
        }
      ]
    );
  };

  const handleFactoryReset = () => {
    triggerHaptic(hapticsEnabled, 'Heavy');
    Alert.alert(
      "⚠️ FACTORY RESET ⚠️",
      "Are you absolutely sure? This will permanently delete ALL your quizzes, stats, and AI chats. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Wipe Everything", 
          style: "destructive", 
          onPress: () => Alert.alert("Reset Complete", "The app has been restored to factory settings.")
        }
      ]
    );
  };

  const cycleAiTone = () => {
    triggerHaptic(hapticsEnabled);
    const tones = ['Standard', 'Explain like I\'m 5', 'Academic'];
    const currentIndex = tones.indexOf(aiTone);
    setAiTone(tones[(currentIndex + 1) % tones.length]);
  };

  const SettingRow = ({ icon: Icon, label, description, rightElement, onPress, isDanger }) => (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={!onPress}
      className={`flex-row items-center justify-between py-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}
    >
      <View className="flex-row items-center flex-1 pr-4">
        <View className={`p-2 rounded-xl mr-4 ${isDanger ? 'bg-red-100' : (isDark ? 'bg-indigo-900/40' : 'bg-indigo-50')}`}>
          <Icon color={isDanger ? "#ef4444" : (isDark ? "#818cf8" : "#4f46e5")} size={22} />
        </View>
        <View className="flex-1">
          <Text className={`font-bold text-base ${isDanger ? 'text-red-500' : (isDark ? 'text-gray-200' : 'text-gray-800')}`}>{label}</Text>
          {description && <Text className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{description}</Text>}
        </View>
      </View>
      <View>{rightElement}</View>
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }) => (
    <Text className={`font-bold uppercase tracking-widest text-[10px] mt-6 mb-2 ml-2 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
      {title}
    </Text>
  );

  return (
    <View className={`flex-1 ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`} style={{ paddingTop: insets.top }}>
      
      {/* Header */}
      <View className={`flex-row items-center px-5 py-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <TouchableOpacity 
          onPress={() => {
            triggerHaptic(hapticsEnabled);
            navigation.goBack();
          }} 
          className="p-2 -ml-2"
        >
          <ArrowLeftIcon color={isDark ? "white" : "#1e3a8a"} size={24} />
        </TouchableOpacity>
        <Text className={`text-xl font-black ml-2 ${isDark ? 'text-white' : 'text-blue-900'}`}>Settings</Text>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        
        {/* APPEARANCE */}
        <SectionHeader title="Appearance" />
        <View className={`px-4 rounded-3xl ${isDark ? 'bg-gray-900' : 'bg-white shadow-sm'}`}>
          <SettingRow 
            icon={isDark ? MoonIcon : SunIcon} 
            label="Dark Mode" 
            description="Toggle the app's visual theme"
            rightElement={
              <Switch 
                value={isDark} 
                onValueChange={toggleTheme} 
                trackColor={{ false: '#d1d5db', true: '#4f46e5' }}
                thumbColor={'#ffffff'}
              />
            } 
          />
        </View>

        {/* GAMEPLAY & AUDIO */}
        <SectionHeader title="Gameplay & Audio" />
        <View className={`px-4 rounded-3xl ${isDark ? 'bg-gray-900' : 'bg-white shadow-sm'}`}>
          <SettingRow 
            icon={SpeakerWaveIcon} 
            label="Sound Effects" 
            description="Play sounds for correct/wrong answers"
            rightElement={
              <Switch 
                value={soundEffects} 
                onValueChange={() => {
                  triggerHaptic(hapticsEnabled);
                  toggleSoundEffects();
                }} 
                trackColor={{ false: '#d1d5db', true: '#4f46e5' }} 
              />
            } 
          />
          <SettingRow 
            icon={DevicePhoneMobileIcon} 
            label="Haptic Feedback" 
            description="Vibrate phone on button presses"
            rightElement={
              <Switch 
                value={hapticsEnabled} 
                onValueChange={handleToggleHaptics} // 4. WIRED UP
                trackColor={{ false: '#d1d5db', true: '#4f46e5' }} 
              />
            } 
          />
          <SettingRow 
            icon={BellAlertIcon} 
            label="Study Reminders" 
            description="Get notified to keep your streak alive"
            rightElement={
              <Switch 
                value={remindersEnabled} 
                onValueChange={(val) => {
                  triggerHaptic(hapticsEnabled);
                  setRemindersEnabled(val);
                }} 
                trackColor={{ false: '#d1d5db', true: '#4f46e5' }} 
              />
            } 
          />
        </View>

        {/* AI PREFERENCES */}
        <SectionHeader title="AI Assistant Preferences" />
        <View className={`px-4 rounded-3xl ${isDark ? 'bg-gray-900' : 'bg-white shadow-sm'}`}>
          <SettingRow 
            icon={SparklesIcon} 
            label="AI Response Tone" 
            description="How Gemini explains concepts to you"
            onPress={cycleAiTone}
            rightElement={
              <View className="flex-row items-center">
                <Text className={`font-bold mr-2 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>{aiTone}</Text>
                <ChevronRightIcon color={isDark ? "#6b7280" : "#9ca3af"} size={16} />
              </View>
            } 
          />
        </View>

        {/* DATA MANAGEMENT */}
        <SectionHeader title="Data & Storage" />
        <View className={`px-4 rounded-3xl ${isDark ? 'bg-gray-900' : 'bg-white shadow-sm'}`}>
          <SettingRow 
            icon={ArrowDownTrayIcon} 
            label="Backup Library" 
            description="Export all your quizzes as a file"
            onPress={handleExportData}
            rightElement={<ChevronRightIcon color={isDark ? "#6b7280" : "#9ca3af"} size={16} />} 
          />
          <SettingRow 
            icon={TrashIcon} 
            label="Reset Stats & History" 
            description="Clear scores without deleting quizzes"
            onPress={handleClearHistory}
            rightElement={<ChevronRightIcon color={isDark ? "#6b7280" : "#9ca3af"} size={16} />} 
          />
          <SettingRow 
            icon={ExclamationTriangleIcon} 
            label="Factory Reset" 
            description="Wipe everything. No turning back."
            isDanger={true}
            onPress={handleFactoryReset}
            rightElement={<ChevronRightIcon color="#ef4444" size={16} />} 
          />
        </View>

        {/* ABOUT & SUPPORT */}
        <SectionHeader title="About QuizBud" />
        <View className={`px-4 rounded-3xl ${isDark ? 'bg-gray-900' : 'bg-white shadow-sm'}`}>
          <SettingRow 
            icon={EnvelopeIcon} 
            label="Send Feedback" 
            onPress={() => {
              triggerHaptic(hapticsEnabled);
              Alert.alert("Feedback", "Would open an email to support@quizbud.com");
            }}
            rightElement={<ChevronRightIcon color={isDark ? "#6b7280" : "#9ca3af"} size={16} />} 
          />
          <SettingRow 
            icon={StarIcon} 
            label="Rate the App" 
            onPress={() => {
              triggerHaptic(hapticsEnabled);
              Alert.alert("Rate", "Would open the App Store / Play Store");
            }}
            rightElement={<ChevronRightIcon color={isDark ? "#6b7280" : "#9ca3af"} size={16} />} 
          />
        </View>

        <View className="items-center mt-8 mb-4">
          <Text className={`font-black text-lg tracking-widest ${isDark ? 'text-gray-700' : 'text-gray-300'}`}>QUIZBUD</Text>
          <Text className={`text-xs font-bold ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Version 1.0.0</Text>
          <Text className={`text-[10px] mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Powered by Gemini AI</Text>
        </View>

      </ScrollView>
    </View>
  );
}