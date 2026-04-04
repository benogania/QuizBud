import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useQuizStore } from '../store/useQuizStore'; // Import the store
import { ArrowLeftIcon } from 'react-native-heroicons/outline';
import { CheckCircleIcon, XCircleIcon } from 'react-native-heroicons/solid';

export default function ResultsScreen({ route, navigation }) {
  // Pull theme from the store
  const { theme } = useQuizStore();
  const isDark = theme === 'dark';

  const { score, totalPoints, history, quiz } = route.params;

  const percentage = Math.round((score / totalPoints) * 100);
  
  let grade = 'F';
  if (percentage >= 90) grade = 'A';
  else if (percentage >= 80) grade = 'B';
  else if (percentage >= 70) grade = 'C';
  else if (percentage >= 60) grade = 'D';

  const correctCount = history.filter(h => h.isCorrect).length;

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
          onPress={() => {
            if (quiz) {
              navigation.navigate('QuizPlayer', { quiz: quiz });
            } else {
              Alert.alert(
                "Cannot Retake", 
                "This quiz has been deleted from your library or the data is no longer available."
              );
            }
          }}
        >
          <Text className={`text-center font-bold text-base ${isDark ? 'text-white' : 'text-indigo-900'}`}>Retake Quiz</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}