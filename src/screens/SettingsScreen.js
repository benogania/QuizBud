import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Modal, TextInput, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuizStore } from '../store/useQuizStore';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

import { triggerHaptic } from '../utils/hapticHelper'; 

import { 
  ArrowLeftIcon, MoonIcon, SunIcon, SpeakerWaveIcon, DevicePhoneMobileIcon,
  SparklesIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, TrashIcon,
  ExclamationTriangleIcon, ChevronRightIcon, KeyIcon, PlusIcon, ArrowTopRightOnSquareIcon
} from 'react-native-heroicons/outline';
import { CheckCircleIcon } from 'react-native-heroicons/solid';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const { 
    theme, setTheme, quizzes, soundEffects, toggleSoundEffects,
    hapticsEnabled, toggleHaptics, aiTone, setAiTone, clearHistory,  
    factoryReset, importQuizzes, geminiApiKeys = [], addApiKey, removeApiKey 
  } = useQuizStore(); 
  
  const isDark = theme === 'dark';

  const [modalConfig, setModalConfig] = useState({
    visible: false, type: 'info', title: '', message: '', confirmText: 'OK', onConfirm: null, showCancel: false
  });
  const [isApiKeyModalVisible, setIsApiKeyModalVisible] = useState(false);
  const [newApiKeyValue, setNewApiKeyValue] = useState('');

  const closeModal = () => setModalConfig(prev => ({ ...prev, visible: false }));
  const showModal = (config) => setModalConfig({ ...config, visible: true });

  const handleAddApiKey = () => {
    if (!newApiKeyValue.trim()) return;
    addApiKey(newApiKeyValue.trim());
    setNewApiKeyValue('');
    setIsApiKeyModalVisible(false);
    triggerHaptic(hapticsEnabled, 'Light');
  };

  const toggleTheme = () => { if (setTheme) { setTheme(isDark ? 'light' : 'dark'); triggerHaptic(hapticsEnabled); } };
  const handleToggleHaptics = () => { toggleHaptics(); if (!hapticsEnabled) triggerHaptic(true, 'Heavy'); };

  const handleExportData = async () => {
    triggerHaptic(hapticsEnabled, 'Medium');
    try {
      const fileUri = `${FileSystem.documentDirectory}QuizBud_Backup.qb`;
      const exportData = { version: "1.2", quizzes: quizzes };
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(exportData, null, 2));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Backup QuizBud Data' });
      } else {
        showModal({ type: 'danger', title: 'Error', message: 'Sharing is not available on this device.', confirmText: 'OK' });
      }
    } catch (error) {
      showModal({ type: 'danger', title: 'Export Failed', message: 'There was an error saving your backup.', confirmText: 'OK' });
    }
  };

  const handleImportData = async () => {
    triggerHaptic(hapticsEnabled, 'Medium');
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', '*/*'], copyToCacheDirectory: true });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const file = result.assets[0];
      const fileContent = await FileSystem.readAsStringAsync(file.uri);
      const parsedData = JSON.parse(fileContent);
      if (parsedData.quizzes && Array.isArray(parsedData.quizzes)) {
        importQuizzes(parsedData.quizzes);
        showModal({ type: 'success', title: 'Restore Successful', message: `Successfully restored ${parsedData.quizzes.length} quizzes!`, confirmText: 'Awesome' });
      } else {
        throw new Error("Invalid Format");
      }
    } catch (error) {
      showModal({ type: 'danger', title: 'Restore Failed', message: 'Not a valid QuizBud backup file. Ensure it is a .qb or .json file.', confirmText: 'OK' });
    }
  };
  
  const handleClearHistory = () => {
    triggerHaptic(hapticsEnabled, 'Medium');
    showModal({
      type: 'danger', title: 'Clear Stats?', message: 'This will reset your accuracy and study time to zero. Your quizzes will remain safe.',
      showCancel: true, confirmText: 'Clear', onConfirm: () => { if(clearHistory) clearHistory(); showModal({ type: 'success', title: 'Success', message: 'History cleared.', confirmText: 'Done' }); }
    });
  };

  const handleFactoryReset = () => {
    triggerHaptic(hapticsEnabled, 'Heavy');
    showModal({
      type: 'danger', title: 'FACTORY RESET', message: 'Are you absolutely sure? This will permanently delete ALL your quizzes and stats.',
      showCancel: true, confirmText: 'Wipe Everything', onConfirm: () => { if(factoryReset) factoryReset(); showModal({ type: 'success', title: 'Reset Complete', message: 'App restored to factory settings.', confirmText: 'OK' }); }
    });
  };

  const cycleAiTone = () => {
    triggerHaptic(hapticsEnabled);
    const tones = ['Standard', 'Explain like I\'m 5', 'Academic'];
    const currentIndex = tones.indexOf(aiTone || 'Standard');
    setAiTone(tones[(currentIndex + 1) % tones.length]);
  };

  const handleGetApiKeyLink = () => {
    triggerHaptic(hapticsEnabled, 'Light');
    Linking.openURL('https://aistudio.google.com/app/apikey');
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

        <SectionHeader title="Gameplay" />
        <View className={`px-4 rounded-3xl pb-2 ${isDark ? 'bg-gray-900' : 'bg-white shadow-sm'}`}>
          <SettingRow icon={SpeakerWaveIcon} label="Sound Effects" description="Play sounds for correct/wrong answers" rightElement={<Switch value={soundEffects} onValueChange={() => { triggerHaptic(hapticsEnabled); toggleSoundEffects(); }} trackColor={{ false: '#d1d5db', true: '#4f46e5' }} thumbColor={'#ffffff'}/>} />
          <SettingRow icon={DevicePhoneMobileIcon} label="Haptic Feedback" description="Vibrate phone on button presses" rightElement={<Switch value={hapticsEnabled} onValueChange={handleToggleHaptics} trackColor={{ false: '#d1d5db', true: '#4f46e5' }} thumbColor={'#ffffff'}/>} />
        </View>

        <SectionHeader title="AI Assistant Preferences" />
        <View className={`px-4 rounded-3xl ${isDark ? 'bg-gray-900' : 'bg-white shadow-sm'}`}>
          <SettingRow icon={SparklesIcon} label="AI Response Tone" description="How Gemini explains concepts to you" onPress={cycleAiTone} rightElement={<View className="flex-row items-center"><Text className={`font-bold mr-2 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>{aiTone || 'Standard'}</Text><ChevronRightIcon color={isDark ? "#6b7280" : "#9ca3af"} size={16} /></View>} />
        </View>

        <SectionHeader title="AI API Configuration" />
        <View className={`px-4 rounded-3xl pb-2 pt-2 ${isDark ? 'bg-gray-900' : 'bg-white shadow-sm'}`}>
          {geminiApiKeys.length === 0 ? (
            <View className={`py-4 items-center border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
              <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No API Keys saved.</Text>
            </View>
          ) : (
            geminiApiKeys.map((key, index) => {
              const maskedKey = key.length > 10 ? `${key.substring(0, 6)}...${key.substring(key.length - 4)}` : 'Invalid Key Length';
              return (
                <View key={index} className={`flex-row items-center justify-between py-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
                  <View className="flex-row items-center">
                    <View className={`p-2 rounded-full mr-3 ${isDark ? 'bg-indigo-900/30' : 'bg-indigo-50'}`}>
                      <KeyIcon color={isDark ? "#818cf8" : "#4f46e5"} size={16} />
                    </View>
                    <View>
                      <Text className={`font-bold text-sm ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>Gemini API Key {index + 1}</Text>
                      <Text className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{maskedKey}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => { triggerHaptic(hapticsEnabled, 'Light'); removeApiKey(index); }} className={`p-2 rounded-full ${isDark ? 'bg-red-900/20' : 'bg-red-50'}`}>
                    <TrashIcon color="#ef4444" size={18} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
          
          <TouchableOpacity onPress={() => setIsApiKeyModalVisible(true)} className="flex-row items-center justify-center py-4">
            <PlusIcon color={isDark ? "#818cf8" : "#4f46e5"} size={20} />
            <Text className={`font-bold ml-2 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Add API Key</Text>
          </TouchableOpacity>
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

      {/* API KEY MODAL */}
      <Modal animationType="fade" transparent={true} visible={isApiKeyModalVisible} onRequestClose={() => setIsApiKeyModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" }}>
          <View className={`w-10/12 rounded-[32px] p-6 shadow-2xl ${isDark ? "bg-gray-900" : "bg-white"}`}>
            <View className={`w-12 h-12 rounded-full self-center items-center justify-center mb-4 ${isDark ? 'bg-indigo-900/40' : 'bg-indigo-100'}`}>
              <KeyIcon color={isDark ? "#818cf8" : "#4f46e5"} size={24} />
            </View>
            <Text className={`text-xl font-extrabold mb-2 text-center ${isDark ? "text-white" : "text-gray-900"}`}>Add API Key</Text>
            <Text className={`text-xs text-center mb-6 px-2 leading-5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Paste your Google Gemini API Key here to enable AI features.</Text>
            
            <TextInput 
              value={newApiKeyValue} 
              onChangeText={setNewApiKeyValue} 
              placeholder="AIzaSy..." 
              placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"} 
              className={`p-4 rounded-2xl border mb-3 font-medium text-base ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`} 
            />

            <TouchableOpacity 
              onPress={handleGetApiKeyLink}
              className="flex-row items-center justify-center mb-6"
            >
              <Text className={`font-bold mr-1 text-sm ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                Get a free API Key
              </Text>
              <ArrowTopRightOnSquareIcon color={isDark ? "#818cf8" : "#4f46e5"} size={14} />
            </TouchableOpacity>
            
            <View className="flex-row justify-end items-center">
              <TouchableOpacity className="px-5 py-3 rounded-full mr-2" onPress={() => setIsApiKeyModalVisible(false)}><Text className={`font-bold ${isDark ? "text-gray-400" : "text-gray-500"}`}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity className="bg-indigo-600 px-6 py-3 rounded-full shadow-sm" onPress={handleAddApiKey}><Text className="text-white font-bold">Add Key</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CONFIRMATION & ALERT MODAL */}
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