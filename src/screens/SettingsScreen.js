import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Platform, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuizStore } from '../store/useQuizStore';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
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
  ArrowUpTrayIcon, 
  TrashIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  ClockIcon,
  ChevronUpIcon,
  ChevronDownIcon
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
  
  const { 
    theme, setTheme, 
    quizzes, 
    soundEffects, toggleSoundEffects,
    hapticsEnabled, toggleHaptics,
    aiTone, setAiTone,
    clearHistory,  
    factoryReset,
    importQuizzes,
    remindersEnabled, setRemindersEnabled, 
    reminderTime, setReminderTime          
  } = useQuizStore(); 
  
  const isDark = theme === 'dark';

  // --- MODAL STATES ---
  const [modalConfig, setModalConfig] = useState({
    visible: false, type: 'info', title: '', message: '', confirmText: 'OK', onConfirm: null, showCancel: false
  });
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  
  // Temp states for the time picker UI
  const [tempHour, setTempHour] = useState(8);
  const [tempMinute, setTempMinute] = useState(0);
  const [tempPeriod, setTempPeriod] = useState('PM');

  const closeModal = () => setModalConfig(prev => ({ ...prev, visible: false }));
  const showModal = (config) => setModalConfig({ ...config, visible: true });

  // Format the time for the settings menu display
  const getFormattedTime = () => {
    const period = reminderTime.hour >= 12 ? 'PM' : 'AM';
    const displayHour = reminderTime.hour % 12 || 12;
    const displayMinute = reminderTime.minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
  };

  const scheduleDailyReminder = async (hour24, minute) => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        showModal({ type: 'danger', title: 'Permission Denied', message: 'Please allow notifications in your phone settings.', confirmText: 'Got it' });
        setRemindersEnabled(false);
        return;
      }

      // 1. CREATE THE ANDROID CHANNEL
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // 2. SCHEDULE THE NOTIFICATION (WITH THE MISSING channelId FIX!)
      await Notifications.scheduleNotificationAsync({
        content: { 
          title: "🧠 Time to study!", 
          body: "Keep your streak alive. Review a quiz today to keep your mind sharp!", 
          sound: true 
        },
        trigger: { 
          hour: Number(hour24), 
          minute: Number(minute), 
          repeats: true,
          channelId: 'default' // 🚨 FIX: This is the missing link Expo was complaining about!
        },
      });

      setRemindersEnabled(true);
      
      const period = hour24 >= 12 ? 'PM' : 'AM';
      const displayHour = hour24 % 12 || 12;
      const displayMin = minute.toString().padStart(2, '0');

      showModal({
        type: 'success',
        title: 'Reminder Set!',
        message: `You will now receive a daily study reminder at ${displayHour}:${displayMin} ${period}.`,
        confirmText: 'Awesome'
      });

    } catch (error) {
      console.warn(error);
      setRemindersEnabled(false); 
      
      showModal({
        type: 'danger',
        title: 'Android Blocked the Alarm',
        message: `Error: ${error.message}\n\nTo fix this on Android 14+, go to your phone's Settings -> Apps -> QuizBud -> "Alarms & Reminders" and ALLOW it.`,
        confirmText: 'I understand'
      });
    }
  };

  const handleToggleReminders = (value) => {
    triggerHaptic(hapticsEnabled, 'Light');
    if (value) {
      // If toggling ON, prepopulate the picker and show it
      let h12 = reminderTime.hour % 12 || 12;
      setTempHour(h12);
      setTempMinute(reminderTime.minute);
      setTempPeriod(reminderTime.hour >= 12 ? 'PM' : 'AM');
      setIsTimePickerVisible(true);
    } else {
      // If toggling OFF, cancel all
      Notifications.cancelAllScheduledNotificationsAsync();
      setRemindersEnabled(false);
    }
  };

  const saveTimePicker = () => {
    triggerHaptic(hapticsEnabled, 'Medium');
    setIsTimePickerVisible(false);
    
    // Convert 12h to 24h format for the system
    let finalHour24 = tempHour;
    if (tempPeriod === 'PM' && tempHour !== 12) finalHour24 += 12;
    if (tempPeriod === 'AM' && tempHour === 12) finalHour24 = 0;

    setReminderTime({ hour: finalHour24, minute: tempMinute });
    scheduleDailyReminder(finalHour24, tempMinute);
  };

  // Helper for custom time picker
  const adjustTime = (type, direction) => {
    triggerHaptic(hapticsEnabled, 'Light');
    if (type === 'hour') {
      let nextHour = tempHour + direction;
      if (nextHour > 12) nextHour = 1;
      if (nextHour < 1) nextHour = 12;
      setTempHour(nextHour);
    } else if (type === 'minute') {
      let nextMin = tempMinute + (direction * 5); // jump by 5 mins
      if (nextMin > 55) nextMin = 0;
      if (nextMin < 0) nextMin = 55;
      setTempMinute(nextMin);
    }
  };

  const toggleTheme = () => {
    if (setTheme) { setTheme(isDark ? 'light' : 'dark'); triggerHaptic(hapticsEnabled); }
  };

  const handleToggleHaptics = () => {
    toggleHaptics();
    if (!hapticsEnabled) triggerHaptic(true, 'Heavy'); 
  };

  const handleExportData = async () => { /* ... existing export logic ... */ };
  const handleImportData = async () => { /* ... existing import logic ... */ };
  
  const handleClearHistory = () => {
    triggerHaptic(hapticsEnabled, 'Medium');
    showModal({
      type: 'danger', title: 'Clear Stats?',
      message: 'This will reset your accuracy and study time to zero. Your quizzes will remain safe.',
      showCancel: true, confirmText: 'Clear',
      onConfirm: () => { if(clearHistory) clearHistory(); showModal({ type: 'success', title: 'Success', message: 'History cleared.', confirmText: 'Done' }); }
    });
  };

  const handleFactoryReset = () => {
    triggerHaptic(hapticsEnabled, 'Heavy');
    showModal({
      type: 'danger', title: 'FACTORY RESET',
      message: 'Are you absolutely sure? This will permanently delete ALL your quizzes and stats.',
      showCancel: true, confirmText: 'Wipe Everything',
      onConfirm: () => { if(factoryReset) factoryReset(); showModal({ type: 'success', title: 'Reset Complete', message: 'App restored to factory settings.', confirmText: 'OK' }); }
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

        <SectionHeader title="Gameplay & Notifications" />
        <View className={`px-4 rounded-3xl ${isDark ? 'bg-gray-900' : 'bg-white shadow-sm'}`}>
          <SettingRow icon={SpeakerWaveIcon} label="Sound Effects" description="Play sounds for correct/wrong answers" rightElement={<Switch value={soundEffects} onValueChange={() => { triggerHaptic(hapticsEnabled); toggleSoundEffects(); }} trackColor={{ false: '#d1d5db', true: '#4f46e5' }} thumbColor={'#ffffff'}/>} />
          <SettingRow icon={DevicePhoneMobileIcon} label="Haptic Feedback" description="Vibrate phone on button presses" rightElement={<Switch value={hapticsEnabled} onValueChange={handleToggleHaptics} trackColor={{ false: '#d1d5db', true: '#4f46e5' }} thumbColor={'#ffffff'}/>} />
          
          <SettingRow 
            icon={BellAlertIcon} 
            label="Daily Study Reminder" 
            description={remindersEnabled ? `Active - Reminding you daily at ${getFormattedTime()}` : "Get notified to keep your streak alive"} 
            onPress={remindersEnabled ? () => handleToggleReminders(true) : null}
            rightElement={
              <Switch value={remindersEnabled} onValueChange={handleToggleReminders} trackColor={{ false: '#d1d5db', true: '#4f46e5' }} thumbColor={'#ffffff'}/>
            } 
          />
        </View>

        <SectionHeader title="AI Assistant Preferences" />
        <View className={`px-4 rounded-3xl ${isDark ? 'bg-gray-900' : 'bg-white shadow-sm'}`}>
          <SettingRow icon={SparklesIcon} label="AI Response Tone" description="How Gemini explains concepts to you" onPress={cycleAiTone} rightElement={<View className="flex-row items-center"><Text className={`font-bold mr-2 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>{aiTone || 'Standard'}</Text><ChevronRightIcon color={isDark ? "#6b7280" : "#9ca3af"} size={16} /></View>} />
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
          <Text className={`text-[10px] font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Developed by Benjun Ogania</Text>
        </View>

      </ScrollView>

      {/* --- CUSTOM TIME PICKER MODAL --- */}
      <Modal animationType="slide" transparent={true} visible={isTimePickerVisible} onRequestClose={() => {setIsTimePickerVisible(false); setRemindersEnabled(false);}}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
          <View className={`rounded-t-[40px] p-8 pb-12 shadow-2xl items-center ${isDark ? "bg-gray-900" : "bg-white"}`}>
            
            <View className={`w-16 h-16 rounded-full self-center items-center justify-center mb-4 ${isDark ? 'bg-indigo-900/40' : 'bg-indigo-100'}`}>
              <ClockIcon color={isDark ? "#818cf8" : "#4f46e5"} size={32} />
            </View>
            
            <Text className={`text-2xl font-extrabold mb-2 text-center ${isDark ? "text-white" : "text-gray-900"}`}>Set Reminder Time</Text>
            <Text className={`text-sm text-center mb-8 px-2 leading-5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>When would you like QuizBud to remind you to study?</Text>
            
            {/* TIME WHEELS */}
            <View className="flex-row items-center justify-center space-x-6 mb-10 w-full px-4">
              
              {/* Hour Wheel */}
              <View className="items-center w-20">
                <TouchableOpacity onPress={() => adjustTime('hour', 1)} className={`p-3 rounded-xl mb-2 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <ChevronUpIcon color={isDark ? "#a5b4fc" : "#4f46e5"} size={24} />
                </TouchableOpacity>
                <Text className={`text-4xl font-black py-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{tempHour}</Text>
                <TouchableOpacity onPress={() => adjustTime('hour', -1)} className={`p-3 rounded-xl mt-2 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <ChevronDownIcon color={isDark ? "#a5b4fc" : "#4f46e5"} size={24} />
                </TouchableOpacity>
              </View>

              <Text className={`text-4xl font-black mb-2 ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>:</Text>

              {/* Minute Wheel */}
              <View className="items-center w-20">
                <TouchableOpacity onPress={() => adjustTime('minute', 1)} className={`p-3 rounded-xl mb-2 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <ChevronUpIcon color={isDark ? "#a5b4fc" : "#4f46e5"} size={24} />
                </TouchableOpacity>
                <Text className={`text-4xl font-black py-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{tempMinute.toString().padStart(2, '0')}</Text>
                <TouchableOpacity onPress={() => adjustTime('minute', -1)} className={`p-3 rounded-xl mt-2 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <ChevronDownIcon color={isDark ? "#a5b4fc" : "#4f46e5"} size={24} />
                </TouchableOpacity>
              </View>

              {/* AM / PM Toggle */}
              <View className="items-center w-20 justify-center h-full ml-4">
                <TouchableOpacity 
                  onPress={() => { triggerHaptic(hapticsEnabled, 'Light'); setTempPeriod(tempPeriod === 'AM' ? 'PM' : 'AM'); }}
                  className={`w-full py-6 rounded-2xl items-center border-2 ${isDark ? 'border-indigo-500 bg-indigo-900/30' : 'border-indigo-600 bg-indigo-50'}`}
                >
                  <Text className={`text-2xl font-black ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>{tempPeriod}</Text>
                  <Text className={`text-[10px] uppercase font-bold mt-1 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`}>Tap to flip</Text>
                </TouchableOpacity>
              </View>

            </View>
            
            <View className="flex-row w-full justify-between space-x-3">
              <TouchableOpacity className={`flex-1 py-4 rounded-full border ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`} onPress={() => { setIsTimePickerVisible(false); setRemindersEnabled(false); }}>
                <Text className={`font-bold text-center text-base ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 py-4 rounded-full shadow-sm bg-indigo-600" onPress={saveTimePicker}>
                <Text className="text-white font-bold text-center text-base">Save Alarm</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* --- DYNAMIC MODERN UI MODAL --- */}
      <Modal animationType="fade" transparent={true} visible={modalConfig.visible} onRequestClose={closeModal}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" }}>
          <View className={`w-10/12 rounded-[32px] p-6 shadow-2xl items-center ${isDark ? "bg-gray-900" : "bg-white"}`}>
            
            <View className={`w-16 h-16 rounded-full self-center items-center justify-center mb-4 ${
              modalConfig.type === 'danger' ? (isDark ? 'bg-red-900/40' : 'bg-red-100') : 
              modalConfig.type === 'success' ? (isDark ? 'bg-green-900/40' : 'bg-green-100') :
              (isDark ? 'bg-indigo-900/40' : 'bg-indigo-100')
            }`}>
              {modalConfig.type === 'danger' && <ExclamationTriangleIcon color={isDark ? "#f87171" : "#ef4444"} size={32} />}
              {modalConfig.type === 'success' && <CheckCircleIcon color={isDark ? "#4ade80" : "#22c55e"} size={32} />}
              {modalConfig.type === 'info' && <SparklesIcon color={isDark ? "#818cf8" : "#4f46e5"} size={32} />}
            </View>
            
            <Text className={`text-xl font-extrabold mb-2 text-center ${isDark ? "text-white" : "text-gray-900"}`}>{modalConfig.title}</Text>
            <Text className={`text-sm text-center mb-8 px-2 leading-5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{modalConfig.message}</Text>
            
            {modalConfig.showCancel ? (
              <View className="flex-row w-full justify-between space-x-3">
                <TouchableOpacity className={`flex-1 py-4 rounded-full border ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`} onPress={closeModal}>
                  <Text className={`font-bold text-center text-base ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity className={`flex-1 py-4 rounded-full shadow-sm ${modalConfig.type === 'danger' ? 'bg-red-500' : 'bg-indigo-600'}`} onPress={() => { closeModal(); if(modalConfig.onConfirm) modalConfig.onConfirm(); }}>
                  <Text className="text-white font-bold text-center text-base">{modalConfig.confirmText}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity className={`w-full py-4 rounded-full shadow-sm ${modalConfig.type === 'success' ? 'bg-green-500' : 'bg-indigo-600'}`} onPress={() => { closeModal(); if(modalConfig.onConfirm) modalConfig.onConfirm(); }}>
                <Text className="text-white font-bold text-center text-base">{modalConfig.confirmText}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}