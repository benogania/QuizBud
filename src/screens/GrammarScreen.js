import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuizStore } from '../store/useQuizStore';
import { improveGrammar } from '../services/geminiService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { triggerHaptic } from '../utils/hapticHelper';

import { ArrowLeftIcon, SpeakerWaveIcon } from 'react-native-heroicons/outline';
import { SparklesIcon, CheckBadgeIcon, InformationCircleIcon } from 'react-native-heroicons/solid';

export default function GrammarScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme, hapticsEnabled } = useQuizStore();
  const isDark = theme === 'dark';

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null); // Will hold the { correctedText, improvements }
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    Keyboard.dismiss();
    triggerHaptic(hapticsEnabled, 'Medium');
    setIsLoading(true);
    setResult(null);

    try {
      const grammarData = await improveGrammar(inputText);
      setResult(grammarData);
      triggerHaptic(hapticsEnabled, 'Success');
    } catch (error) {
      alert("Oops! Could not connect to the AI. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const playCorrectedText = () => {
    if (!result) return;
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }
    
    setIsSpeaking(true);
    Speech.speak(result.correctedText, {
      rate: 0.9, // Slightly slow for clear pronunciation
      pitch: 1.0,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className={isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}
    >
      <View style={{ paddingTop: insets.top }} className="flex-1 px-5">
        
        {/* Header */}
        <View className="flex-row items-center justify-between py-4 border-b border-gray-200 dark:border-gray-800">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => { Speech.stop(); navigation.goBack(); }} className="p-2 -ml-2 rounded-full">
              <ArrowLeftIcon color={isDark ? "white" : "#1e3a8a"} size={24} />
            </TouchableOpacity>
            <Text className={`text-xl font-bold ml-2 ${isDark ? 'text-white' : 'text-blue-900'}`}>Grammar Coach</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingTop: 20 }}>
          
          <Text className={`text-2xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Improve Your English
          </Text>
          <Text className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Type or paste a sentence, email, or paragraph below. The AI will fix mistakes and make you sound like a native speaker.
          </Text>

          {/* Input Area */}
          <View className={`border-2 rounded-3xl p-2 mb-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
            <TextInput
              className={`text-base p-4 min-h-[120px] ${isDark ? 'text-white' : 'text-gray-900'}`}
              placeholder="E.g., I goes to the market yesterday for buying some milks..."
              placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
              value={inputText}
              onChangeText={setInputText}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Action Button */}
          {!result && (
            <TouchableOpacity 
              onPress={handleAnalyze}
              disabled={!inputText.trim() || isLoading}
              className={`py-4 rounded-full flex-row justify-center items-center shadow-sm ${
                !inputText.trim() || isLoading
                  ? (isDark ? 'bg-gray-800' : 'bg-gray-300') 
                  : (isDark ? 'bg-indigo-600' : 'bg-blue-900')
              }`}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator color="white" />
                  <Text className="text-white font-bold text-lg ml-2">Analyzing...</Text>
                </>
              ) : (
                <>
                  <SparklesIcon color={!inputText.trim() && isDark ? "#4b5563" : "white"} size={20} />
                  <Text className={`text-lg font-bold ml-2 ${!inputText.trim() && isDark ? 'text-gray-600' : 'text-white'}`}>
                    Analyze Text
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Result Area */}
          {result && (
            <View className="mt-4">
              
              {/* Corrected Text Card */}
              <View className={`p-6 rounded-3xl mb-6 border-2 ${isDark ? 'bg-indigo-900/20 border-indigo-500' : 'bg-indigo-50 border-indigo-200'}`}>
                <View className="flex-row items-center mb-3">
                  <CheckBadgeIcon color={isDark ? "#818cf8" : "#4f46e5"} size={24} />
                  <Text className={`font-bold text-sm uppercase ml-2 tracking-widest ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>
                    Corrected Version
                  </Text>
                </View>
                
                <Text className={`text-xl font-medium leading-8 mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {result.correctedText}
                </Text>

                {/* Speak Button for Practice */}
                <TouchableOpacity 
                  onPress={playCorrectedText}
                  className={`flex-row items-center self-start px-5 py-3 rounded-full ${isDark ? 'bg-indigo-600' : 'bg-indigo-600 shadow-sm'}`}
                >
                  <SpeakerWaveIcon color="white" size={20} />
                  <Text className="text-white font-bold ml-2">
                    {isSpeaking ? 'Stop Listening' : 'Listen & Practice Speaking'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Explanations Section */}
              <Text className={`font-bold text-lg mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Why we changed it:
              </Text>
              
              <View className={`p-5 rounded-3xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
                {result.improvements.map((tip, index) => (
                  <View key={index} className="flex-row items-start mb-4 last:mb-0">
                    <InformationCircleIcon color={isDark ? "#facc15" : "#eab308"} size={20} style={{ marginTop: 2 }} />
                    <Text className={`flex-1 ml-3 text-base leading-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {tip}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Reset Button */}
              <TouchableOpacity 
                onPress={() => {
                  triggerHaptic(hapticsEnabled, 'Light');
                  setResult(null);
                  setInputText('');
                }}
                className={`mt-8 py-4 rounded-full border-2 ${isDark ? 'border-gray-700' : 'border-gray-300'}`}
              >
                <Text className={`text-center font-bold text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Check Another Sentence
                </Text>
              </TouchableOpacity>

            </View>
          )}

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}