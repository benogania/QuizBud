import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useQuizStore } from '../store/useQuizStore'; // Import the store
import { XMarkIcon, ArrowLeftIcon } from 'react-native-heroicons/outline';
import { HeartIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon } from 'react-native-heroicons/solid';

export default function SurvivalModeScreen({ route, navigation }) {
  const { quiz } = route.params;

  // Pull theme from store
  const { theme } = useQuizStore();
  const isDark = theme === 'dark';

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lives, setLives] = useState(3);
  
  // Game State & History
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [history, setHistory] = useState([]);

  const startGame = () => {
    // Filter to MCQs only and Randomize
    const validQs = quiz.questions.filter(q => q.type !== 'identification');
    setQuestions(validQs.sort(() => Math.random() - 0.5));
    
    setCurrentIndex(0);
    setLives(3);
    setHistory([]);
    setIsGameOver(false);
    setGameWon(false);
  };

  useEffect(() => {
    startGame();
  }, []);

  const handleAnswer = (selectedOption, correctIdx) => {
    const currentQ = questions[currentIndex];
    const isCorrect = currentQ.options.indexOf(selectedOption) === correctIdx;

    setHistory(prev => [...prev, {
      question: currentQ.question,
      userAnswer: selectedOption,
      correctAnswer: currentQ.options[correctIdx],
      isCorrect: isCorrect
    }]);

    let currentLives = lives;
    if (!isCorrect) {
      currentLives -= 1;
      setLives(currentLives);
    }

    if (currentLives === 0) {
      setIsGameOver(true);
      setGameWon(false);
    } else if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsGameOver(true);
      setGameWon(true);
    }
  };

  if (questions.length === 0) {
    return (
      <View className={`flex-1 items-center justify-center px-5 ${isDark ? 'bg-[#0f172a]' : 'bg-red-900'}`}>
        <Text className={`text-center font-bold ${isDark ? 'text-red-400' : 'text-red-200'}`}>
          Survival Mode requires Multiple Choice questions.
        </Text>
        <TouchableOpacity 
          className={`mt-4 px-6 py-3 rounded-full ${isDark ? 'bg-red-900' : 'bg-white'}`} 
          onPress={() => navigation.goBack()}
        >
          <Text className={`font-bold ${isDark ? 'text-white' : 'text-red-900'}`}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ==========================================
  // RESULTS & REVIEW UI
  // ==========================================
  if (isGameOver) {
    return (
      <View className={`flex-1 pt-12 ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
        <View className="flex-row items-center justify-between px-5 mb-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
            <ArrowLeftIcon color={isDark ? "white" : "#1e3a8a"} size={24} />
          </TouchableOpacity>
          <Text className={`text-lg font-bold ${isDark ? 'text-red-400' : 'text-red-900'}`}>Survival Report</Text>
          <View className="w-8" />
        </View>

        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          <View className={`rounded-[40px] p-8 items-center shadow-lg mb-8 mt-4 ${gameWon ? 'bg-green-700' : (isDark ? 'bg-red-900/40 border border-red-900' : 'bg-red-900')}`}>
            <Text className="text-white font-bold tracking-widest uppercase text-xs mb-2">
              {gameWon ? 'Ultimate Survivor' : 'Game Over'}
            </Text>
            <Text className="text-5xl font-black text-white mb-2 text-center">
              {gameWon ? 'VICTORY' : `Wave ${currentIndex + 1}`}
            </Text>
            <Text className={`${gameWon ? 'text-green-200' : 'text-red-300'} font-bold mb-6`}>
              {gameWon ? 'You beat the entire quiz!' : 'You were eliminated.'}
            </Text>
            
            <View className="flex-row space-x-4 w-full">
              <View className={`flex-1 py-4 rounded-2xl items-center border ${gameWon ? 'bg-green-800 border-green-600' : 'bg-red-800/60 border-red-700'}`}>
                <Text className={`${gameWon ? 'text-green-200' : 'text-red-200'} text-[10px] font-bold uppercase mb-1`}>Survived</Text>
                <Text className="text-xl font-bold text-white">{history.length} / {questions.length}</Text>
              </View>
              <View className={`flex-1 py-4 rounded-2xl items-center flex-row justify-center space-x-1 border ${gameWon ? 'bg-green-800 border-green-600' : 'bg-red-800/60 border-red-700'}`}>
                {[1, 2, 3].map(heart => (
                  <HeartIcon key={heart} color={heart <= lives ? "#ef4444" : (gameWon ? "#166534" : "#450a0a")} size={20} />
                ))}
              </View>
            </View>
          </View>

          <Text className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>Post-Mortem Review</Text>
          {history.map((item, index) => (
            <View key={index} className={`p-5 rounded-3xl mb-4 shadow-sm border-l-[6px] ${isDark ? 'bg-gray-800' : 'bg-white'} ${item.isCorrect ? 'border-green-400' : 'border-red-600'}`}>
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
            <Text className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-800'}`}>Exit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`py-4 rounded-full w-[48%] items-center flex-row justify-center shadow-lg ${gameWon ? 'bg-green-600 shadow-green-300' : 'bg-red-700 shadow-red-300'}`} 
            onPress={startGame}
          >
            <ArrowPathIcon color="white" size={20} />
            <Text className="text-white font-bold text-base ml-2">Try Again</Text>
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
    <View className={`flex-1 pt-12 px-5 ${isDark ? 'bg-[#0f172a]' : 'bg-red-900'}`}>
      <View className="flex-row justify-between items-center mb-10">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <XMarkIcon color={isDark ? "white" : "#fca5a5"} size={28} />
        </TouchableOpacity>
        <View className="flex-row space-x-2">
          {[1, 2, 3].map(heart => (
            <HeartIcon key={heart} color={heart <= lives ? "#ef4444" : (isDark ? "#1e293b" : "#450a0a")} size={32} />
          ))}
        </View>
      </View>

      <Text className={`font-bold tracking-widest uppercase text-xs mb-2 text-center ${isDark ? 'text-red-400' : 'text-red-300'}`}>
        Wave {currentIndex + 1}
      </Text>
      <Text className={`text-3xl font-bold mb-10 text-center leading-10 ${isDark ? 'text-white' : 'text-white'}`}>
        {currentQ.question}
      </Text>

      <View className="flex-1">
        {currentQ.options.map((option, idx) => (
          <TouchableOpacity 
            key={idx}
            onPress={() => handleAnswer(option, currentQ.correctAnswerIndex)}
            className={`p-5 rounded-2xl mb-4 shadow-sm border-2 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-red-800 border-red-700'}`}
          >
            <Text className={`text-xl font-bold text-center ${isDark ? 'text-red-300' : 'text-red-50'}`}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}