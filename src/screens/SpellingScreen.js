import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuizStore } from '../store/useQuizStore';
import { generateSpellingWords } from '../services/geminiService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { triggerHaptic } from '../utils/hapticHelper';

import { ArrowLeftIcon, SpeakerWaveIcon, ArrowPathIcon, LightBulbIcon } from 'react-native-heroicons/outline';
import { CheckCircleIcon, XCircleIcon, SparklesIcon, EyeIcon } from 'react-native-heroicons/solid';

export default function SpellingScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme, hapticsEnabled, spellingData, setSpellingData } = useQuizStore();
  const isDark = theme === 'dark';

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false); // NEW: Track if answer was revealed
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Load words on mount if store is empty
  useEffect(() => {
    if (!spellingData || spellingData.length === 0) {
      fetchNewWords();
    }
    return () => Speech.stop();
  }, []);

  const fetchNewWords = async () => {
    setIsLoading(true);
    try {
      const newWords = await generateSpellingWords();
      setSpellingData(newWords);
      setCurrentIndex(0);
      setUserInput('');
      setIsEvaluated(false);
      setIsRevealed(false); // Reset reveal state
    } catch (error) {
      Alert.alert("Error", "Could not connect to AI. Please check your internet connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = () => {
    triggerHaptic(hapticsEnabled, 'Medium');
    Alert.alert(
      "Fetch New Words?",
      "This will use AI to generate 10 fresh vocabulary words.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Generate", onPress: fetchNewWords }
      ]
    );
  };

  const playWord = (word, isSlow = false) => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    Speech.speak(word, { 
      rate: isSlow ? 0.3 : 0.8, 
      pitch: 1.0,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  };

  const checkAnswer = () => {
    if (!userInput.trim()) return;
    Speech.stop();
    setIsSpeaking(false);
    triggerHaptic(hapticsEnabled, 'Light');
    
    const currentWord = spellingData[currentIndex].word;
    const isAnsCorrect = userInput.toLowerCase().trim() === currentWord.toLowerCase().trim();
    
    setIsCorrect(isAnsCorrect);
    setIsEvaluated(true);
    setIsRevealed(false);
  };

  // --- NEW: Reveal Answer Logic ---
  const revealAnswer = () => {
    triggerHaptic(hapticsEnabled, 'Medium');
    Speech.stop();
    setIsSpeaking(false);
    
    const currentWord = spellingData[currentIndex].word;
    setUserInput(currentWord); // Fill the input with the correct word
    setIsEvaluated(true);
    setIsCorrect(false); // It's not technically a correct guess
    setIsRevealed(true);
  };

  const nextWord = () => {
    triggerHaptic(hapticsEnabled, 'Light');
    if (currentIndex < spellingData.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserInput('');
      setIsEvaluated(false);
      setIsRevealed(false); // Reset reveal state for next word
    } else {
      Alert.alert("Awesome Job!", "You've finished this set. Let's generate some new words!", [
        { text: "Generate More", onPress: fetchNewWords }
      ]);
    }
  };

  if (isLoading || !spellingData || spellingData.length === 0) {
    return (
      <View className={`flex-1 justify-center items-center ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text className={`mt-4 font-bold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Generating vocabulary list...</Text>
      </View>
    );
  }

  const currentItem = spellingData[currentIndex];

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
            <Text className={`text-xl font-bold ml-2 ${isDark ? 'text-white' : 'text-blue-900'}`}>Spelling Bee</Text>
          </View>

          <TouchableOpacity 
            onPress={handleRegenerate}
            className={`flex-row items-center px-3 py-1.5 rounded-full ${isDark ? 'bg-indigo-900/50' : 'bg-indigo-100'}`}
          >
            <ArrowPathIcon color={isDark ? "#818cf8" : "#4f46e5"} size={16} />
            <Text className={`ml-1 font-bold text-xs ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>New Set</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40, paddingTop: 20 }}>
          
          <Text className={`font-bold tracking-widest uppercase text-xs mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Word {currentIndex + 1} of {spellingData.length}
          </Text>
          <View className={`h-2 rounded-full mb-8 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
            <View className={`h-2 rounded-full ${isDark ? 'bg-indigo-500' : 'bg-blue-600'}`} style={{ width: `${((currentIndex + 1) / spellingData.length) * 100}%` }} />
          </View>

          {/* AUDIO CONTROLS */}
          <View className="items-center mb-8">
            <TouchableOpacity 
              onPress={() => playWord(currentItem.word, false)}
              className={`w-32 h-32 rounded-full justify-center items-center mb-4 shadow-md border-4 ${
                isSpeaking 
                  ? (isDark ? 'bg-indigo-600 border-indigo-400' : 'bg-indigo-600 border-indigo-200') 
                  : (isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100')
              }`}
            >
              <SpeakerWaveIcon color={isSpeaking ? "white" : (isDark ? "#a5b4fc" : "#4f46e5")} size={48} />
              <Text className={`text-[10px] font-bold mt-2 uppercase tracking-widest ${isSpeaking ? "text-indigo-100" : (isDark ? "text-gray-400" : "text-gray-500")}`}>
                {isSpeaking ? 'Playing...' : 'Tap to Hear'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => playWord(currentItem.word, true)}
              className={`flex-row items-center px-5 py-2 rounded-full border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}
            >
              <SpeakerWaveIcon color={isDark ? "#a5b4fc" : "#4f46e5"} size={16} />
              <Text className={`ml-2 text-xs font-bold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Play Slower</Text>
            </TouchableOpacity>
          </View>

          {/* Context Card */}
          <View className={`p-5 rounded-3xl mb-8 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <View className="flex-row items-center mb-2">
              <SparklesIcon color="#fbbf24" size={16} />
              <Text className={`font-bold text-xs uppercase ml-1 tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Definition</Text>
            </View>
            <Text className={`text-base font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              {currentItem.definition}
            </Text>
            
            <View className={`h-[1px] mb-4 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />
            
            <Text className={`font-bold text-xs uppercase mb-1 tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Example in a sentence</Text>
            <Text className={`text-base italic ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              "{currentItem.sentence}"
            </Text>
          </View>

          {/* NEW: Hint Length */}
          <Text className={`text-center font-bold mb-2 uppercase tracking-widest text-xs ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
            Hint: {currentItem.word.length} letters
          </Text>

          {/* Input Area */}
          <TextInput
            editable={!isEvaluated}
            autoCorrect={false} 
            spellCheck={false} 
            autoCapitalize="none"
            className={`border-2 rounded-2xl p-5 text-xl text-center font-bold mb-3 ${
              isEvaluated 
                ? (isRevealed 
                    ? (isDark ? 'border-blue-500 bg-blue-900/30 text-blue-300' : 'border-blue-500 bg-blue-50 text-blue-800')
                    : isCorrect 
                      ? (isDark ? 'border-green-500 bg-green-900/30 text-green-300' : 'border-green-500 bg-green-50 text-green-800') 
                      : (isDark ? 'border-red-500 bg-red-900/30 text-red-300' : 'border-red-500 bg-red-50 text-red-800')) 
                : (isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-800')
            }`}
            placeholder="Type the word here..."
            placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
            value={userInput}
            onChangeText={setUserInput}
          />

          {/* NEW: Reveal Answer Button */}
          {!isEvaluated && (
            <TouchableOpacity onPress={revealAnswer} className="self-center mb-6 flex-row items-center py-2 px-4">
              <LightBulbIcon color={isDark ? "#9ca3af" : "#6b7280"} size={16} />
              <Text className={`ml-1 font-bold text-sm underline ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                I'm stuck. Reveal Answer
              </Text>
            </TouchableOpacity>
          )}

          {/* Feedback Box */}
          {isEvaluated && (
            <View className={`flex-row justify-center items-center mb-6 p-4 rounded-2xl ${
              isRevealed ? (isDark ? 'bg-blue-900/20' : 'bg-blue-50') :
              isCorrect ? (isDark ? 'bg-green-900/20' : 'bg-green-50') : 
              (isDark ? 'bg-red-900/20' : 'bg-red-50')
            }`}>
              {isRevealed ? <EyeIcon color="#3b82f6" size={24} /> :
               isCorrect ? <CheckCircleIcon color="#22c55e" size={24} /> : 
               <XCircleIcon color="#ef4444" size={24} />}
              
              <Text className={`font-bold text-lg ml-2 ${
                isRevealed ? (isDark ? 'text-blue-400' : 'text-blue-700') :
                isCorrect ? (isDark ? 'text-green-400' : 'text-green-700') : 
                (isDark ? 'text-red-400' : 'text-red-700')
              }`}>
                {isRevealed ? `Revealed: "${currentItem.word}"` :
                 isCorrect ? "Correct!" : 
                 `Incorrect. The word is "${currentItem.word}"`}
              </Text>
            </View>
          )}

          {/* Action Button */}
          <TouchableOpacity 
            onPress={isEvaluated ? nextWord : checkAnswer}
            disabled={!userInput.trim() && !isEvaluated}
            className={`py-4 rounded-full shadow-sm ${
              !userInput.trim() && !isEvaluated
                ? (isDark ? 'bg-gray-800' : 'bg-gray-300') 
                : (isDark ? 'bg-indigo-600' : 'bg-blue-900')
            }`}
          >
            <Text className={`text-lg font-bold text-center ${(!userInput.trim() && !isEvaluated) && isDark ? 'text-gray-600' : 'text-white'}`}>
              {isEvaluated ? (currentIndex === spellingData.length - 1 ? 'Finish Set' : 'Next Word') : 'Check Spelling'}
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}