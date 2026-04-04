import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useQuizStore } from '../store/useQuizStore'; // Import the store
import { XMarkIcon, ClockIcon, ArrowLeftIcon } from 'react-native-heroicons/outline';
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon, FireIcon } from 'react-native-heroicons/solid';

export default function TimeAttackScreen({ route, navigation }) {
  const { quiz } = route.params;
  
  // Pull theme from store
  const { theme } = useQuizStore();
  const isDark = theme === 'dark';

  const questions = quiz.questions.filter(q => q.type === 'multiple_choice' || q.type === 'true_false');
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [maxCombo, setMaxCombo] = useState(1);
  
  const [isGameOver, setIsGameOver] = useState(false);
  const [history, setHistory] = useState([]);

  const startGame = () => {
    setCurrentIndex(0);
    setTimeLeft(60);
    setScore(0);
    setCombo(1);
    setMaxCombo(1);
    setHistory([]);
    setIsGameOver(false);
  };

  useEffect(() => {
    if (questions.length === 0) return; 
    
    if (!isGameOver && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0) {
      setIsGameOver(true);
    }
  }, [timeLeft, isGameOver]);

  const handleAnswer = (selectedOption, correctIdx) => {
    if (isGameOver) return;
    const currentQ = questions[currentIndex];
    const isCorrect = currentQ.options.indexOf(selectedOption) === correctIdx;

    setHistory(prev => [...prev, {
      question: currentQ.question,
      userAnswer: selectedOption,
      correctAnswer: currentQ.options[correctIdx],
      isCorrect: isCorrect
    }]);

    if (isCorrect) {
      setScore(prev => prev + (100 * combo));
      setCombo(prev => {
        const newCombo = prev + 1;
        if (newCombo > maxCombo) setMaxCombo(newCombo);
        return newCombo;
      });
    } else {
      setCombo(1); 
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsGameOver(true); 
    }
  };

  if (questions.length === 0) {
    return (
      <View className={`flex-1 items-center justify-center px-5 ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
        <Text className={`text-center font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Time Attack requires Multiple Choice or True/False questions.
        </Text>
        <TouchableOpacity className="mt-4 bg-orange-600 px-6 py-3 rounded-full" onPress={() => navigation.goBack()}>
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ==========================================
  // RESULTS & REVIEW UI
  // ==========================================
  if (isGameOver) {
    const correctCount = history.filter(h => h.isCorrect).length;
    
    return (
      <View className={`flex-1 pt-12 ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
        <View className="flex-row items-center justify-between px-5 mb-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
            <ArrowLeftIcon color={isDark ? "white" : "#1e3a8a"} size={24} />
          </TouchableOpacity>
          <Text className={`text-lg font-bold ${isDark ? 'text-orange-400' : 'text-orange-900'}`}>Time Attack Results</Text>
          <View className="w-8" />
        </View>

        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          <View className={`${isDark ? 'bg-orange-900/30 border border-orange-900/50' : 'bg-orange-600'} rounded-[40px] p-8 items-center shadow-lg mb-8 mt-4`}>
            <Text className="text-orange-200 font-bold tracking-widest uppercase text-xs mb-2">Final Score</Text>
            <Text className={`text-6xl font-black mb-6 ${isDark ? 'text-orange-400' : 'text-white'}`}>{score}</Text>
            
            <View className="flex-row space-x-4 w-full">
              <View className={`${isDark ? 'bg-orange-950/50' : 'bg-orange-700'} flex-1 py-4 rounded-2xl items-center border border-orange-500`}>
                <Text className="text-orange-200 text-[10px] font-bold uppercase mb-1">Answered</Text>
                <Text className="text-xl font-bold text-white">{history.length}</Text>
              </View>
              <View className={`${isDark ? 'bg-orange-950/50' : 'bg-orange-700'} flex-1 py-4 rounded-2xl items-center border border-orange-500`}>
                <Text className="text-orange-200 text-[10px] font-bold uppercase mb-1 flex-row items-center">
                  <FireIcon color="#fed7aa" size={12} /> Max Combo
                </Text>
                <Text className="text-xl font-bold text-white">x{maxCombo}</Text>
              </View>
            </View>
          </View>

          <Text className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>
            Speed Review ({correctCount}/{history.length} Correct)
          </Text>
          
          {history.map((item, index) => (
            <View 
              key={index} 
              className={`p-5 rounded-3xl mb-4 shadow-sm border-l-[6px] ${isDark ? 'bg-gray-800' : 'bg-white'} ${item.isCorrect ? 'border-green-400' : 'border-red-400'}`}
            >
              <Text className={`text-sm font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>{item.question}</Text>
              
              {!item.isCorrect && (
                <View className={`flex-row items-center px-3 py-2 rounded-xl self-start mb-2 ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}>
                  <XCircleIcon color="#ef4444" size={16} />
                  <Text className={`font-bold text-xs ml-2 ${isDark ? 'text-red-300' : 'text-red-700'}`}>{item.userAnswer}</Text>
                </View>
              )}
              
              <View className={`flex-row items-center px-3 py-2 rounded-xl self-start ${isDark ? 'bg-green-900/30' : 'bg-green-50'}`}>
                <CheckCircleIcon color="#22c55e" size={16} />
                <Text className={`font-bold text-xs ml-2 ${isDark ? 'text-green-300' : 'text-green-800'}`}>{item.correctAnswer}</Text>
              </View>
            </View>
          ))}
          <View className="h-10" />
        </ScrollView>

        <View className={`px-5 pt-4 pb-8 border-t flex-row justify-between ${isDark ? 'bg-[#0f172a] border-gray-800' : 'bg-white border-gray-100'}`}>
          <TouchableOpacity 
            className={`py-4 rounded-full w-[48%] items-center ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`} 
            onPress={() => navigation.goBack()}
          >
            <Text className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-800'}`}>Exit Game</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`py-4 rounded-full w-[48%] items-center flex-row justify-center shadow-lg ${isDark ? 'bg-orange-600' : 'bg-orange-600 shadow-orange-300'}`} 
            onPress={startGame}
          >
            <ArrowPathIcon color="white" size={20} />
            <Text className="text-white font-bold text-base ml-2">Play Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ==========================================
  // GAMEPLAY UI
  // ==========================================
  const currentQ = questions[currentIndex];

  return (
    <View className={`flex-1 pt-12 px-5 ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
      <View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <XMarkIcon color="#ef4444" size={28} />
        </TouchableOpacity>
        <View className={`flex-row items-center px-4 py-2 rounded-full ${timeLeft <= 10 ? (isDark ? 'bg-red-900/40' : 'bg-red-100') : (isDark ? 'bg-orange-900/40' : 'bg-orange-100')}`}>
          <ClockIcon color={timeLeft <= 10 ? '#ef4444' : '#f97316'} size={24} />
          <Text className={`text-xl font-black ml-2 ${timeLeft <= 10 ? 'text-red-500' : 'text-orange-500'}`}>{timeLeft}s</Text>
        </View>
        <View className={`flex-row items-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'} px-3 py-1 rounded-full`}>
           <FireIcon color="#f97316" size={16} />
           <Text className={`text-sm font-bold ml-1 ${isDark ? 'text-white' : 'text-gray-500'}`}>x{combo}</Text>
        </View>
      </View>

      <Text className={`text-center text-4xl font-black mb-8 ${isDark ? 'text-indigo-400' : 'text-indigo-900'}`}>{score}</Text>

      <View className={`p-6 rounded-3xl shadow-sm mb-6 flex-1 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <Text className={`text-2xl font-bold mb-8 text-center ${isDark ? 'text-white' : 'text-gray-800'}`}>{currentQ.question}</Text>
        {currentQ.options.map((option, idx) => (
          <TouchableOpacity 
            key={idx}
            onPress={() => handleAnswer(option, currentQ.correctAnswerIndex)}
            className={`p-4 rounded-2xl mb-3 shadow-sm border ${isDark ? 'bg-indigo-900/20 border-indigo-900/50' : 'bg-indigo-50 border-indigo-100'}`}
          >
            <Text className={`text-lg font-bold text-center ${isDark ? 'text-indigo-300' : 'text-indigo-900'}`}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}