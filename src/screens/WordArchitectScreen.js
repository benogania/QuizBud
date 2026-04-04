import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuizStore } from '../store/useQuizStore'; 
import { generateWordArchitectQuiz } from '../services/geminiService'; 

import { 
  LightBulbIcon, 
  CheckCircleIcon, 
  FaceFrownIcon,
  ChevronRightIcon
} from 'react-native-heroicons/solid';
import { ArrowPathIcon } from 'react-native-heroicons/outline'; 

export default function WordArchitectScreen({ route }) {
  const navigation = useNavigation();
  const { quiz } = route.params;

  // UPDATED: Pull updateQuiz from your store!
  const { theme, updateQuiz } = useQuizStore(); 
  const isDark = theme === 'dark';
  
  const inputRef = useRef(null);

  // --- AI & GAME STATE ---
  const [isLoading, setIsLoading] = useState(true);
  const [gameQuestions, setGameQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // --- NATIVE KEYBOARD STATE ---
  const [typedText, setTypedText] = useState('');
  const [hints, setHints] = useState({}); 

  // --- UPDATED: AI SETUP WITH ZUSTAND CACHE ---
  const loadOrGenerateQuestions = async (forceRegenerate = false) => {
    setIsLoading(true);
    
    const validQs = quiz.questions.filter(q => q.type !== 'true_false');
    
    // 1. Check Store Cache First (Saves Credits permanently!)
    if (!forceRegenerate && quiz.wordArchitectData) {
      setGameQuestions(quiz.wordArchitectData);
      setIsLoading(false);
      return;
    }

    // 2. Determine if AI is needed
    const needsAI = validQs.some(q => {
      const ans = q.options[q.correctAnswerIndex];
      return ans && ans.length > 15;
    });

    if (needsAI) {
      try {
        const simplifiedQuiz = await generateWordArchitectQuiz(validQs);
        if (simplifiedQuiz && simplifiedQuiz.questions) {
          
          // SAVE TO ZUSTAND STORE
          if (updateQuiz) {
            updateQuiz({ ...quiz, wordArchitectData: simplifiedQuiz.questions });
          }
          setGameQuestions(simplifiedQuiz.questions);

        } else {
          throw new Error("Invalid AI format");
        }
      } catch (error) {
        // Fallback
        const fallbackData = validQs.map(q => ({
          question: q.question,
          answer: q.options[q.correctAnswerIndex].split(' ')[0].replace(/[^a-zA-Z]/g, '')
        }));
        
        if (updateQuiz) updateQuiz({ ...quiz, wordArchitectData: fallbackData });
        setGameQuestions(fallbackData);
      }
    } else {
      // Safe to use directly
      const mappedData = validQs.map(q => ({
        question: q.question,
        answer: q.options[q.correctAnswerIndex].replace(/[^a-zA-Z]/g, '')
      }));
      
      if (updateQuiz) updateQuiz({ ...quiz, wordArchitectData: mappedData });
      setGameQuestions(mappedData);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    loadOrGenerateQuestions();
  }, [quiz]);

  useEffect(() => {
    if (!isLoading && !isModalVisible) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isLoading, currentIndex, isModalVisible]);

  // --- REGENERATE BUTTON HANDLER ---
  const handleRegenerate = () => {
    Alert.alert(
      "Regenerate Words?",
      "Want the AI to pick different keywords for this quiz? This will reset your score and use 1 API request.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Regenerate", 
          onPress: () => {
            setCurrentIndex(0);
            setScore(0);
            setTypedText('');
            setHints({});
            loadOrGenerateQuestions(true); // 'true' bypasses store cache
          } 
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View className={`flex-1 justify-center items-center pt-8 ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text className={`mt-4 font-bold ${isDark ? 'text-indigo-300' : 'text-indigo-900'}`}>
          Preparing Architecture...
        </Text>
      </View>
    );
  }

  if (!gameQuestions || gameQuestions.length === 0) return null;

  const currentQ = gameQuestions[currentIndex];
  const correctAnswer = currentQ.answer.toUpperCase();
  const answerArray = correctAnswer.split('');

  const isLongWord = answerArray.length > 10;
  const boxWidth = isLongWord ? 'w-8' : 'w-11';
  const boxHeight = isLongWord ? 'h-11' : 'h-14';
  const textSize = isLongWord ? 'text-lg' : 'text-2xl';

  const handleTextChange = (text) => {
    const cleanText = text.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, answerArray.length);
    setTypedText(cleanText);
  };

  const getCurrentGuess = (currentTyped = typedText, currentHints = hints) => {
    let guess = '';
    for (let i = 0; i < answerArray.length; i++) {
      guess += (i < currentTyped.length ? currentTyped[i] : currentHints[i]) || ' ';
    }
    return guess;
  };

  const handleHint = () => {
    const availableIndices = [];
    for (let i = 0; i < answerArray.length; i++) {
      const displayedChar = i < typedText.length ? typedText[i] : hints[i];
      if (displayedChar !== answerArray[i]) {
        availableIndices.push(i);
      }
    }

    if (availableIndices.length > 0) {
      const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
      const newHints = { ...hints, [randomIndex]: answerArray[randomIndex] };
      setHints(newHints);

      const finalGuess = getCurrentGuess(typedText, newHints);
      if (finalGuess === correctAnswer) {
        setTimeout(() => handleSubmit(finalGuess), 300);
      }
    }
  };

  const handleSubmit = (overrideGuess = null) => {
    Keyboard.dismiss();
    const finalGuess = typeof overrideGuess === 'string' ? overrideGuess : getCurrentGuess();
    
    if (finalGuess === correctAnswer) {
      setIsCorrect(true);
      setScore(score + 150);
    } else {
      setIsCorrect(false);
    }
    setIsModalVisible(true);
  };

  const nextLevel = () => {
    setIsModalVisible(false);
    setTypedText('');
    setHints({});
    if (currentIndex < gameQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.goBack();
    }
  };

  const retry = () => {
    setIsModalVisible(false);
    setTypedText('');
    setHints({});
  };

  const currentGuessStatus = getCurrentGuess();
  const isReadyToSubmit = !currentGuessStatus.includes(' ');

  const handleTapToFocus = () => {
    if (inputRef.current) {
      inputRef.current.blur();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50); 
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: isDark ? '#0f172a' : '#f9fafb' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 pt-12">
        
        <TextInput
          ref={inputRef}
          value={typedText}
          onChangeText={handleTextChange}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
        />

        {/* Header */}
        <View className="px-6 flex-row justify-between items-center mb-2">
          <View>
            <Text className={`font-bold text-[10px] tracking-widest uppercase ${isDark ? 'text-indigo-300' : 'text-indigo-400'}`}>Word Architect</Text>
            
            <View className="flex-row items-center">
              <Text className={`text-3xl font-black ${isDark ? 'text-white' : 'text-indigo-900'}`}>Level {currentIndex + 1}</Text>
              <TouchableOpacity 
                onPress={handleRegenerate} 
                className={`ml-3 p-1.5 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}
              >
                <ArrowPathIcon color={isDark ? '#a5b4fc' : '#4f46e5'} size={18} />
              </TouchableOpacity>
            </View>

          </View>
          <View className="items-end">
            <Text className="text-gray-400 font-bold text-[10px] uppercase">Score</Text>
            <Text className={`text-2xl font-black ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>{score}</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View className="px-6 mb-2">
          <View className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
            <View className={`h-full ${isDark ? 'bg-indigo-500' : 'bg-indigo-600'}`} style={{ width: `${((currentIndex + 1) / gameQuestions.length) * 100}%` }} />
          </View>
        </View>

        <ScrollView 
          className="flex-1 px-6" 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={handleTapToFocus} 
            className="flex-1 justify-start pb-8 pt-2"
          >
            {/* Question Card */}
            <View className={`rounded-[32px] p-5 shadow-sm border items-center ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <TouchableOpacity 
                onPress={handleHint}
                className={`p-3 rounded-full mb-3 ${isDark ? 'bg-indigo-900/50' : 'bg-indigo-100'}`}
              >
                <LightBulbIcon color={isDark ? "#818cf8" : "#4f46e5"} size={24} />
              </TouchableOpacity>

              <Text className={`text-xl font-bold text-center leading-7 mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                "{currentQ.question}"
              </Text>
              
              <View className="flex-row space-x-2">
                <View className={`${isDark ? 'bg-indigo-900/50' : 'bg-indigo-100'} px-3 py-1 rounded-full`}><Text className={`${isDark ? 'text-indigo-300' : 'text-indigo-700'} text-[9px] font-bold uppercase`}>QuizBud</Text></View>
                <View className={`${isDark ? 'bg-gray-700' : 'bg-gray-100'} px-3 py-1 rounded-full`}><Text className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-[9px] font-bold uppercase`}>{correctAnswer.length} Letters</Text></View>
              </View>
            </View>

            {/* Centered Input Boxes with Dynamic Size */}
            <View className="flex-row flex-wrap justify-center items-center mt-6 gap-2">
              {answerArray.map((_, i) => {
                const displayedChar = i < typedText.length ? typedText[i] : hints[i] || '';
                
                return (
                  <View 
                    key={i} 
                    className={`${boxWidth} ${boxHeight} rounded-xl border-b-4 items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-white'} ${displayedChar ? (isDark ? 'border-indigo-500' : 'border-indigo-600') : (isDark ? 'border-gray-900' : 'border-gray-200')}`}
                  >
                    <Text className={`${textSize} font-black ${isDark ? 'text-indigo-300' : 'text-indigo-900'}`}>
                      {displayedChar}
                    </Text>
                  </View>
                );
              })}
            </View>
          </TouchableOpacity>
        </ScrollView>

      </View>

      {/* Footer Actions pinned above the native keyboard */}
      <View className={`flex-row px-6 pb-8 pt-4 space-x-3 border-t ${isDark ? 'bg-[#0f172a] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
        <TouchableOpacity 
          onPress={() => {
            Keyboard.dismiss();
            nextLevel();
          }} 
          className={`flex-1 py-4 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}
        >
          <Text className={`text-center font-bold text-base ${isDark ? 'text-gray-400' : 'text-gray-700'}`}>Skip</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => handleSubmit()}
          disabled={!isReadyToSubmit}
          className={`flex-[2] py-4 rounded-full shadow-lg flex-row justify-center items-center ${isReadyToSubmit ? (isDark ? 'bg-indigo-600' : 'bg-indigo-900') : (isDark ? 'bg-indigo-900/30' : 'bg-indigo-300')}`}
        >
          <Text className="text-white font-bold text-lg mr-2">Submit</Text>
          <CheckCircleIcon color="white" size={20} />
        </TouchableOpacity>
      </View>

      {/* Result Modal */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/70 justify-center items-center px-8">
          <View className={`w-full rounded-[40px] p-8 items-center shadow-2xl ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
            <View className={`p-4 rounded-full mb-4 ${isCorrect ? (isDark ? 'bg-green-900/30' : 'bg-green-100') : (isDark ? 'bg-red-900/30' : 'bg-red-100')}`}>
              {isCorrect ? <CheckCircleIcon color="#16a34a" size={40} /> : <FaceFrownIcon color="#dc2626" size={40} />}
            </View>
            <Text className={`text-2xl font-black mb-1 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
              {isCorrect ? 'Magnificent!' : 'Not Quite...'}
            </Text>
            <Text className={`text-center mb-6 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {isCorrect ? 'Ready for the next structure?' : `Correct word: "${correctAnswer}"`}
            </Text>
            <TouchableOpacity onPress={isCorrect ? nextLevel : retry} className={`w-full py-4 rounded-full flex-row justify-center items-center ${isCorrect ? 'bg-green-600' : (isDark ? 'bg-indigo-600' : 'bg-indigo-900')}`}>
              <Text className="text-white font-bold text-lg mr-2">{isCorrect ? 'Next Level' : 'Try Again'}</Text>
              <ChevronRightIcon color="white" size={20} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView> 
  );
}