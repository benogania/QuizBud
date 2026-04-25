import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuizStore } from "../store/useQuizStore";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context"; 
import { triggerHaptic } from '../utils/hapticHelper';

import { ArrowLeftIcon, ChevronRightIcon } from "react-native-heroicons/outline";
import { ClockIcon } from "react-native-heroicons/solid";

// Helper function to format the date nicely
const formatHistoryDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function RecentActivityScreen() {
  const { theme, quizzes, quizHistory = [], hapticsEnabled } = useQuizStore();
  const isDark = theme === "dark";
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const popAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
    ]).start();

    setTimeout(() => {
      Animated.spring(popAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();
    }, 300); 
  }, []);

  // Filter to just the past 7 days (Optional: Remove the filter to show ALL time)
  const pastWeekHistory = quizHistory.filter(item => {
    const itemDate = new Date(item.date);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return itemDate >= sevenDaysAgo;
  }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort newest first

  return (
    <View className="flex-1">
      {/* Background Gradient matching LibraryScreen */}
      <LinearGradient 
        colors={isDark ? ["#0f172a", "#09090b"] : ["#fbf8ff", "#e0e0fa"]} 
        className="absolute inset-0" 
      />

      <View className="flex-1" style={{ paddingTop: insets.top }}>
        
        {/* Header */}
        <View className={`flex-row items-center px-5 py-4 border-b ${isDark ? 'border-gray-800' : 'border-indigo-100'}`}>
          <TouchableOpacity 
            onPress={() => { triggerHaptic(hapticsEnabled); navigation.goBack(); }} 
            className="p-2 -ml-2"
          >
            <ArrowLeftIcon color={isDark ? "white" : "#1e3a8a"} size={24} />
          </TouchableOpacity>
          <Text className={`text-xl font-black ml-2 ${isDark ? 'text-white' : 'text-blue-900'}`}>
            Past 7 Days
          </Text>
        </View>

        <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            
            <View className="flex-row items-center justify-between mb-6">
              <View>
                <Text className={`text-2xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>Activity Log</Text>
                <Text className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Review your performance from this week</Text>
              </View>
              <View className={`p-3 rounded-2xl shadow-sm ${isDark ? 'bg-indigo-900/40' : 'bg-white shadow-slate-200'}`}>
                 <ClockIcon color={isDark ? "#818cf8" : "#4f46e5"} size={24} />
              </View>
            </View>

            {pastWeekHistory.length === 0 ? (
              <View className={`rounded-[24px] p-8 mt-4 border items-center shadow-sm ${isDark ? "bg-gray-800 border-gray-700 shadow-none" : "bg-white border-slate-100 shadow-slate-200/50"}`}>
                <ClockIcon color={isDark ? "#4b5563" : "#cbd5e1"} size={48} />
                <Text className={`font-bold text-lg mt-4 text-center ${isDark ? "text-gray-300" : "text-gray-700"}`}>No recent activity</Text>
                <Text className={`text-sm text-center mt-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>You haven't taken any quizzes in the past 7 days.</Text>
              </View>
            ) : (
              pastWeekHistory.map((historyItem, index) => {
                const percentage = Math.round((historyItem.score / historyItem.totalPoints) * 100);
                
                // Ring and Text Colors based on score
                let ringColorClass = "border-red-600";
                let textColClass = "text-red-600";
                
                if (percentage >= 75) { 
                  ringColorClass = "border-indigo-600"; 
                  textColClass = "text-indigo-700"; 
                } else if (percentage >= 50) { 
                  ringColorClass = "border-amber-500"; 
                  textColClass = "text-amber-600"; 
                }

                const fallbackQuizItem = quizzes.find(item => (item.quiz || item).title === historyItem.quizTitle);
                const retakeQuizData = historyItem.originalQuiz || (fallbackQuizItem ? fallbackQuizItem.quiz || fallbackQuizItem : null);
                
                const displayDate = formatHistoryDate(historyItem.date);

                return (
                  <View 
                    key={historyItem.id || index} 
                    className={`rounded-[24px] p-5 mb-4 border shadow-xl ${isDark ? "bg-gray-800 border-gray-700 shadow-none" : "bg-white border-slate-100 shadow-slate-300/70"}`}
                  >
                    <View className="flex-row justify-between items-center">
                      
                      {/* Left Content */}
                      <View className="flex-1 pr-4">
                        <Text className={`text-[15px] font-bold mb-1 leading-tight ${isDark ? "text-white" : "text-gray-900"}`} numberOfLines={1}>
                          {historyItem.quizTitle}
                        </Text>
                        <Text className={`text-xs font-semibold ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          {displayDate} • {historyItem.score}/{historyItem.totalPoints} Points Earned
                        </Text>
                      </View>
                      
                      {/* Right Circular Ring Badge */}
                      <Animated.View style={{ transform: [{ scale: popAnim }] }} className={`w-[52px] h-[52px] rounded-full border-[3.5px] items-center justify-center ${isDark && ringColorClass.includes('indigo') ? 'border-indigo-400' : ringColorClass}`}>
                        <Text className={`text-sm font-black ${isDark && textColClass.includes('indigo') ? 'text-indigo-300' : textColClass}`}>
                          {percentage}%
                        </Text>
                      </Animated.View>

                    </View>

                    {/* Full Width Review Button */}
                    <TouchableOpacity 
                      className={`mt-4 py-3.5 rounded-xl flex-row justify-center items-center ${isDark ? "bg-indigo-900/40" : "bg-[#edecff]"}`} 
                      onPress={() => { triggerHaptic(hapticsEnabled, 'Light'); navigation.navigate("Results", { score: historyItem.score, totalPoints: historyItem.totalPoints, history: historyItem.history, quizTitle: historyItem.quizTitle, quiz: retakeQuizData }); }}
                    >
                      <Text className={`font-bold text-sm ${isDark ? "text-indigo-300" : "text-indigo-600"}`}>Review</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}

          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}