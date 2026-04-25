import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuizStore } from '../store/useQuizStore';
import { generateGrammarPractice } from '../services/geminiService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triggerHaptic } from '../utils/hapticHelper';

import { ArrowLeftIcon, ArrowPathIcon } from 'react-native-heroicons/outline';
import { CheckCircleIcon, XCircleIcon, AcademicCapIcon, InformationCircleIcon } from 'react-native-heroicons/solid';

export default function GrammarPracticeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme, hapticsEnabled, grammarPracticeData, setGrammarPracticeData } = useQuizStore();
  const isDark = theme === 'dark';

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!grammarPracticeData || grammarPracticeData.length === 0) {
      fetchNewQuestions();
    }
  }, []);

  const fetchNewQuestions = async () => {
    setIsLoading(true);
    try {
      const newQuestions = await generateGrammarPractice();
      setGrammarPracticeData(newQuestions);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setIsEvaluated(false);
    } catch (error) {
      Alert.alert("Error", "Could not connect to AI. Please check your internet connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = () => {
    triggerHaptic(hapticsEnabled, 'Medium');
    Alert.alert(
      "Fetch New Questions?",
      "This will generate 5 fresh grammar questions.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Generate", onPress: fetchNewQuestions }
      ]
    );
  };

  const checkAnswer = () => {
    if (!selectedAnswer) return;
    triggerHaptic(hapticsEnabled, 'Light');
    setIsEvaluated(true);
  };

  const nextQuestion = () => {
    triggerHaptic(hapticsEnabled, 'Light');
    if (currentIndex < grammarPracticeData.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setIsEvaluated(false);
    } else {
      Alert.alert("Great Job!", "You've finished this set. Let's generate some more!", [
        { text: "Generate More", onPress: fetchNewQuestions }
      ]);
    }
  };

  if (isLoading || !grammarPracticeData || grammarPracticeData.length === 0) {
    return (
      <View className={`flex-1 justify-center items-center ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text className={`mt-4 font-bold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Crafting grammar questions...</Text>
      </View>
    );
  }

  const currentQ = grammarPracticeData[currentIndex];
  const isCorrect = selectedAnswer === currentQ.correctAnswer;

  return (
    <View style={{ paddingTop: insets.top, flex: 1 }} className={isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}>
      <View className="flex-1 px-5">
        
        {/* Header */}
        <View className="flex-row items-center justify-between py-4 border-b dark:border-gray-800">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2 rounded-full">
              <ArrowLeftIcon color={isDark ? "white" : "#1e3a8a"} size={24} />
            </TouchableOpacity>
            <Text className={`text-xl font-bold ml-2 ${isDark ? 'text-white' : 'text-blue-900'}`}>Grammar Drill</Text>
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
            Question {currentIndex + 1} of {grammarPracticeData.length}
          </Text>
          <View className={`h-2 rounded-full  mb-8 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
            <View className={`h-2 rounded-full ${isDark ? 'bg-indigo-500' : 'bg-blue-600'}`} style={{ width: `${((currentIndex + 1) / grammarPracticeData.length) * 100}%` }} />
          </View>

          {/* Sentence Card */}
          <View className={`p-6 rounded-3xl mb-8 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
            <View className="flex-row items-center mb-4">
              <AcademicCapIcon color={isDark ? "#a5b4fc" : "#4f46e5"} size={20} />
              <Text className={`font-bold text-xs uppercase ml-2 tracking-widest ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>Fill in the blank</Text>
            </View>
            <Text className={`text-2xl font-bold leading-9 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {/* Replace ______ with a highlighted style if we want, or just render the text */}
              {currentQ.sentenceWithBlank.split('______').map((part, index, array) => (
                <React.Fragment key={index}>
                  {part}
                  {index < array.length - 1 && (
                    <Text className={isDark ? 'text-indigo-400' : 'text-indigo-600'}>
                      {isEvaluated ? ` ${currentQ.correctAnswer} ` : ' ______ '}
                    </Text>
                  )}
                </React.Fragment>
              ))}
            </Text>
          </View>

          {/* Options */}
          <View className="mb-6">
            {currentQ.options.map((option, idx) => {
              const isSelected = selectedAnswer === option;
              const isCorrectAnswer = currentQ.correctAnswer === option;
              
              let borderClass = isSelected 
                ? (isDark ? 'border-indigo-500' : 'border-blue-600') 
                : (isDark ? 'border-gray-800' : 'border-gray-200');
              
              let bgClass = isSelected 
                ? (isDark ? 'bg-indigo-900/30' : 'bg-blue-50') 
                : (isDark ? 'bg-gray-800' : 'bg-white');
              
              let textClass = isSelected 
                ? (isDark ? 'text-indigo-200' : 'text-blue-900') 
                : (isDark ? 'text-gray-300' : 'text-gray-700');
              
              let Icon = null;

              if (isEvaluated) {
                if (isCorrectAnswer) {
                  borderClass = 'border-green-500'; bgClass = isDark ? 'bg-green-900/30' : 'bg-green-50'; textClass = isDark ? 'text-green-300' : 'text-green-800';
                  Icon = <CheckCircleIcon color="#22c55e" size={24} />;
                } else if (isSelected && !isCorrectAnswer) {
                  borderClass = 'border-red-500'; bgClass = isDark ? 'bg-red-900/30' : 'bg-red-50'; textClass = isDark ? 'text-red-300' : 'text-red-800';
                  Icon = <XCircleIcon color="#ef4444" size={24} />;
                } else {
                  borderClass = isDark ? 'border-gray-900 opacity-30' : 'border-gray-100 opacity-50';
                  bgClass = isDark ? 'bg-gray-900 opacity-30' : 'bg-white opacity-50';
                  textClass = isDark ? 'text-gray-600' : 'text-gray-400';
                }
              }

              return (
                <TouchableOpacity 
                  key={idx}
                  onPress={() => !isEvaluated && setSelectedAnswer(option)}
                  activeOpacity={isEvaluated ? 1 : 0.7}
                  className={`flex-row justify-between items-center p-4 rounded-2xl mb-3 border-2 ${borderClass} ${bgClass}`}
                >
                  <Text className={`text-lg font-medium flex-1 ${textClass}`}>{option}</Text>
                  {Icon}
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Explanation Box */}
          {isEvaluated && (
            <View className={`p-5 rounded-3xl mb-6 border ${isDark ? 'bg-indigo-900/20 border-indigo-900' : 'bg-indigo-50 border-indigo-100'}`}>
              <View className="flex-row items-center mb-2">
                <InformationCircleIcon color={isDark ? "#818cf8" : "#4f46e5"} size={20} />
                <Text className={`font-bold ml-2 ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>Why is this correct?</Text>
              </View>
              <Text className={`text-base leading-6 ${isDark ? 'text-gray-300' : 'text-indigo-900'}`}>
                {currentQ.explanation}
              </Text>
            </View>
          )}

          {/* Action Button */}
          <TouchableOpacity 
            onPress={isEvaluated ? nextQuestion : checkAnswer}
            disabled={!selectedAnswer}
            className={`py-4 rounded-full shadow-sm mb-6 ${
              !selectedAnswer
                ? (isDark ? 'bg-gray-800' : 'bg-gray-300') 
                : (isDark ? 'bg-indigo-600' : 'bg-blue-900')
            }`}
          >
            <Text className={`text-lg font-bold text-center ${(!selectedAnswer) && isDark ? 'text-gray-600' : 'text-white'}`}>
              {isEvaluated ? (currentIndex === grammarPracticeData.length - 1 ? 'Finish Set' : 'Next Question') : 'Check Answer'}
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    </View>
  );
}