import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useQuizStore } from '../store/useQuizStore';
import { Cog6ToothIcon, ChartBarIcon, BoltIcon, StarIcon } from 'react-native-heroicons/solid';

export default function Dashboard({ navigation }) {
  const { totalXP, quizzesDone, personalBests, recentResults, studyConsistency } = useQuizStore();

  return (
    <ScrollView className="flex-1 bg-gray-50 pt-12 px-5">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-6">
        <View className="flex-row items-center">
          <ChartBarIcon color="#1e3a8a" size={24} />
          <Text className="text-xl font-bold text-blue-900 ml-2">QuizBud</Text>
        </View>
        <TouchableOpacity>
          <Cog6ToothIcon color="#6b7280" size={24} />
        </TouchableOpacity>
      </View>

      <Text className="text-3xl font-extrabold text-blue-900 mb-2">Your Learning Hub</Text>
      <Text className="text-gray-500 mb-6">Focus on your goals. All your progress is stored locally for instant access.</Text>

      {/* Top Stats */}
      <View className="flex-row justify-between mb-6">
        <View className="bg-white p-4 rounded-3xl w-[48%] shadow-sm">
          <Text className="text-xs text-gray-400 font-bold tracking-wider mb-1">TOTAL XP</Text>
          <Text className="text-2xl font-black text-blue-900">{totalXP.toLocaleString()} <Text className="text-sm text-yellow-500">xp</Text></Text>
        </View>
        <View className="bg-white p-4 rounded-3xl w-[48%] shadow-sm">
          <Text className="text-xs text-gray-400 font-bold tracking-wider mb-1">QUIZZES DONE</Text>
          <Text className="text-2xl font-black text-blue-900">{quizzesDone}</Text>
        </View>
      </View>

      {/* Personal Bests Card */}
      <View className="bg-blue-900 rounded-3xl p-6 mb-6 shadow-md">
        <Text className="text-white text-lg font-bold mb-4">Personal Bests</Text>
        
        <View className="flex-row items-center mb-4">
          <View className="bg-blue-800 p-2 rounded-full mr-4">
             <BoltIcon color="white" size={20} />
          </View>
          <View>
            <Text className="text-blue-200 text-xs font-bold uppercase">Fastest Finish</Text>
            <Text className="text-white font-bold">{personalBests.fastestFinish} min</Text>
          </View>
        </View>

        <View className="flex-row items-center mb-6">
          <View className="bg-blue-800 p-2 rounded-full mr-4">
             <StarIcon color="white" size={20} />
          </View>
          <View>
            <Text className="text-blue-200 text-xs font-bold uppercase">Perfect Score Streak</Text>
            <Text className="text-white font-bold">{personalBests.perfectStreak} quizzes</Text>
          </View>
        </View>

        <TouchableOpacity className="bg-white rounded-full py-3 items-center">
          <Text className="text-blue-900 font-bold">View Hall of Fame</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Results */}
      <View className="bg-white rounded-3xl p-6 mb-6 shadow-sm">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-lg font-bold text-blue-900">Recent Results</Text>
          <Text className="text-xs text-gray-400">Last 7 Days</Text>
        </View>

        {recentResults.map((result) => (
          <View key={result.id} className="mb-4 border border-gray-100 rounded-2xl p-4">
            <Text className="font-bold text-gray-800">{result.title}</Text>
            <Text className="text-xs text-gray-400 mb-2">{result.date}</Text>
            
            <View className="flex-row justify-between mb-1">
              <Text className="text-xs font-bold text-gray-500">Mastery</Text>
              <Text className="text-xs font-bold text-gray-800">{result.mastery}%</Text>
            </View>
            
            {/* Progress Bar */}
            <View className="h-2 bg-gray-200 rounded-full mb-3">
              <View className="h-2 bg-blue-800 rounded-full" style={{ width: `${result.mastery}%` }} />
            </View>
            
            <Text className="font-bold text-blue-900">{result.score}</Text>
          </View>
        ))}
      </View>
      
      {/* Bottom spacing for navigation bar mock */}
      <View className="h-20" />
    </ScrollView>
  );
}