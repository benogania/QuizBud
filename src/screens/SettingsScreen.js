import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Platform, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuizStore } from '../store/useQuizStore';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker'; // <-- NEW: For importing backups
import * as Notifications from 'expo-notifications'; 

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
  ArrowUpTrayIcon, // <-- NEW: Import Icon
  TrashIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon
} from 'react-native-heroicons/outline';
import { CheckCircleIcon } from 'react-native-heroicons/solid';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function SettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  // 🚨 PULL NEW FUNCTIONS FROM GLOBAL STORE 🚨
  const { 
    theme, setTheme, 
    quizzes, 
    soundEffects, toggleSoundEffects,
    hapticsEnabled, toggleHaptics,
    aiTone, setAiTone,
    clearHistory,  
    factoryReset,
    importQuizzes // <-- Make sure to pull this!
  } = useQuizStore(); 
  
  const isDark = theme === 'dark';

  const [remindersEnabled, setRemindersEnabled] = useState(false);

  // --- MODERN MODAL STATE ---
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    type: 'info', // 'info', 'success', 'danger'
    title: '',
    message: '',
    confirmText: 'OK',
    onConfirm: null,
    showCancel: false
  });

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, visible: false }));
  };

  const showModal = (config) => {
    setModalConfig({ ...config, visible: true });
  };

  useEffect(() => {
    const checkNotificationStatus = async () => {
      try {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        setRemindersEnabled(scheduled.length > 0);
      } catch (error) {
        setRemindersEnabled(false);
      }
    };
    checkNotificationStatus();
  }, []);

  const handleToggleReminders = async (value) => {
    triggerHaptic(hapticsEnabled);
    if (value) {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          showModal({
            type: 'danger',
            title: 'Permission Denied',
            message: 'Please enable notifications in your device settings to receive study reminders.',
            confirmText: 'Got it'
          });
          setRemindersEnabled(false);
          return;
        }

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }

        await Notifications.scheduleNotificationAsync({
          content: { 
            title: "🧠 Time to study!", 
            body: "Keep your streak alive. Review a quiz today to keep your mind sharp!", 
            sound: true 
          },
          trigger: { hour: 20, minute: 0, repeats: true },
        });
        setRemindersEnabled(true);
        showModal({
          type: 'success',
          title: 'Reminders Set',
          message: 'You will now receive a daily study reminder at 8:00 PM.',
          confirmText: 'Awesome'
        });
      } catch (error) {
        showModal({
          type: 'danger',
          title: 'Error',
          message: 'Could not schedule the reminder. Please ensure notifications are allowed for this app in your phone settings.',
          confirmText: 'OK'
        });
        setRemindersEnabled(false); 
      }
    } else {
      try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        setRemindersEnabled(false);
      } catch (error) {
        setRemindersEnabled(false);
      }
    }
  };

  const toggleTheme = () => {
    if (setTheme) {
      setTheme(isDark ? 'light' : 'dark');
      triggerHaptic(hapticsEnabled); 
    }
  };

  const handleToggleHaptics = () => {
    toggleHaptics();
    if (!hapticsEnabled) triggerHaptic(true, 'Heavy'); 
  };

  // --- DATA MANAGEMENT ---

  const handleExportData = async () => {
    triggerHaptic(hapticsEnabled);
    try {
      const fileUri = `${FileSystem.documentDirectory}QuizBud_Backup.qb`;
      const exportData = { version: "1.0", quizzes: quizzes };
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(exportData, null, 2));
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { dialogTitle: 'Backup QuizBud Data' });
      } else {
        showModal({ type: 'danger', title: 'Error', message: 'Sharing is not available on this device.', confirmText: 'OK' });
      }
    } catch (error) {
      showModal({ type: 'danger', title: 'Export Failed', message: 'There was an error saving your backup.', confirmText: 'OK' });
    }
  };

  // NEW: IMPORT DATA LOGIC
  const handleImportData = async () => {
    triggerHaptic(hapticsEnabled);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Allows any file type, we will check the contents
        copyToCacheDirectory: true
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      const fileContent = await FileSystem.readAsStringAsync(file.uri);
      const parsedData = JSON.parse(fileContent);

      if (parsedData.quizzes && Array.isArray(parsedData.quizzes)) {
        importQuizzes(parsedData.quizzes); // Calls the new store function!
        showModal({
          type: 'success',
          title: 'Import Successful',
          message: `Successfully restored ${parsedData.quizzes.length} quizzes to your library!`,
          confirmText: 'Awesome'
        });
      } else {
        throw new Error("Invalid Format");
      }
    } catch (error) {
      showModal({
        type: 'danger',
        title: 'Import Failed',
        message: 'The file you selected is not a valid QuizBud backup file. Ensure it is a .qb or .json file.',
        confirmText: 'OK'
      });
    }
  };

  const handleClearHistory = () => {
    triggerHaptic(hapticsEnabled, 'Medium');
    showModal({
      type: 'danger',
      title: 'Clear Stats & History?',
      message: 'This will reset your accuracy, scores, and study time to zero. Your created quizzes will remain safe.',
      showCancel: true,
      confirmText: 'Clear Stats',
      onConfirm: () => {
        if(clearHistory) clearHistory(); // Actually wipes it now
        triggerHaptic(hapticsEnabled, 'Success');
        setTimeout(() => {
          showModal({ type: 'success', title: 'Success', message: 'Your study history has been cleared.', confirmText: 'Done' });
        }, 500); 
      }
    });
  };

  const handleFactoryReset = () => {
    triggerHaptic(hapticsEnabled, 'Heavy');
    showModal({
      type: 'danger',
      title: '⚠️ FACTORY RESET ⚠️',
      message: 'Are you absolutely sure? This will permanently delete ALL your quizzes, stats, and AI chats. This cannot be undone.',
      showCancel: true,
      confirmText: 'Wipe Everything',
      onConfirm: () => {
        if(factoryReset) factoryReset(); // Actually wipes it now
        triggerHaptic(hapticsEnabled, 'Heavy');
        setTimeout(() => {
          showModal({ type: 'success', title: 'Reset Complete', message: 'The app has been restored to factory settings.', confirmText: 'OK' });
        }, 500);
      }
    });
  };

  const cycleAiTone = () => {
    triggerHaptic(hapticsEnabled);
    const tones = ['Standard', 'Explain like I\'m 5', 'Academic'];
    const currentIndex = tones.indexOf(aiTone || 'Standard');
    setAiTone(tones[(currentIndex + 1) % tones.length]);
  };

  const SettingRow = ({ icon: Icon, label, description, rightElement, onPress, isDanger }) => (
    <TouchableOpacity onPress={onPress} disabled={!onPress} className={`flex-row items-center justify-between py-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
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
    <Text className={`font-bold uppercase tracking-widest text-[10px] mt-6 mb-2 ml-2 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{title}</Text>
  );

  return (
    <View className={`flex-1 ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`} style={{ paddingTop: insets.top }}>
      
      <View className={`flex-row items-center px-5 py-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <TouchableOpacity onPress={() => { triggerHaptic(hapticsEnabled); navigation.goBack(); }} className="p-2 -ml-2">
          <ArrowLeftIcon color={isDark ? "white" : "#1e3a8a"} size={24} />
        </TouchableOpacity>
        <Text className={`text-xl font-black ml-2 ${isDark ? 'text-white' : 'text-blue-900'}`}>Settings</Text>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        
        <SectionHeader title="Appearance" />
        <View className={`px-4 rounded-3xl ${isDark ? 'bg-gray-900' : 'bg-white shadow-sm'}`}>
          <SettingRow icon={isDark ? MoonIcon : SunIcon} label="Dark Mode" description="Toggle the app's visual theme" rightElement={<Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: '#d1d5db', true: '#4f46e5' }} thumbColor={'#ffffff'}/>} />
        </View>

        <SectionHeader title="Gameplay & Audio" />
        <View className={`px-4 rounded-3xl ${isDark ? 'bg-gray-900' : 'bg-white shadow-sm'}`}>
          <SettingRow icon={SpeakerWaveIcon} label="Sound Effects" description="Play sounds for correct/wrong answers" rightElement={<Switch value={soundEffects} onValueChange={() => { triggerHaptic(hapticsEnabled); toggleSoundEffects(); }} trackColor={{ false: '#d1d5db', true: '#4f46e5' }} thumbColor={'#ffffff'}/>} />
          <SettingRow icon={DevicePhoneMobileIcon} label="Haptic Feedback" description="Vibrate phone on button presses" rightElement={<Switch value={hapticsEnabled} onValueChange={handleToggleHaptics} trackColor={{ false: '#d1d5db', true: '#4f46e5' }} thumbColor={'#ffffff'}/>} />
          <SettingRow icon={BellAlertIcon} label="Study Reminders" description="Get notified to keep your streak alive" rightElement={<Switch value={remindersEnabled} onValueChange={handleToggleReminders} trackColor={{ false: '#d1d5db', true: '#4f46e5' }} thumbColor={'#ffffff'}/>} />
        </View>

        <SectionHeader title="AI Assistant Preferences" />
        <View className={`px-4 rounded-3xl ${isDark ? 'bg-gray-900' : 'bg-white shadow-sm'}`}>
          <SettingRow 
            icon={SparklesIcon} 
            label="AI Response Tone" 
            description="How Gemini explains concepts to you"
            onPress={cycleAiTone}
            rightElement={
              <View className="flex-row items-center">
                <Text className={`font-bold mr-2 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>{aiTone || 'Standard'}</Text>
                <ChevronRightIcon color={isDark ? "#6b7280" : "#9ca3af"} size={16} />
              </View>
            } 
          />
        </View>

        <SectionHeader title="Data & Storage" />
        <View className={`px-4 rounded-3xl ${isDark ? 'bg-gray-900' : 'bg-white shadow-sm'}`}>
          <SettingRow icon={ArrowDownTrayIcon} label="Backup Library" description="Export all your quizzes as a file" onPress={handleExportData} rightElement={<ChevronRightIcon color={isDark ? "#6b7280" : "#9ca3af"} size={16} />} />
          <SettingRow icon={ArrowUpTrayIcon} label="Restore Library" description="Import quizzes from a backup file" onPress={handleImportData} rightElement={<ChevronRightIcon color={isDark ? "#6b7280" : "#9ca3af"} size={16} />} />
          <SettingRow icon={TrashIcon} label="Reset Stats & History" description="Clear scores without deleting quizzes" onPress={handleClearHistory} rightElement={<ChevronRightIcon color={isDark ? "#6b7280" : "#9ca3af"} size={16} />} />
          <SettingRow icon={ExclamationTriangleIcon} label="Factory Reset" description="Wipe everything. No turning back." isDanger={true} onPress={handleFactoryReset} rightElement={<ChevronRightIcon color="#ef4444" size={16} />} />
        </View>

        <View className="items-center mt-12 mb-6">
          <Text className={`font-black text-lg tracking-widest ${isDark ? 'text-gray-700' : 'text-gray-300'}`}>QUIZBUD</Text>
          <Text className={`text-xs font-bold mb-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Version 1.0.0</Text>
          <Text className={`text-[10px] font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Developed by Benjun Ogania</Text>
          <Text className={`text-[10px] mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Powered by Gemini AI</Text>
        </View>

      </ScrollView>

      {/* --- DYNAMIC MODERN UI MODAL --- */}
      <Modal animationType="fade" transparent={true} visible={modalConfig.visible} onRequestClose={closeModal}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" }}>
          <View className={`w-10/12 rounded-[32px] p-6 shadow-2xl items-center ${isDark ? "bg-gray-900" : "bg-white"}`}>
            
            {/* Dynamic Icon */}
            <View className={`w-16 h-16 rounded-full self-center items-center justify-center mb-4 ${
              modalConfig.type === 'danger' ? (isDark ? 'bg-red-900/40' : 'bg-red-100') : 
              modalConfig.type === 'success' ? (isDark ? 'bg-green-900/40' : 'bg-green-100') :
              (isDark ? 'bg-indigo-900/40' : 'bg-indigo-100')
            }`}>
              {modalConfig.type === 'danger' && <ExclamationTriangleIcon color={isDark ? "#f87171" : "#ef4444"} size={32} />}
              {modalConfig.type === 'success' && <CheckCircleIcon color={isDark ? "#4ade80" : "#22c55e"} size={32} />}
              {modalConfig.type === 'info' && <SparklesIcon color={isDark ? "#818cf8" : "#4f46e5"} size={32} />}
            </View>
            
            <Text className={`text-xl font-extrabold mb-2 text-center ${isDark ? "text-white" : "text-gray-900"}`}>
              {modalConfig.title}
            </Text>
            <Text className={`text-sm text-center mb-8 px-2 leading-5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {modalConfig.message}
            </Text>
            
            {/* Dynamic Buttons */}
            {modalConfig.showCancel ? (
              <View className="flex-row w-full justify-between space-x-3">
                <TouchableOpacity 
                  className={`flex-1 py-4 rounded-full border ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`} 
                  onPress={closeModal}
                >
                  <Text className={`font-bold text-center text-base ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className={`flex-1 py-4 rounded-full shadow-sm ${modalConfig.type === 'danger' ? 'bg-red-500' : 'bg-indigo-600'}`} 
                  onPress={() => {
                    closeModal();
                    if(modalConfig.onConfirm) modalConfig.onConfirm();
                  }}
                >
                  <Text className="text-white font-bold text-center text-base">{modalConfig.confirmText}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                className={`w-full py-4 rounded-full shadow-sm ${modalConfig.type === 'success' ? 'bg-green-500' : 'bg-indigo-600'}`} 
                onPress={() => {
                  closeModal();
                  if(modalConfig.onConfirm) modalConfig.onConfirm();
                }}
              >
                <Text className="text-white font-bold text-center text-base">{modalConfig.confirmText}</Text>
              </TouchableOpacity>
            )}

          </View>
        </View>
      </Modal>

    </View>
  );
}