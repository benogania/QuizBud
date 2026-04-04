import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuizStore } from '../store/useQuizStore';
import { generateSpeakingScenarios, evaluateSpeakingResponse } from '../services/geminiService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { triggerHaptic } from '../utils/hapticHelper';

import { ArrowLeftIcon, SpeakerWaveIcon, ArrowPathIcon } from 'react-native-heroicons/outline';
import { SparklesIcon, ChatBubbleBottomCenterTextIcon, MegaphoneIcon } from 'react-native-heroicons/solid';

export default function SpeakingScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme, hapticsEnabled, speakingScenarios, setSpeakingScenarios } = useQuizStore();
  const isDark = theme === 'dark';

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (!speakingScenarios || speakingScenarios.length === 0) {
      fetchNewScenarios();
    }
    return () => Speech.stop();
  }, []);

  const fetchNewScenarios = async () => {
    setIsLoadingScenarios(true);
    try {
      const newScenarios = await generateSpeakingScenarios();
      setSpeakingScenarios(newScenarios);
      setCurrentIndex(0);
      resetTurn();
    } catch (error) {
      Alert.alert("Error", "Could not connect to AI. Please try again.");
    } finally {
      setIsLoadingScenarios(false);
    }
  };

  const resetTurn = () => {
    setUserInput('');
    setEvaluation(null);
    Speech.stop();
    setIsSpeaking(false);
  };

  const handleRegenerate = () => {
    triggerHaptic(hapticsEnabled, 'Medium');
    Alert.alert("Fetch New Scenarios?", "This will generate 5 fresh speaking scenarios.", [
      { text: "Cancel", style: "cancel" },
      { text: "Generate", onPress: fetchNewScenarios }
    ]);
  };

  const submitResponse = async () => {
    if (!userInput.trim()) return;
    Keyboard.dismiss();
    triggerHaptic(hapticsEnabled, 'Medium');
    setIsEvaluating(true);

    try {
      const currentScenario = speakingScenarios[currentIndex].scenario;
      const result = await evaluateSpeakingResponse(currentScenario, userInput);
      setEvaluation(result);
      triggerHaptic(hapticsEnabled, 'Success');
    } catch (error) {
      Alert.alert("Evaluation Failed", "Something went wrong. Please try again.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const playNativeAlternative = () => {
    if (!evaluation) return;
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    Speech.speak(evaluation.nativeAlternative, {
      rate: 0.9, 
      pitch: 1.0,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  };

  const nextScenario = () => {
    triggerHaptic(hapticsEnabled, 'Light');
    if (currentIndex < speakingScenarios.length - 1) {
      setCurrentIndex(currentIndex + 1);
      resetTurn();
    } else {
      Alert.alert("Great Practice!", "You've finished this set of scenarios. Let's get some more!", [
        { text: "Generate More", onPress: fetchNewScenarios }
      ]);
    }
  };

  if (isLoadingScenarios || !speakingScenarios || speakingScenarios.length === 0) {
    return (
      <View className={`flex-1 justify-center items-center ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text className={`mt-4 font-bold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Preparing real-life scenarios...</Text>
      </View>
    );
  }

  const currentScenario = speakingScenarios[currentIndex];

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
            <Text className={`text-xl font-bold ml-2 ${isDark ? 'text-white' : 'text-blue-900'}`}>Speaking Skills</Text>
          </View>
          <TouchableOpacity onPress={handleRegenerate} className={`flex-row items-center px-3 py-1.5 rounded-full ${isDark ? 'bg-indigo-900/50' : 'bg-indigo-100'}`}>
            <ArrowPathIcon color={isDark ? "#818cf8" : "#4f46e5"} size={16} />
            <Text className={`ml-1 font-bold text-xs ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>New Set</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingTop: 20 }}>
          
          <Text className={`font-bold tracking-widest uppercase text-xs mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Scenario {currentIndex + 1} of {speakingScenarios.length}
          </Text>
          <View className={`h-2 rounded-full mb-6 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
            <View className={`h-2 rounded-full ${isDark ? 'bg-indigo-500' : 'bg-blue-600'}`} style={{ width: `${((currentIndex + 1) / speakingScenarios.length) * 100}%` }} />
          </View>

          {/* Scenario Card */}
          <View className={`p-6 rounded-3xl mb-6 shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <View className="flex-row items-center mb-3">
              <ChatBubbleBottomCenterTextIcon color={isDark ? "#818cf8" : "#4f46e5"} size={20} />
              <Text className={`font-bold text-xs uppercase ml-2 tracking-widest ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                {currentScenario.title}
              </Text>
            </View>
            <Text className={`text-lg font-medium leading-7 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              {currentScenario.scenario}
            </Text>
          </View>

          {/* User Input OR Evaluation Result */}
          {!evaluation ? (
            <View>
              <Text className={`font-bold text-sm mb-3 ml-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>What would you say?</Text>
              <TextInput
                editable={!isEvaluating}
                className={`border-2 rounded-3xl p-5 min-h-[100px] text-base mb-6 ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                placeholder="Type your spoken response here..."
                placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                value={userInput}
                onChangeText={setUserInput}
                multiline
                textAlignVertical="top"
              />
              
              <TouchableOpacity 
                onPress={submitResponse}
                disabled={!userInput.trim() || isEvaluating}
                className={`py-4 rounded-full flex-row justify-center items-center shadow-sm ${(!userInput.trim() || isEvaluating) ? (isDark ? 'bg-gray-800' : 'bg-gray-300') : (isDark ? 'bg-indigo-600' : 'bg-blue-900')}`}
              >
                {isEvaluating ? (
                  <>
                    <ActivityIndicator color="white" />
                    <Text className="text-white font-bold text-lg ml-2">Evaluating...</Text>
                  </>
                ) : (
                  <>
                    <MegaphoneIcon color={!userInput.trim() && isDark ? "#4b5563" : "white"} size={20} />
                    <Text className={`text-lg font-bold ml-2 ${!userInput.trim() && isDark ? 'text-gray-600' : 'text-white'}`}>Evaluate Response</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {/* Native Speaker Alternative */}
              <View className={`p-6 rounded-3xl mb-6 border-2 ${isDark ? 'bg-indigo-900/20 border-indigo-500' : 'bg-indigo-50 border-indigo-300'}`}>
                <Text className={`font-bold text-xs uppercase mb-3 tracking-widest ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>How a Native Speaker Says It:</Text>
                <Text className={`text-2xl font-black mb-6 leading-8 ${isDark ? 'text-white' : 'text-indigo-950'}`}>
                  "{evaluation.nativeAlternative}"
                </Text>

                <TouchableOpacity 
                  onPress={playNativeAlternative}
                  className={`flex-row items-center justify-center py-3 rounded-full ${isDark ? 'bg-indigo-600' : 'bg-indigo-600 shadow-sm'}`}
                >
                  <SpeakerWaveIcon color="white" size={20} />
                  <Text className="text-white font-bold ml-2">
                    {isSpeaking ? 'Listening...' : 'Listen & Shadow Practice'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Feedback */}
              <View className={`p-5 rounded-3xl mb-4 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
                <Text className={`font-bold text-sm uppercase mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Feedback on your response</Text>
                <Text className={`text-base leading-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{evaluation.feedback}</Text>
              </View>

              {/* Pronunciation Tip */}
              <View className={`p-5 rounded-3xl mb-8 border ${isDark ? 'bg-yellow-900/20 border-yellow-700/50' : 'bg-yellow-50 border-yellow-200'}`}>
                <View className="flex-row items-center mb-2">
                  <SparklesIcon color={isDark ? "#facc15" : "#eab308"} size={16} />
                  <Text className={`font-bold text-sm uppercase ml-2 ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>Pronunciation Tip</Text>
                </View>
                <Text className={`text-base leading-6 ${isDark ? 'text-yellow-100/80' : 'text-yellow-900'}`}>{evaluation.pronunciationTip}</Text>
              </View>

              <TouchableOpacity 
                onPress={nextScenario}
                className={`py-4 rounded-full shadow-sm ${isDark ? 'bg-indigo-600' : 'bg-blue-900'}`}
              >
                <Text className="text-lg font-bold text-center text-white">
                  {currentIndex === speakingScenarios.length - 1 ? 'Finish Scenarios' : 'Next Scenario'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}