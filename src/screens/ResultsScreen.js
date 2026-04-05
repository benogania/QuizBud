import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useQuizStore } from '../store/useQuizStore'; 
import { ArrowLeftIcon, ExclamationTriangleIcon } from 'react-native-heroicons/outline';
import { CheckCircleIcon, XCircleIcon } from 'react-native-heroicons/solid';

export default function ResultsScreen({ route, navigation }) {
  // Pull theme and quizzes from the store
  const { theme, quizzes } = useQuizStore();
  const isDark = theme === 'dark';

  // 1. Destructure route params (added quizId as a fallback)
  const { score, totalPoints, history, quiz, quizId } = route.params;

  // 2. BULLETPROOF QUIZ LOOKUP: 
  // If the full 'quiz' object didn't pass through navigation, find it in the store!
  const targetQuizId = quiz?.id || quizId;
  const quizToRetake = quiz || quizzes.find(q => q.id === targetQuizId);

  // Modal State
  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);

  const percentage = Math.round((score / totalPoints) * 100);
  
  let grade = 'F';
  if (percentage >= 90) grade = 'A';
  else if (percentage >= 80) grade = 'B';
  else if (percentage >= 70) grade = 'C';
  else if (percentage >= 60) grade = 'D';

  const correctCount = history.filter(h => h.isCorrect).length;

  const handleRetake = () => {
    if (quizToRetake) {
      navigation.navigate('QuizPlayer', { quiz: quizToRetake });
    } else {
      setIsErrorModalVisible(true);
    }
  };

  return (
    <View className={`flex-1 pt-12 ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 mb-4">
        <TouchableOpacity onPress={() => navigation.navigate('MainTabs')} className="p-2 -ml-2">
          <ArrowLeftIcon color={isDark ? "white" : "#1e3a8a"} size={24} />
        </TouchableOpacity>
        <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-blue-900'}`}>Quiz Results</Text>
        <Text className={`text-lg font-black tracking-tighter ${isDark ? 'text-indigo-400' : 'text-blue-900'}`}>QuizBud</Text>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Mastery Circle */}
        <View className="items-center mt-6 mb-12">
          <View className={`w-52 h-52 rounded-full border-[14px] items-center justify-center relative z-0 ${isDark ? 'border-indigo-500 bg-gray-900' : 'border-indigo-800 bg-gray-50'}`}>
            <Text className={`text-5xl font-black ${isDark ? 'text-white' : 'text-indigo-900'}`}>{percentage}%</Text>
            <Text className={`text-xs font-bold tracking-widest mt-1 ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>MASTERY</Text>
            
            <View className={`absolute -bottom-6 px-8 py-2 rounded-full border-4 shadow-sm z-10 ${isDark ? 'bg-yellow-500 border-[#0f172a]' : 'bg-yellow-300 border-gray-50'}`}>
              <Text className="font-black text-lg text-yellow-900">Grade: {grade}</Text>
            </View>
          </View>
        </View>

        {/* Score Cards */}
        <View className="flex-row justify-center mb-10">
          <View className={`rounded-3xl w-32 py-5 items-center shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <Text className={`text-xs font-bold tracking-widest mb-1 ${isDark ? 'text-indigo-300' : 'text-indigo-900'}`}>SCORE</Text>
            <Text className={`text-2xl font-black ${isDark ? 'text-white' : 'text-indigo-700'}`}>{score}</Text>
          </View>
          
          <View className={`rounded-3xl w-32 py-5 items-center shadow-sm ml-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <Text className={`text-xs font-bold tracking-widest mb-1 ${isDark ? 'text-indigo-300' : 'text-indigo-900'}`}>CORRECT</Text>
            <Text className={`text-2xl font-black ${isDark ? 'text-white' : 'text-indigo-700'}`}>{correctCount}/{history.length}</Text>
          </View>
        </View>

        {/* Feedback Header */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Detailed Feedback</Text>
          <View className={`${isDark ? 'bg-indigo-900/40' : 'bg-indigo-100'} px-3 py-1 rounded-full`}>
            <Text className={`text-[10px] font-bold tracking-wider uppercase ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>
              {history.length} Questions
            </Text>
          </View>
        </View>

        {/* Feedback List */}
        {history.map((item, index) => {
          const isCorrect = item.isCorrect;
          
          return (
            <View 
              key={index} 
              className={`p-5 rounded-3xl mb-4 shadow-sm border-l-[6px] ${isDark ? 'bg-gray-800' : 'bg-white'} ${isCorrect ? 'border-transparent' : 'border-red-500'}`}
            >
              <View className="flex-row items-center mb-3">
                <View className={`px-2 py-1 rounded border ${isCorrect ? 'bg-green-600 border-green-700' : 'bg-red-600 border-red-700'}`}>
                  <Text className="text-[10px] text-white font-black tracking-wider uppercase">
                    {isCorrect ? 'Correct' : 'Incorrect'}
                  </Text>
                </View>
                <Text className={`text-xs font-medium ml-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Question {(index + 1).toString().padStart(2, '0')}</Text>
              </View>

              <Text className={`text-base font-bold leading-6 mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {item.question}
              </Text>

              {!isCorrect ? (
                <View className={`flex-row items-center px-4 py-2.5 rounded-full self-start mb-2 ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}>
                  <XCircleIcon color="#ef4444" size={18} />
                  <Text className={`font-medium ml-2 ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                    {item.userAnswer ? item.userAnswer : 'Skipped'} (Your answer)
                  </Text>
                </View>
              ) : null}

              <View className={`flex-row items-center px-4 py-2.5 rounded-full self-start ${isDark ? 'bg-indigo-900/30' : 'bg-indigo-50'}`}>
                <CheckCircleIcon color={isDark ? "#818cf8" : "#4338ca"} size={18} />
                <Text className={`font-medium ml-2 ${isDark ? 'text-indigo-300' : 'text-indigo-900'}`}>
                  {isCorrect ? (item.userAnswer ? item.userAnswer : 'Skipped') : `${item.correctAnswer} (Correct)`}
                </Text>
              </View>
            </View>
          );
        })}

        <View className="h-4" />
      </ScrollView>

      {/* Footer Buttons */}
      <View className={`px-5 pt-4 pb-8 border-t ${isDark ? 'bg-[#0f172a] border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
        <TouchableOpacity 
          className={`py-4 rounded-full shadow-sm mb-3 ${isDark ? 'bg-indigo-600' : 'bg-indigo-800'}`}
          onPress={() => navigation.navigate('MainTabs')}
        >
          <Text className="text-white text-center font-bold text-base">Finish & Exit</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className={`py-4 rounded-full shadow-sm ${isDark ? 'bg-gray-800' : 'bg-indigo-300'}`}
          onPress={handleRetake}
        >
          <Text className={`text-center font-bold text-base ${isDark ? 'text-white' : 'text-indigo-900'}`}>Retake Quiz</Text>
        </TouchableOpacity>
      </View>

      {/* MODERN UI ERROR MODAL */}
      <Modal animationType="fade" transparent={true} visible={isErrorModalVisible} onRequestClose={() => setIsErrorModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" }}>
          <View className={`w-10/12 rounded-[32px] p-6 shadow-2xl items-center ${isDark ? "bg-gray-900" : "bg-white"}`}>
            
            <View className={`w-16 h-16 rounded-full self-center items-center justify-center mb-4 ${isDark ? 'bg-red-900/40' : 'bg-red-100'}`}>
              <ExclamationTriangleIcon color={isDark ? "#f87171" : "#ef4444"} size={32} />
            </View>
            
            <Text className={`text-xl font-extrabold mb-2 text-center ${isDark ? "text-white" : "text-gray-900"}`}>
              Quiz Unavailable
            </Text>
            <Text className={`text-sm text-center mb-8 px-2 leading-5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              We couldn't find the data for this quiz. It may have been generated from a temporary session or deleted from your library.
            </Text>
            
            <TouchableOpacity 
              className="bg-indigo-600 w-full py-4 rounded-full shadow-sm" 
              onPress={() => setIsErrorModalVisible(false)}
            >
              <Text className="text-white font-bold text-center text-base">Got it</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </View>
  );
}