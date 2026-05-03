import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useQuizStore } from '../store/useQuizStore'; 
import { XMarkIcon, EllipsisVerticalIcon, HandRaisedIcon, CheckIcon } from 'react-native-heroicons/outline';

const { width } = Dimensions.get('window');

export default function FlashcardScreen({ route, navigation }) {
  // Pull theme from the store
  const { theme } = useQuizStore();
  const isDark = theme === 'dark';

  const { quiz } = route.params;
  const questions = quiz.questions || [];
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Animation values
  const flipAnim = useRef(new Animated.Value(0)).current;

  const flipCard = () => {
    Animated.spring(flipAnim, {
      toValue: isFlipped ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const frontInterpolate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backInterpolate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  const frontAnimatedStyle = { transform: [{ rotateY: frontInterpolate }] };
  const backAnimatedStyle = { transform: [{ rotateY: backInterpolate }], position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backfaceVisibility: 'hidden' };

  const nextCard = () => {
    if (currentIndex < questions.length - 1) {
      if (isFlipped) flipCard(); // Reset flip before moving
      setTimeout(() => setCurrentIndex(currentIndex + 1), 150);
    } else {
      navigation.goBack();
    }
  };

  // Functionality for the Confidence Buttons
  const handleConfidenceRating = (knewIt) => {
    nextCard();
  };

  if (questions.length === 0) return <View className={`flex-1 ${isDark ? 'bg-[#0f172a]' : 'bg-white'}`} />;
  const currentQ = questions[currentIndex];

  const answerText = currentQ.type === 'identification' 
    ? currentQ.correctAnswer 
    : currentQ.options[currentQ.correctAnswerIndex];

  return (
    <View className={`flex-1 pt-12 px-5 ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
      {/* Header */}
      <View className="flex-row justify-between items-center mb-4">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <XMarkIcon color={isDark ? "white" : "#1e3a8a"} size={26} />
        </TouchableOpacity>
        <Text className={`text-xl font-black tracking-wide ${isDark ? 'text-indigo-400' : 'text-indigo-900'}`}>QuizBud</Text>
        <TouchableOpacity>
          <EllipsisVerticalIcon color={isDark ? "white" : "#1e3a8a"} size={26} />
        </TouchableOpacity>
      </View>

      <View className={`self-start px-3 py-1 rounded-full mb-2 ${isDark ? 'bg-indigo-900/50' : 'bg-indigo-300'}`}>
        <Text className={`text-[10px] font-bold tracking-widest uppercase ${isDark ? 'text-indigo-300' : 'text-indigo-900'}`}>
          {quiz.subject || quiz.category || 'MASTERY MODE'}
        </Text>
      </View>
      <Text className={`text-2xl font-extrabold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>{quiz.title}</Text>

      {/* 3D Flipping Card - REDUCED HEIGHT to prevent overlap */}
      <TouchableOpacity activeOpacity={1} onPress={flipCard} className="items-center z-10">
        <View style={{ width: width - 40, height: 320 }}>
          
          {/* FRONT OF CARD */}
          <Animated.View 
            style={[frontAnimatedStyle, { backfaceVisibility: 'hidden' }]} 
            className={`flex-1 rounded-[32px] shadow-lg border-t-8 border-yellow-400 p-6 justify-between items-center relative z-20 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
          >
            <Text className={`font-bold tracking-widest uppercase text-[10px] mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Question</Text>
            <Text className={`text-xl font-bold text-center leading-8 ${isDark ? 'text-white' : 'text-gray-900'}`}>{currentQ.question}</Text>
            <View className="items-center mb-2">
              <View className={`p-2.5 rounded-full mb-1.5 ${isDark ? 'bg-indigo-900/40' : 'bg-indigo-50'}`}>
                <HandRaisedIcon color={isDark ? "#818cf8" : "#4f46e5"} size={20} />
              </View>
              <Text className={`font-bold text-xs ${isDark ? 'text-indigo-300' : 'text-indigo-500'}`}>Tap to Flip</Text>
            </View>
            <Text className={`absolute bottom-5 left-6 font-bold text-[10px] uppercase ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Card #{currentIndex + 1}</Text>
          </Animated.View>

          {/* BACK OF CARD */}
          <Animated.View 
            style={[backAnimatedStyle, { backfaceVisibility: 'hidden' }]} 
            className={`flex-1 rounded-[32px] shadow-lg border-t-8 p-6 justify-between items-center ${isDark ? 'bg-indigo-950 border-indigo-500' : 'bg-indigo-900 border-indigo-400'}`}
          >
            <Text className="text-indigo-300 font-bold tracking-widest uppercase text-[10px] mt-2">Answer</Text>
            <Text className="text-2xl font-bold text-white text-center leading-9">{answerText}</Text>
            <View className="items-center mb-2">
              <View className="bg-white/20 p-2.5 rounded-full mb-1.5">
                <HandRaisedIcon color="white" size={20} />
              </View>
              <Text className="text-indigo-200 font-bold text-xs">Tap to Flip Back</Text>
            </View>
            <Text className="absolute bottom-5 left-6 text-indigo-400 font-bold text-[10px] uppercase">Card #{currentIndex + 1}</Text>
          </Animated.View>

        </View>
      </TouchableOpacity>

      {/* Confidence Rating - TWO BUTTONS ONLY, Functionality added */}
      <View className="items-center mt-6">
        <Text className={`font-bold tracking-widest uppercase text-[10px] mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Rate Your Confidence</Text>
        <View className="flex-row space-x-8">
          
          {/* Missed It / X Button */}
          <TouchableOpacity 
            onPress={() => handleConfidenceRating(false)}
            className={`w-14 h-14 rounded-full items-center justify-center shadow-sm ${isDark ? 'bg-red-900/30' : 'bg-red-100'}`}
          >
            <XMarkIcon color="#ef4444" size={28} />
          </TouchableOpacity>
          
          {/* Got It / Check Button */}
          <TouchableOpacity 
            onPress={() => handleConfidenceRating(true)}
            className={`w-14 h-14 rounded-full items-center justify-center shadow-sm ${isDark ? 'bg-green-900/30' : 'bg-green-100'}`}
          >
            <CheckIcon color={isDark ? "#4ade80" : "#16a34a"} size={28} strokeWidth={3} />
          </TouchableOpacity>

        </View>
      </View>

      {/* Next/Finish Button */}
      <TouchableOpacity 
        className={`py-3.5 rounded-full mt-auto mb-8 flex-row justify-center items-center shadow-md ${isDark ? 'bg-indigo-600' : 'bg-indigo-800'}`} 
        onPress={nextCard}
      >
        <Text className="text-white font-bold text-lg">
          {currentIndex === questions.length - 1 ? 'Finish' : 'Next Card →'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}