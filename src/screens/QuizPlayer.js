import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useQuizStore } from '../store/useQuizStore'; 
import { 
  ChevronLeftIcon, 
  ClockIcon, 
  PlayIcon, 
  ListBulletIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  Cog6ToothIcon,
  SpeakerWaveIcon 
} from 'react-native-heroicons/outline';

export default function QuizPlayer({ route, navigation }) {
  const { theme } = useQuizStore();
  const isDark = theme === 'dark';

  const { quiz } = route.params || {};
  const questions = quiz?.questions || [];

  const [timerMode, setTimerMode] = useState('none'); 
  const [timeValue, setTimeValue] = useState(15); 

  // State for Gameplay Rules
  const [shuffleQuestions, setShuffleQuestions] = useState(false); 
  const [immediateFeedback, setImmediateFeedback] = useState(true); 
  const [autoSpeak, setAutoSpeak] = useState(false); // <-- NEW: Auto-Speak State

  const totalQuestions = questions.length;
  const mcqCount = questions.filter(q => q.type === 'multiple_choice').length;
  const tfCount = questions.filter(q => q.type === 'true_false').length;
  const identCount = questions.filter(q => q.type === 'identification').length;

  const handleTimeAdjust = (amount) => {
    setTimeValue((prev) => Math.max(1, prev + amount));
  };

  const handleModeChange = (mode) => {
    setTimerMode(mode);
    if (mode === 'per_question') setTimeValue(30); 
    if (mode === 'entire_quiz') setTimeValue(15);  
  };

  return (
    <View className={`flex-1 ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
      
      <View className={`flex-row items-center pt-14 pb-4 px-5 border-b ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100 shadow-sm shadow-gray-200'}`}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
          <ChevronLeftIcon color={isDark ? "white" : "#1e3a8a"} size={24} />
        </TouchableOpacity>
        <Text className={`text-xl font-bold ml-2 ${isDark ? 'text-white' : 'text-blue-900'}`}>Quiz Setup</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        
        <View className={`rounded-3xl p-6 mb-6 shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <Text className={`text-2xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>{quiz?.title || 'Unknown Quiz'}</Text>
          <Text className={`mb-6 leading-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {quiz?.description || 'No description provided for this quiz.'}
          </Text>

          <Text className={`text-sm font-bold tracking-widest uppercase mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Question Breakdown
          </Text>
          
          <View className="flex-row items-center mb-3">
            <ListBulletIcon color={isDark ? "#818cf8" : "#4f46e5"} size={20} />
            <Text className={`font-medium ml-3 flex-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Multiple Choice</Text>
            <Text className={`font-bold px-3 py-1 rounded-full ${isDark ? 'text-indigo-300 bg-indigo-900/40' : 'text-indigo-600 bg-indigo-50'}`}>{mcqCount}</Text>
          </View>

          <View className="flex-row items-center mb-3">
            <CheckCircleIcon color={isDark ? "#4ade80" : "#16a34a"} size={20} />
            <Text className={`font-medium ml-3 flex-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>True / False</Text>
            <Text className={`font-bold px-3 py-1 rounded-full ${isDark ? 'text-green-300 bg-green-900/40' : 'text-green-600 bg-green-50'}`}>{tfCount}</Text>
          </View>

          <View className="flex-row items-center mb-4">
            <PencilSquareIcon color={isDark ? "#fb923c" : "#ea580c"} size={20} />
            <Text className={`font-medium ml-3 flex-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Identification</Text>
            <Text className={`font-bold px-3 py-1 rounded-full ${isDark ? 'text-orange-300 bg-orange-900/40' : 'text-orange-600 bg-orange-50'}`}>{identCount}</Text>
          </View>

          <View className={`h-[1px] mb-4 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`} />
          
          <View className="flex-row justify-between items-center">
            <Text className={`font-bold ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>Total Questions</Text>
            <Text className={`text-xl font-black ${isDark ? 'text-indigo-300' : 'text-blue-900'}`}>{totalQuestions}</Text>
          </View>
        </View>

        <View className={`rounded-3xl p-6 shadow-sm mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <View className="flex-row items-center justify-between mb-5">
            <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Gameplay Rules</Text>
            <Cog6ToothIcon color={isDark ? "#9ca3af" : "#6b7280"} size={24} />
          </View>

          {/* Shuffle Toggle */}
          <View className={`flex-row justify-between items-center mb-4 border-b pb-4 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
            <View className="flex-1 pr-4">
              <Text className={`font-bold ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>Shuffle Questions</Text>
              <Text className="text-xs text-gray-500">Randomize the order of questions</Text>
            </View>
            <Switch 
              value={shuffleQuestions} 
              onValueChange={setShuffleQuestions}
              trackColor={{ false: isDark ? "#374151" : "#d1d5db", true: "#6366f1" }}
              thumbColor={shuffleQuestions ? "#ffffff" : "#9ca3af"}
            />
          </View>

          {/* Immediate Feedback Toggle */}
          <View className={`flex-row justify-between items-center mb-4 border-b pb-4 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
            <View className="flex-1 pr-4">
              <Text className={`font-bold ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>Show Mistakes</Text>
              <Text className="text-xs text-gray-500">Reveal correct answers immediately</Text>
            </View>
            <Switch 
              value={immediateFeedback} 
              onValueChange={setImmediateFeedback}
              trackColor={{ false: isDark ? "#374151" : "#d1d5db", true: "#6366f1" }}
              thumbColor={immediateFeedback ? "#ffffff" : "#9ca3af"}
            />
          </View>

          {/* Auto-Speak Toggle */}
          <View className="flex-row justify-between items-center">
            <View className="flex-1 pr-4">
              <Text className={`font-bold flex-row items-center ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                Auto-Read Questions
              </Text>
              <Text className="text-xs text-gray-500">Speak questions automatically</Text>
            </View>
            <Switch 
              value={autoSpeak} 
              onValueChange={setAutoSpeak}
              trackColor={{ false: isDark ? "#374151" : "#d1d5db", true: "#6366f1" }}
              thumbColor={autoSpeak ? "#ffffff" : "#9ca3af"}
            />
          </View>
        </View>

        <View className={`rounded-3xl p-6 shadow-sm mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <View className="flex-row items-center justify-between mb-5">
            <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Timer Settings</Text>
            <ClockIcon color={isDark ? "#9ca3af" : "#6b7280"} size={24} />
          </View>

          <View className={`flex-row justify-between mb-6 p-1 rounded-2xl ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
            <TouchableOpacity 
              onPress={() => handleModeChange('none')}
              className={`flex-1 py-2 items-center rounded-xl ${timerMode === 'none' ? (isDark ? 'bg-gray-700' : 'bg-white shadow-sm') : ''}`}
            >
              <Text className={`font-bold ${timerMode === 'none' ? (isDark ? 'text-indigo-300' : 'text-blue-900') : 'text-gray-500'}`}>None</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => handleModeChange('per_question')}
              className={`flex-1 py-2 items-center rounded-xl ${timerMode === 'per_question' ? (isDark ? 'bg-gray-700' : 'bg-white shadow-sm') : ''}`}
            >
              <Text className={`font-bold text-center px-1 ${timerMode === 'per_question' ? (isDark ? 'text-indigo-300' : 'text-blue-900') : 'text-gray-500'}`}>Per Q</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => handleModeChange('entire_quiz')}
              className={`flex-1 py-2 items-center rounded-xl ${timerMode === 'entire_quiz' ? (isDark ? 'bg-gray-700' : 'bg-white shadow-sm') : ''}`}
            >
              <Text className={`font-bold ${timerMode === 'entire_quiz' ? (isDark ? 'text-indigo-300' : 'text-blue-900') : 'text-gray-500'}`}>All Quiz</Text>
            </TouchableOpacity>
          </View>

          {timerMode !== 'none' && (
            <View className={`flex-row items-center justify-between p-4 rounded-2xl border ${isDark ? 'bg-indigo-900/20 border-indigo-900/50' : 'bg-indigo-50 border-indigo-100'}`}>
              <Text className={`font-medium flex-1 ${isDark ? 'text-indigo-200' : 'text-indigo-900'}`}>
                {timerMode === 'per_question' ? 'Time per question:' : 'Total quiz time:'}
              </Text>
              
              <View className="flex-row items-center">
                <TouchableOpacity onPress={() => handleTimeAdjust(-1)} className={`w-8 h-8 rounded-full items-center justify-center shadow-sm ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
                  <Text className={`font-bold text-lg ${isDark ? 'text-white' : 'text-indigo-900'}`}>-</Text>
                </TouchableOpacity>
                
                <Text className={`text-xl font-black mx-4 w-12 text-center ${isDark ? 'text-white' : 'text-indigo-900'}`}>
                  {timeValue} <Text className={`text-xs font-normal ${isDark ? 'text-indigo-200/50' : ''}`}>{timerMode === 'per_question' ? 'sec' : 'min'}</Text>
                </Text>
                
                <TouchableOpacity onPress={() => handleTimeAdjust(1)} className={`w-8 h-8 rounded-full items-center justify-center shadow-sm ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
                  <Text className={`font-bold text-lg ${isDark ? 'text-white' : 'text-indigo-900'}`}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity 
          className={`flex-row justify-center items-center py-4 rounded-full shadow-md ${isDark ? 'bg-indigo-600' : 'bg-blue-900 shadow-blue-300'}`}
          onPress={() => {
            navigation.navigate('ActiveQuiz', {
              quiz: quiz,
              timerMode: timerMode,
              timeValue: timeValue,
              shuffleQuestions: shuffleQuestions,
              immediateFeedback: immediateFeedback,
              autoSpeak: autoSpeak 
            });
          }}
        >
          <PlayIcon color="white" size={24} fill="white" />
          <Text className="text-white text-lg font-bold ml-2">Start Quiz</Text>
        </TouchableOpacity>
        
      </ScrollView>
    </View>
  );
}