import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { ClockIcon, XMarkIcon, CheckCircleIcon, XCircleIcon, SpeakerWaveIcon } from 'react-native-heroicons/outline';
import { useQuizStore } from '../store/useQuizStore'; 
import { playSound } from '../utils/soundHelper'; 
import * as Speech from 'expo-speech';

export default function ActiveQuizScreen({ route, navigation }) {
  // Grab autoSpeak from params
  const { quiz, timerMode, timeValue, immediateFeedback, shuffleQuestions, autoSpeak } = route.params;

  const { theme, soundEffects } = useQuizStore();
  const isDark = theme === 'dark';

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); 
  
  const [answerHistory, setAnswerHistory] = useState([]);

  useEffect(() => {
    const initialQuestions = [...quiz.questions];
    if (shuffleQuestions) initialQuestions.sort(() => Math.random() - 0.5);
    setQuestions(initialQuestions);

    if (timerMode === 'entire_quiz') setTimeLeft(timeValue * 60);
    else if (timerMode === 'per_question') setTimeLeft(timeValue);

    return () => {
      Speech.stop();
    };
  }, []);

  // --- NEW: AUTO-SPEAK TRIGGER ---
  useEffect(() => {
    if (autoSpeak && questions.length > 0) {
      // Add a slight delay (400ms) so it doesn't speak before the UI transitions
      const timer = setTimeout(() => {
        handleSpeakQuestion(true); 
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, questions, autoSpeak]);

  useEffect(() => {
    if (timerMode === 'none' || timeLeft === null || isEvaluated) return;
    if (timeLeft === 0) {
      if (timerMode === 'entire_quiz') finishQuiz(score, answerHistory);
      else if (timerMode === 'per_question') handlePrimaryAction(true);
      return;
    }
    const intervalId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(intervalId);
  }, [timeLeft, timerMode, isEvaluated, score, answerHistory]);

  // Updated to accept a 'forcePlay' argument so auto-speak can override user toggles
  const handleSpeakQuestion = (forcePlay = false) => {
    if (isSpeaking && !forcePlay) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }

    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    Speech.stop(); // Clear any ongoing speech first
    setIsSpeaking(true);
    
    Speech.speak(currentQ.question, {
      pitch: 1.0,
      rate: 0.9,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const handlePrimaryAction = (isTimeOut = false) => {
    Speech.stop(); // Stop reading if they click Next/Check
    setIsSpeaking(false);

    const currentQ = questions[currentIndex];
    
    let isCorrect = false;
    if (selectedAnswer && !isTimeOut) {
      if (currentQ.type === 'multiple_choice' || currentQ.type === 'true_false') {
         isCorrect = currentQ.correctAnswerIndex === currentQ.options.indexOf(selectedAnswer);
      } else {
         isCorrect = selectedAnswer.toLowerCase().trim() === currentQ.correctAnswer.toLowerCase().trim();
      }
    }

    const pointsEarned = isCorrect ? (currentQ.points || 1) : 0;

    if (immediateFeedback && !isEvaluated && !isTimeOut) {
      setIsEvaluated(true);
      if (isCorrect) {
        setScore((prev) => prev + pointsEarned);
        playSound('correct', soundEffects); 
      } else {
        playSound('wrong', soundEffects);   
      }
      return; 
    }

    const currentHistoryRecord = {
      question: currentQ.question,
      type: currentQ.type,
      options: currentQ.options,
      correctAnswer: currentQ.type === 'identification' ? currentQ.correctAnswer : currentQ.options[currentQ.correctAnswerIndex],
      userAnswer: isTimeOut ? 'No Answer (Time Out)' : selectedAnswer,
      isCorrect: isCorrect,
      points: currentQ.points || 1
    };
    
    const updatedHistory = [...answerHistory, currentHistoryRecord];
    setAnswerHistory(updatedHistory);

    const newScore = score + (!immediateFeedback && !isTimeOut && isCorrect ? pointsEarned : 0);
    if (!immediateFeedback) setScore(newScore);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer('');
      setIsEvaluated(false);
      if (timerMode === 'per_question') setTimeLeft(timeValue);
    } else {
      finishQuiz(newScore, updatedHistory);
    }
  };

  const finishQuiz = (finalScore, finalHistory) => {
    Speech.stop();
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);
    useQuizStore.getState().addQuizHistory({
      id: Date.now().toString(),
      quizTitle: quiz.title,
      score: finalScore,
      totalPoints: totalPoints,
      history: finalHistory, 
      date: new Date().toISOString()
    });

    navigation.replace('Results', {
      score: finalScore,
      totalPoints: totalPoints,
      history: finalHistory,
      quizTitle: quiz.title
    });
  };

  const formatTime = (seconds) => {
    if (seconds === null) return '--:--';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (questions.length === 0) return <View className={`flex-1 ${isDark ? 'bg-[#0f172a]' : 'bg-white'}`} />;
  const currentQ = questions[currentIndex];

  return (
    <View className={`flex-1 pt-14 px-5 ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
      
      <View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity 
          onPress={() => {
            Speech.stop(); 
            navigation.goBack();
          }} 
          className={`p-2 rounded-full shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}
        >
          <XMarkIcon color="#ef4444" size={24} />
        </TouchableOpacity>

        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => handleSpeakQuestion(false)} // Pass false to allow toggling off manually
            className={`p-2 rounded-full shadow-sm ${timerMode !== 'none' ? 'mr-3' : ''} ${isSpeaking ? (isDark ? 'bg-indigo-900/80 border border-indigo-500' : 'bg-indigo-100 border border-indigo-300') : (isDark ? 'bg-gray-800 border border-transparent' : 'bg-white border border-transparent')}`}
          >
            <SpeakerWaveIcon color={isSpeaking ? (isDark ? "#a5b4fc" : "#4f46e5") : (isDark ? "#9ca3af" : "#6b7280")} size={22} />
          </TouchableOpacity>

          {timerMode !== 'none' && (
            <View className={`px-4 py-2 rounded-full shadow-sm flex-row items-center ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <ClockIcon 
                color={timeLeft < 10 && timerMode === 'per_question' ? '#ef4444' : (isDark ? '#818cf8' : '#1e3a8a')} 
                size={20} 
              />
              <Text className={`font-bold ml-2 ${timeLeft < 10 && timerMode === 'per_question' ? 'text-red-500' : (isDark ? 'text-indigo-300' : 'text-blue-900')}`}>
                {formatTime(timeLeft)}
              </Text>
            </View>
          )}
        </View>
      </View>

      <Text className={`font-bold tracking-widest uppercase text-xs mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        Question {currentIndex + 1} of {questions.length}
      </Text>
      <View className={`h-2 rounded-full mb-8 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
        <View className={`h-2 rounded-full ${isDark ? 'bg-indigo-500' : 'bg-blue-600'}`} style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        
        <Text className={`text-2xl font-bold mb-8 leading-8 ${isDark ? 'text-white' : 'text-gray-800'}`}>
          {currentQ.question}
        </Text>

        <View>
          {(currentQ.type === 'multiple_choice' || currentQ.type === 'true_false') && (
            currentQ.options.map((option, idx) => {
              const isSelected = selectedAnswer === option;
              const isCorrectAnswer = currentQ.correctAnswerIndex === idx;
              
              let borderClass = isSelected 
                ? (isDark ? 'border-indigo-500' : 'border-blue-600') 
                : (isDark ? 'border-gray-800' : 'border-gray-200');
              
              let bgClass = isSelected 
                ? (isDark ? 'bg-indigo-900/30' : 'bg-blue-50') 
                : (isDark ? 'bg-gray-800' : 'bg-white');
              
              let textClass = isSelected 
                ? (isDark ? 'text-indigo-200' : 'text-blue-900') 
                : (isDark ? 'text-gray-300' : 'text-gray-700');
              
              let Icon = null;

              if (isEvaluated) {
                if (isCorrectAnswer) {
                  borderClass = 'border-green-500'; 
                  bgClass = isDark ? 'bg-green-900/30' : 'bg-green-50'; 
                  textClass = isDark ? 'text-green-300' : 'text-green-800';
                  Icon = <CheckCircleIcon color="#22c55e" size={24} />;
                } else if (isSelected && !isCorrectAnswer) {
                  borderClass = 'border-red-500'; 
                  bgClass = isDark ? 'bg-red-900/30' : 'bg-red-50'; 
                  textClass = isDark ? 'text-red-300' : 'text-red-800';
                  Icon = <XCircleIcon color="#ef4444" size={24} />;
                } else {
                  borderClass = isDark ? 'border-gray-900 opacity-30' : 'border-gray-100 opacity-50';
                  bgClass = isDark ? 'bg-gray-900 opacity-30' : 'bg-white opacity-50';
                  textClass = isDark ? 'text-gray-600' : 'text-gray-400';
                }
              }

              return (
                <TouchableOpacity 
                  key={idx}
                  onPress={() => !isEvaluated && setSelectedAnswer(option)}
                  activeOpacity={isEvaluated ? 1 : 0.7}
                  className={`flex-row justify-between items-center p-4 rounded-2xl mb-4 border-2 ${borderClass} ${bgClass}`}
                >
                  <Text className={`text-lg font-medium flex-1 ${textClass}`}>{option}</Text>
                  {Icon}
                </TouchableOpacity>
              )
            })
          )}

          {currentQ.type === 'identification' && (
            <View>
              <TextInput
                editable={!isEvaluated}
                className={`border-2 rounded-2xl p-4 text-lg ${
                  isEvaluated 
                    ? (selectedAnswer.toLowerCase().trim() === currentQ.correctAnswer.toLowerCase().trim() 
                        ? (isDark ? 'border-green-500 bg-green-900/30 text-green-300' : 'border-green-500 bg-green-50 text-green-800') 
                        : (isDark ? 'border-red-500 bg-red-900/30 text-red-300' : 'border-red-500 bg-red-50 text-red-800')) 
                    : (isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-800')
                }`}
                placeholder="Type your answer here..."
                placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
                value={selectedAnswer}
                onChangeText={setSelectedAnswer}
                autoCapitalize="none"
              />
              {isEvaluated && selectedAnswer.toLowerCase().trim() !== currentQ.correctAnswer.toLowerCase().trim() && (
                <Text className={`font-bold mt-2 ml-2 ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                  Correct Answer: {currentQ.correctAnswer}
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <View className="pb-8 pt-4">
        <TouchableOpacity 
          onPress={() => handlePrimaryAction(false)}
          disabled={!selectedAnswer && currentQ.type !== 'identification'}
          className={`py-4 rounded-full shadow-md ${
            selectedAnswer || currentQ.type === 'identification' 
              ? (isDark ? 'bg-indigo-600 shadow-indigo-950' : 'bg-blue-900 shadow-blue-300') 
              : (isDark ? 'bg-gray-800 shadow-none' : 'bg-gray-300 shadow-none')
          }`}
        >
          <Text className={`text-lg font-bold text-center ${isDark && !selectedAnswer && currentQ.type !== 'identification' ? 'text-gray-600' : 'text-white'}`}>
            {immediateFeedback && !isEvaluated 
              ? 'Check Answer' 
              : currentIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}