import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuizStore } from '../store/useQuizStore';
import { LinearGradient } from 'expo-linear-gradient';
import { triggerHaptic } from '../utils/hapticHelper';

import { 
  BookOpenIcon, 
  PencilSquareIcon, 
  LightBulbIcon, 
  DocumentTextIcon,
  LanguageIcon,
  AcademicCapIcon,
  MicrophoneIcon
} from 'react-native-heroicons/outline';
import { SparklesIcon } from 'react-native-heroicons/solid';

export default function LearnScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme, hapticsEnabled } = useQuizStore();
  const isDark = theme === 'dark';

  const handleFeaturePress = (featureName) => {
    triggerHaptic(hapticsEnabled, 'Medium');
    
    if (featureName === 'Spelling & Vocabulary') {
      navigation.navigate("SpellingScreen");
    } else if (featureName === 'Grammar & Writing') { 
      navigation.navigate("GrammarScreen");
    } else if (featureName === 'Grammar Practice') { 
      navigation.navigate("GrammarPracticeScreen");
    } else if (featureName === 'Speaking Skills') { // <-- NEW ROUTE
      navigation.navigate("SpeakingScreen");
    } else {
      Alert.alert(
        `${featureName}`,
        `The ${featureName} module is under construction. Soon, you'll be able to master this skill using AI!`,
        [{ text: "Awesome!", style: "default" }]
      );
    }

  };

  const FeatureCard = ({ title, description, icon: Icon, colorClass, bgClass, onPress }) => (
    <TouchableOpacity 
      activeOpacity={0.8}
      onPress={onPress}
      className={`p-5 rounded-3xl mb-4 border flex-row items-center shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
    >
      <View className={`w-14 h-14 rounded-2xl items-center justify-center mr-4 ${bgClass}`}>
        <Icon color={colorClass} size={28} />
      </View>
      <View className="flex-1">
        <Text className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</Text>
        <Text className={`text-xs leading-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{description}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className={`flex-1 ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
      {/* Background Gradient */}
      <LinearGradient 
        colors={isDark ? ["#0f172a", "#0f172a"] : ["#e0e7ff", "#f9fafb"]} 
        className="absolute inset-0" 
      />

      <View className="flex-1" style={{ paddingTop: insets.top }}>
        
        {/* Header */}
        <View className="flex-row justify-between items-center px-5 pt-4 mb-6">
          <View className="flex-row items-center">
            <AcademicCapIcon color={isDark ? "#a5b4fc" : "#312e81"} size={32} />
            <Text className={`text-2xl font-black ml-2 tracking-tight ${isDark ? "text-white" : "text-indigo-900"}`}>
              Learn
            </Text>
          </View>
          <TouchableOpacity 
            className={`p-2 rounded-full ${isDark ? "bg-indigo-900/50" : "bg-indigo-100"}`} 
            onPress={() => navigation.navigate("AIAssistant")}
          >
            <SparklesIcon color={isDark ? "#818cf8" : "#4f46e5"} size={22} />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          
          <Text className={`text-3xl font-extrabold mb-2 leading-tight ${isDark ? "text-white" : "text-gray-900"}`}>
            Expand Your{"\n"}Knowledge
          </Text>
          <Text className={`text-sm mb-8 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Master new skills with AI-powered interactive learning tools.
          </Text>

          {/* Featured Hero Card */}
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => handleFeaturePress('Grammar & Writing')}
            className="rounded-[32px] overflow-hidden mb-8 shadow-lg shadow-indigo-300"
          >
            <LinearGradient colors={isDark ? ['#312e81', '#1e1b4b'] : ['#4f46e5', '#3730a3']} className="p-6 relative">
              <View className="absolute top-4 right-4 bg-white/20 p-2 rounded-full">
                <PencilSquareIcon color="white" size={24} />
              </View>
              <Text className="text-indigo-200 font-bold text-[10px] tracking-widest uppercase mb-1">AI Writing Coach</Text>
              <Text className="text-white text-2xl font-black mb-2 w-3/4">Improve Grammar</Text>
              <Text className="text-indigo-100 text-sm mb-4">Paste your essays or sentences and let AI fix your grammar and enhance your tone.</Text>
              
              <View className="bg-white py-3 rounded-full items-center flex-row justify-center">
                <SparklesIcon color="#4f46e5" size={18} />
                <Text className="text-indigo-700 font-bold ml-2">Start Writing</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <Text className={`font-bold uppercase tracking-widest text-[10px] mb-4 ml-1 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
            Skill Modules
          </Text>

          <FeatureCard 
            title="Grammar Practice"
            description="Fix blank words, transitions, and verb tenses with multiple-choice quizzes."
            icon={PencilSquareIcon}
            colorClass={isDark ? "#34d399" : "#059669"} // Emerald Green
            bgClass={isDark ? "bg-emerald-900/40" : "bg-emerald-100"}
            onPress={() => handleFeaturePress('Grammar Practice')}
          />

          <FeatureCard 
            title="Spelling & Vocabulary"
            description="Learn tricky words, hear pronunciations, and master spelling bees."
            icon={BookOpenIcon}
            colorClass={isDark ? "#fde047" : "#ca8a04"} // Yellow
            bgClass={isDark ? "bg-yellow-900/40" : "bg-yellow-100"}
            onPress={() => handleFeaturePress('Spelling & Vocabulary')}
          />

          <FeatureCard 
            title="Speaking & Conversation"
            description="Respond to real-life scenarios, learn native slang, and practice your shadowing."
            icon={MicrophoneIcon}
            colorClass={isDark ? "#f472b6" : "#db2777"} // Pink
            bgClass={isDark ? "bg-pink-900/40" : "bg-pink-100"}
            onPress={() => handleFeaturePress('Speaking Skills')}
          />
        </ScrollView>
      </View>
    </View>
  );
}