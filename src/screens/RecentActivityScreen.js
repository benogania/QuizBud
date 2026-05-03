import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuizStore } from '../store/useQuizStore';
import { triggerHaptic } from '../utils/hapticHelper';

import { 
  ArrowLeftIcon, 
  ClockIcon, 
  FireIcon,
  AcademicCapIcon,
  ArrowPathIcon
} from 'react-native-heroicons/outline';

const formatFullDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: '2-digit', minute: '2-digit' });
};

export default function RecentActivityScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme, hapticsEnabled, quizHistory = [], quizzes = [] } = useQuizStore();
  const isDark = theme === 'dark';

  // 🚨 NEW: 30-Day Filter Logic
  const recent30DaysHistory = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return quizHistory.filter(item => {
      if (!item.date) return false;
      return new Date(item.date) >= thirtyDaysAgo;
    });
  }, [quizHistory]);

  const handleRetake = (historyItem) => {
    triggerHaptic(hapticsEnabled, 'Light');
    
    // Find if the quiz still exists in the library
    const fallbackQuizItem = quizzes.find((item) => (item.quiz || item).title === historyItem.quizTitle);
    const quizToRetake = historyItem.originalQuiz || (fallbackQuizItem ? fallbackQuizItem.quiz || fallbackQuizItem : null);

    if (quizToRetake) {
      navigation.navigate("QuizPlayer", { quiz: quizToRetake });
    } else {
      Alert.alert("Quiz Unavailable", "This quiz has been deleted from your library and cannot be retaken.");
    }
  };

  return (
    <View className={`flex-1 ${isDark ? "bg-[#0f172a]" : "bg-gray-50"}`} style={{ paddingTop: insets.top }}>
      
      {/* Header */}
      <View className={`flex-row items-center px-5 py-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <TouchableOpacity onPress={() => { triggerHaptic(hapticsEnabled); navigation.goBack(); }} className="p-2 -ml-2">
          <ArrowLeftIcon color={isDark ? "white" : "#1e3a8a"} size={24} />
        </TouchableOpacity>
        <Text className={`text-xl font-black ml-2 ${isDark ? 'text-white' : 'text-blue-900'}`}>Quiz History</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        <View className="flex-row items-center mb-1">
          <ClockIcon color={isDark ? "#a5b4fc" : "#4f46e5"} size={28} />
          <Text className={`text-2xl font-black ml-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Recent Activity</Text>
        </View>
        <Text className={`text-sm mb-6 ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Showing your quizzes from the last 30 days.</Text>

        {/* 🚨 Use the filtered array instead of the raw quizHistory */}
        {recent30DaysHistory.length === 0 ? (
          <View className={`rounded-[32px] p-8 mt-4 border-2 border-dashed items-center ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
            <AcademicCapIcon color={isDark ? "#4b5563" : "#9ca3af"} size={48} />
            <Text className={`text-lg font-bold mt-4 text-center ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>No recent history!</Text>
            <Text className={`text-sm text-center mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Take a quiz or play the Daily Challenge to start tracking your progress.</Text>
          </View>
        ) : (
          [...recent30DaysHistory].reverse().map((historyItem, index) => {
            const percentage = Math.round((historyItem.score / historyItem.totalPoints) * 100);
            const isDaily = historyItem.quizTitle.includes("Daily");
            
            // Determine ring colors based on score
            let ringColorClass = "bg-red-100 text-red-600"; 
            if (percentage >= 75) { ringColorClass = isDark ? "bg-indigo-900/40 text-indigo-300" : "bg-indigo-100 text-indigo-700"; } 
            else if (percentage >= 50) { ringColorClass = isDark ? "bg-amber-900/40 text-amber-400" : "bg-amber-100 text-amber-600"; }

            // Check if quiz still exists for retake
            const fallbackQuizItem = quizzes.find((item) => (item.quiz || item).title === historyItem.quizTitle);
            const quizExists = !!(historyItem.originalQuiz || fallbackQuizItem);

            return (
              <View key={historyItem.id || index} className={`rounded-[24px] p-5 mb-4 border shadow-sm ${isDark ? "bg-gray-800 border-gray-700 shadow-none" : "bg-white border-slate-100 shadow-slate-200/50"}`}>
                
                {/* Header Row */}
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1 pr-3">
                    <View className="flex-row items-center mb-1">
                      {isDaily && <FireIcon color="#fbbf24" size={16} style={{ marginRight: 4 }} />}
                      <Text className={`text-[10px] font-bold uppercase tracking-widest ${isDaily ? 'text-amber-500' : (isDark ? 'text-indigo-400' : 'text-indigo-600')}`}>
                        {isDaily ? 'Daily Challenge' : 'Standard Quiz'}
                      </Text>
                    </View>
                    <Text className={`text-lg font-black leading-tight ${isDark ? "text-white" : "text-gray-900"}`}>{historyItem.quizTitle}</Text>
                    <Text className={`text-xs mt-1 font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>{formatFullDate(historyItem.date)}</Text>
                  </View>
                  
                  {/* Score Badge */}
                  <View className={`px-3 py-2 rounded-xl items-center justify-center ${ringColorClass.split(' ')[0]}`}>
                    <Text className={`text-sm font-black ${ringColorClass.split(' ')[1]}`}>{percentage}%</Text>
                    <Text className={`text-[8px] font-bold uppercase ${ringColorClass.split(' ')[1]} opacity-80`}>{historyItem.score}/{historyItem.totalPoints} pts</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View className="flex-row mt-2 space-x-3 w-full">
                  <TouchableOpacity 
                    className={`flex-1 py-3 rounded-xl items-center ${isDark ? "bg-gray-700" : "bg-gray-100"}`} 
                    onPress={() => navigation.navigate("Results", { score: historyItem.score, totalPoints: historyItem.totalPoints, history: historyItem.history, quizTitle: historyItem.quizTitle, quiz: historyItem.originalQuiz })}
                  >
                    <Text className={`font-bold text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>View Results</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    className={`flex-1 py-3 rounded-xl items-center flex-row justify-center ${!quizExists ? (isDark ? 'bg-gray-800 opacity-50' : 'bg-gray-100 opacity-50') : (isDark ? 'bg-indigo-600' : 'bg-indigo-600')}`} 
                    onPress={() => handleRetake(historyItem)}
                    disabled={!quizExists}
                  >
                    <ArrowPathIcon color={!quizExists ? (isDark ? '#6b7280' : '#9ca3af') : "white"} size={16} />
                    <Text className={`font-bold text-sm ml-2 ${!quizExists ? (isDark ? 'text-gray-500' : 'text-gray-400') : 'text-white'}`}>
                      {quizExists ? 'Retake' : 'Deleted'}
                    </Text>
                  </TouchableOpacity>
                </View>

              </View>
            );
          })
        )}

      </ScrollView>
    </View>
  );
}