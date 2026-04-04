import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TouchableWithoutFeedback, Animated, Dimensions, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuizStore } from '../store/useQuizStore';
import { 
  PlayIcon, 
  RectangleStackIcon, 
  PuzzlePieceIcon, 
  XMarkIcon, 
  ClockIcon as ClockIconSolid, 
  HeartIcon 
} from 'react-native-heroicons/solid';
import { 
  MagnifyingGlassIcon, 
  DocumentTextIcon, 
  ClockIcon 
} from 'react-native-heroicons/outline';

const { height } = Dimensions.get('window');

// Helper updated to support Dark Mode colors
const getBadgeStyles = (index, isDark) => {
  const styles = isDark ? [
    { bg: 'bg-blue-900/40', text: 'text-blue-300' },
    { bg: 'bg-yellow-900/40', text: 'text-yellow-300' },
    { bg: 'bg-purple-900/40', text: 'text-purple-300' },
    { bg: 'bg-green-900/40', text: 'text-green-300' }
  ] : [
    { bg: 'bg-blue-100', text: 'text-blue-800' },
    { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    { bg: 'bg-purple-100', text: 'text-purple-800' },
    { bg: 'bg-green-100', text: 'text-green-800' }
  ];
  return styles[index % styles.length];
};

export default function PlayScreen() {
  const navigation = useNavigation();
  // Pull theme from store
  const { quizzes, theme } = useQuizStore();
  const isDark = theme === 'dark';

  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(height)).current; 
  const fadeAnim = useRef(new Animated.Value(0)).current;       

  const filteredQuizzes = quizzes.filter(item => {
    const quizData = item.quiz || item;
    return quizData.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const openModeSelector = (quizData) => {
    setSelectedQuiz(quizData);
    setIsModalVisible(true); 

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 65, useNativeDriver: true })
    ]).start();
  };

  const closeModeSelector = (callback) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: height, duration: 250, useNativeDriver: true })
    ]).start(() => {
      setIsModalVisible(false); 
      if (typeof callback === 'function') callback();
    });
  };

  const navigateToGame = (route) => {
    closeModeSelector(() => {
      navigation.navigate(route, { quiz: selectedQuiz });
    });
  };

  return (
    <View className={`flex-1 pt-12 px-5 ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
      
      {/* SEARCH BAR */}
      <View className={`flex-row items-center rounded-full px-5 py-1.5 mb-8 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
        <MagnifyingGlassIcon color={isDark ? "#6b7280" : "#9ca3af"} size={20} />
        <TextInput
          className={`flex-1 ml-3 font-medium text-base ${isDark ? 'text-white' : 'text-gray-800'}`}
          placeholder="Search quizzes..."
          placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <Text className={`text-xl font-extrabold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Choose a Quiz to play
      </Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {filteredQuizzes.length === 0 ? (
          <Text className="text-gray-400 italic text-center py-10">No quizzes match your search.</Text>
        ) : (
          filteredQuizzes.map((item, index) => {
            const quizData = item.quiz || item;
            const badgeStyle = getBadgeStyles(index, isDark);

            return (
              <View 
                key={quizData.id}
                className={`rounded-[32px] p-6 mb-5 shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}
              >
                <View className="flex-row justify-between items-center mb-4">
                  <View className={`${badgeStyle.bg} px-3 py-1 rounded-full`}>
                    <Text className={`text-[10px] font-black tracking-widest uppercase ${badgeStyle.text}`}>
                      {quizData.subject || quizData.category || 'GENERAL'}
                    </Text>
                  </View>
                  <View className="w-5 h-5" /> 
                </View>

                {/* Title */}
                <Text className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {quizData.title}
                </Text>

                {/* Meta Info */}
                <View className="flex-row items-center mb-6">
                  <View className="flex-row items-center mr-6">
                    <DocumentTextIcon color={isDark ? "#9ca3af" : "#6b7280"} size={18} />
                    <Text className={`text-sm font-medium ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {quizData.questions?.length || 0} Questions
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <ClockIcon color={isDark ? "#9ca3af" : "#6b7280"} size={18} />
                    <Text className={`text-sm font-medium ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {quizData.timerMinutes || 15} mins
                    </Text>
                  </View>
                </View>

                {/* Play Now Button */}
                <TouchableOpacity 
                  className={`py-3 rounded-full flex-row justify-center items-center shadow-md ${isDark ? 'bg-indigo-600' : 'bg-[#2a3791] shadow-indigo-200'}`}
                  onPress={() => openModeSelector(quizData)}
                  activeOpacity={0.8}
                >
                  <PlayIcon color="white" size={18} />
                  <Text className="text-white font-bold text-base ml-2">Play Now</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
        <View className="h-20" />
      </ScrollView>

      {/* BOTTOM SHEET MODAL */}
      <Modal animationType="none" transparent={true} visible={isModalVisible} onRequestClose={() => closeModeSelector()}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          
          <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', opacity: fadeAnim }}>
            <TouchableWithoutFeedback onPress={() => closeModeSelector()}>
              <View style={{ flex: 1 }} />
            </TouchableWithoutFeedback>
          </Animated.View>

          <Animated.View 
            style={{ transform: [{ translateY: slideAnim }], maxHeight: height * 0.8 }} 
            className={`rounded-t-[40px] p-6 pb-8 shadow-2xl ${isDark ? 'bg-gray-900' : 'bg-white'}`}
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Select Game Mode</Text>
              <TouchableOpacity onPress={() => closeModeSelector()} className={`p-2 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <XMarkIcon color={isDark ? "#9ca3af" : "#4b5563"} size={20} />
              </TouchableOpacity>
            </View>

            <Text className={`font-bold mb-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{selectedQuiz?.title}</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity activeOpacity={0.8} className={`p-4 rounded-3xl flex-row items-center mb-3 border ${isDark ? 'bg-blue-900/20 border-blue-900/30' : 'bg-blue-50 border-blue-100'}`} onPress={() => navigateToGame('QuizPlayer')}>
                <View className={`p-3 rounded-2xl mr-4 ${isDark ? 'bg-blue-900' : 'bg-blue-200'}`}><PlayIcon color={isDark ? "#93c5fd" : "#1e3a8a"} size={24} /></View>
                <View><Text className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>Standard Quiz</Text><Text className="text-xs text-gray-500">Classic testing mode</Text></View>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.8} className={`p-4 rounded-3xl flex-row items-center mb-3 border ${isDark ? 'bg-yellow-900/20 border-yellow-900/30' : 'bg-yellow-50 border-yellow-100'}`} onPress={() => navigateToGame('Flashcards')}>
                <View className={`p-3 rounded-2xl mr-4 ${isDark ? 'bg-yellow-900' : 'bg-yellow-200'}`}><RectangleStackIcon color={isDark ? "#fde047" : "#a16207"} size={24} /></View>
                <View><Text className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>Flashcards</Text><Text className="text-xs text-gray-500">Flip cards to memorize</Text></View>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.8} className={`p-4 rounded-3xl flex-row items-center mb-3 border ${isDark ? 'bg-purple-900/20 border-purple-900/30' : 'bg-purple-50 border-purple-100'}`} onPress={() => navigateToGame('MatchMaster')}>
                <View className={`p-3 rounded-2xl mr-4 ${isDark ? 'bg-purple-900' : 'bg-purple-200'}`}><PuzzlePieceIcon color={isDark ? "#d8b4fe" : "#6b21a8"} size={24} /></View>
                <View><Text className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>Match Master</Text><Text className="text-xs text-gray-500">Pair questions to answers</Text></View>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.8} className={`p-4 rounded-3xl flex-row items-center mb-3 border ${isDark ? 'bg-orange-900/20 border-orange-900/30' : 'bg-orange-50 border-orange-100'}`} onPress={() => navigateToGame('TimeAttack')}>
                <View className={`p-3 rounded-2xl mr-4 ${isDark ? 'bg-orange-900' : 'bg-orange-200'}`}><ClockIconSolid color={isDark ? "#fdba74" : "#c2410c"} size={24} /></View>
                <View><Text className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>Time Attack</Text><Text className="text-xs text-gray-500">60 seconds speed run</Text></View>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.8} className={`p-4 rounded-3xl flex-row items-center mb-8 border ${isDark ? 'bg-red-900/20 border-red-900/30' : 'bg-red-50 border-red-100'}`} onPress={() => navigateToGame('SurvivalMode')}>
                <View className={`p-3 rounded-2xl mr-4 ${isDark ? 'bg-red-900' : 'bg-red-200'}`}><HeartIcon color={isDark ? "#fca5a5" : "#b91c1c"} size={24} /></View>
                <View><Text className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>Survival Mode</Text><Text className="text-xs text-gray-500">3 lives. Sudden death.</Text></View>
              </TouchableOpacity>
            </ScrollView>

          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}