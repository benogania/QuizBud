import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { 
  ClockIcon, 
  XMarkIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  SpeakerWaveIcon, 
  InformationCircleIcon,
  ChevronUpIcon,     
  ChevronDownIcon   
} from 'react-native-heroicons/outline';
import { useQuizStore } from '../store/useQuizStore'; 
import { playSound } from '../utils/soundHelper'; 
import { triggerHaptic } from '../utils/hapticHelper'; 
import * as Speech from 'expo-speech';

export default function ActiveQuizScreen({ route, navigation }) {
  const { quiz, timerMode, timeValue, immediateFeedback, shuffleQuestions, autoSpeak } = route.params;

  const { theme, soundEffects, hapticsEnabled } = useQuizStore();
  const isDark = theme === 'dark';

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(''); 
  const [timeLeft, setTimeLeft] = useState(null);
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); 
  
  const [answerHistory, setAnswerHistory] = useState([]);

  // Initializes answer state based on question type
  const initAnswerState = (q) => {
    if (!q) return;
    if (q.type === 'enumeration') {
      setSelectedAnswer(Array(q.correctAnswers?.length || 1).fill(''));
    } else if (q.type === 'rearrange') {
      // Shuffle the correct order to create the starting puzzle
      const shuffled = [...(q.correctOrder || [])].sort(() => Math.random() - 0.5);
      setSelectedAnswer(shuffled);
    } else {
      setSelectedAnswer('');
    }
  };

  useEffect(() => {
    const initialQuestions = quiz.questions.map(q => {
      if (q.type === 'multiple_choice' && q.options) {
        let mappedOptions = q.options.map((opt, idx) => ({ text: opt, isCorrect: idx === q.correctAnswerIndex }));
        mappedOptions.sort(() => Math.random() - 0.5);
        const newCorrectIndex = mappedOptions.findIndex(o => o.isCorrect);
        return { ...q, options: mappedOptions.map(o => o.text), correctAnswerIndex: newCorrectIndex };
      }
      return { ...q };
    });

    if (shuffleQuestions) initialQuestions.sort(() => Math.random() - 0.5);
    
    setQuestions(initialQuestions);
    initAnswerState(initialQuestions[0]); 

    if (timerMode === 'entire_quiz') setTimeLeft(timeValue * 60);
    else if (timerMode === 'per_question') setTimeLeft(timeValue);

    return () => { Speech.stop(); };
  }, []);

  useEffect(() => {
    if (autoSpeak && questions.length > 0) {
      const timer = setTimeout(() => { handleSpeakQuestion(true); }, 400);
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

  const handleSpeakQuestion = (forcePlay = false) => {
    if (isSpeaking && !forcePlay) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    Speech.stop(); 
    setIsSpeaking(true);
    Speech.speak(currentQ.question, {
      pitch: 1.0, rate: 0.9,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  // 🚨 Bulleproof Re-arrange moving logic!
  const moveItem = (index, direction) => {
    if (isEvaluated) return;
    const newArr = [...selectedAnswer];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= newArr.length) return;
    [newArr[index], newArr[swapIndex]] = [newArr[swapIndex], newArr[index]];
    setSelectedAnswer(newArr);
    triggerHaptic(hapticsEnabled, 'Light');
  };

  const handlePrimaryAction = (isTimeOut = false) => {
    Speech.stop(); 
    setIsSpeaking(false);

    const currentQ = questions[currentIndex];
    let isCorrect = false;

    if (selectedAnswer !== '' && !isTimeOut) {
      if (currentQ.type === 'multiple_choice' || currentQ.type === 'true_false') {
         isCorrect = currentQ.correctAnswerIndex === currentQ.options.indexOf(selectedAnswer);
      } 
      else if (currentQ.type === 'identification') {
         isCorrect = selectedAnswer.toLowerCase().trim() === currentQ.correctAnswer.toLowerCase().trim();
      } 
      else if (currentQ.type === 'enumeration') {
         const userAns = selectedAnswer.map(a => a.toLowerCase().trim());
         const correctAns = currentQ.correctAnswers.map(a => a.toLowerCase().trim());
         
         // 🚨 SMART LOGIC: Checks exactOrder true/false
         if (currentQ.exactOrder) {
           isCorrect = JSON.stringify(userAns) === JSON.stringify(correctAns);
         } else {
           const sortedUser = [...userAns].sort();
           const sortedCorrect = [...correctAns].sort();
           isCorrect = JSON.stringify(sortedUser) === JSON.stringify(sortedCorrect);
         }
      } 
      else if (currentQ.type === 'rearrange') {
         isCorrect = JSON.stringify(selectedAnswer) === JSON.stringify(currentQ.correctOrder);
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

    let formattedCorrectAnswer = '';
    let formattedUserAnswer = isTimeOut ? 'No Answer (Time Out)' : selectedAnswer;

    if (currentQ.type === 'multiple_choice' || currentQ.type === 'true_false') {
      formattedCorrectAnswer = currentQ.options[currentQ.correctAnswerIndex];
    } else if (currentQ.type === 'identification') {
      formattedCorrectAnswer = currentQ.correctAnswer;
    } else if (currentQ.type === 'enumeration') {
      formattedCorrectAnswer = currentQ.correctAnswers.join(', ');
      formattedUserAnswer = isTimeOut ? 'No Answer' : selectedAnswer.join(', ');
    } else if (currentQ.type === 'rearrange') {
      formattedCorrectAnswer = currentQ.correctOrder.join(' ➔ ');
      formattedUserAnswer = isTimeOut ? 'No Answer' : selectedAnswer.join(' ➔ ');
    }

    const currentHistoryRecord = {
      question: currentQ.question,
      type: currentQ.type,
      options: currentQ.options || null,
      correctAnswer: formattedCorrectAnswer,
      userAnswer: formattedUserAnswer,
      isCorrect: isCorrect,
      points: currentQ.points || 1
    };
    
    const updatedHistory = [...answerHistory, currentHistoryRecord];
    setAnswerHistory(updatedHistory);

    const newScore = score + (!immediateFeedback && !isTimeOut && isCorrect ? pointsEarned : 0);
    if (!immediateFeedback) setScore(newScore);

    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      initAnswerState(questions[nextIndex]); 
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
      quizTitle: quiz.title,
      quiz: route.params.quiz
    });
  };

  const formatTime = (seconds) => {
    if (seconds === null) return '--:--';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isSubmitDisabled = () => {
    if (isEvaluated) return false;
    if (!currentQ) return true;
    if (currentQ.type === 'enumeration') return !selectedAnswer || selectedAnswer.some(a => !a.trim());
    if (currentQ.type === 'rearrange') return !selectedAnswer || selectedAnswer.length === 0;
    if (currentQ.type === 'identification') return typeof selectedAnswer === 'string' && !selectedAnswer.trim();
    return !selectedAnswer; 
  };

  if (questions.length === 0) return <View className={`flex-1 ${isDark ? 'bg-[#0f172a]' : 'bg-white'}`} />;
  const currentQ = questions[currentIndex];

  return (
    <View className={`flex-1 pt-14 px-5 ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
      
      <View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity onPress={() => { Speech.stop(); navigation.goBack(); }} className={`p-2 rounded-full shadow-sm ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <XMarkIcon color="#ef4444" size={24} />
        </TouchableOpacity>

        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => handleSpeakQuestion(false)} className={`p-2 rounded-full shadow-sm ${timerMode !== 'none' ? 'mr-3' : ''} ${isSpeaking ? (isDark ? 'bg-indigo-900/80 border border-indigo-500' : 'bg-indigo-100 border border-indigo-300') : (isDark ? 'bg-gray-800 border border-transparent' : 'bg-white border border-transparent')}`}>
            <SpeakerWaveIcon color={isSpeaking ? (isDark ? "#a5b4fc" : "#4f46e5") : (isDark ? "#9ca3af" : "#6b7280")} size={22} />
          </TouchableOpacity>

          {timerMode !== 'none' && (
            <View className={`px-4 py-2 rounded-full shadow-sm flex-row items-center ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <ClockIcon color={timeLeft < 10 && timerMode === 'per_question' ? '#ef4444' : (isDark ? '#818cf8' : '#1e3a8a')} size={20} />
              <Text className={`font-bold ml-2 ${timeLeft < 10 && timerMode === 'per_question' ? 'text-red-500' : (isDark ? 'text-indigo-300' : 'text-blue-900')}`}>{formatTime(timeLeft)}</Text>
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
          {/* MULTIPLE CHOICE & TRUE FALSE */}
          {(currentQ.type === 'multiple_choice' || currentQ.type === 'true_false') && (
            currentQ.options.map((option, idx) => {
              const isSelected = selectedAnswer === option;
              const isCorrectAnswer = currentQ.correctAnswerIndex === idx;
              
              let borderClass = isSelected ? (isDark ? 'border-indigo-500' : 'border-blue-600') : (isDark ? 'border-gray-800' : 'border-gray-200');
              let bgClass = isSelected ? (isDark ? 'bg-indigo-900/30' : 'bg-blue-50') : (isDark ? 'bg-gray-800' : 'bg-white');
              let textClass = isSelected ? (isDark ? 'text-indigo-200' : 'text-blue-900') : (isDark ? 'text-gray-300' : 'text-gray-700');
              let Icon = null;

              if (isEvaluated) {
                if (isCorrectAnswer) {
                  borderClass = 'border-green-500'; bgClass = isDark ? 'bg-green-900/30' : 'bg-green-50'; textClass = isDark ? 'text-green-300' : 'text-green-800';
                  Icon = <CheckCircleIcon color="#22c55e" size={24} />;
                } else if (isSelected && !isCorrectAnswer) {
                  borderClass = 'border-red-500'; bgClass = isDark ? 'bg-red-900/30' : 'bg-red-50'; textClass = isDark ? 'text-red-300' : 'text-red-800';
                  Icon = <XCircleIcon color="#ef4444" size={24} />;
                } else {
                  borderClass = isDark ? 'border-gray-900 opacity-30' : 'border-gray-100 opacity-50';
                  bgClass = isDark ? 'bg-gray-900 opacity-30' : 'bg-white opacity-50';
                  textClass = isDark ? 'text-gray-600' : 'text-gray-400';
                }
              }

              return (
                <TouchableOpacity 
                  key={idx} onPress={() => !isEvaluated && setSelectedAnswer(option)} activeOpacity={isEvaluated ? 1 : 0.7}
                  className={`flex-row justify-between items-center p-4 rounded-2xl mb-4 border-2 ${borderClass} ${bgClass}`}
                >
                  <Text className={`text-lg font-medium flex-1 ${textClass}`}>{option}</Text>
                  {Icon}
                </TouchableOpacity>
              )
            })
          )}

          {/* IDENTIFICATION */}
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
                <Text className={`font-bold mt-3 ml-2 ${isDark ? 'text-red-400' : 'text-red-500'}`}>Correct Answer: {currentQ.correctAnswer}</Text>
              )}
            </View>
          )}

          {/* ENUMERATION */}
          {currentQ.type === 'enumeration' && Array.isArray(selectedAnswer) && (
            <View>
              <Text className={`text-sm font-bold tracking-widest uppercase mb-4 ${isDark ? 'text-pink-400' : 'text-pink-600'}`}>
                {currentQ.exactOrder ? 'List items in exact order' : 'List items in any order'}
              </Text>

              {selectedAnswer.map((ans, idx) => {
                let borderClass = isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white';
                let textClass = isDark ? 'text-white' : 'text-gray-800';

                // Visual evaluation for Random vs Sequential
                if (isEvaluated) {
                  let isAnsCorrect = false;
                  const cleanAns = ans.toLowerCase().trim();

                  if (currentQ.exactOrder) {
                    isAnsCorrect = currentQ.correctAnswers[idx]?.toLowerCase().trim() === cleanAns;
                  } else {
                    const correctList = currentQ.correctAnswers.map(a=>a.toLowerCase().trim());
                    const isIncluded = correctList.includes(cleanAns);
                    const isFirstTimeUserTypedIt = selectedAnswer.findIndex(a => a.toLowerCase().trim() === cleanAns) === idx;
                    isAnsCorrect = isIncluded && isFirstTimeUserTypedIt;
                  }

                  if (isAnsCorrect && cleanAns !== "") {
                    borderClass = isDark ? 'border-green-500 bg-green-900/30' : 'border-green-500 bg-green-50';
                    textClass = isDark ? 'text-green-300' : 'text-green-800';
                  } else {
                    borderClass = isDark ? 'border-red-500 bg-red-900/30' : 'border-red-500 bg-red-50';
                    textClass = isDark ? 'text-red-300' : 'text-red-800';
                  }
                }

                return (
                  <TextInput
                    key={idx}
                    editable={!isEvaluated}
                    className={`border-2 rounded-2xl p-4 text-lg mb-3 ${borderClass} ${textClass}`}
                    placeholder={`Item ${idx + 1}...`}
                    placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
                    value={ans}
                    onChangeText={(txt) => {
                      const newArr = [...selectedAnswer];
                      newArr[idx] = txt;
                      setSelectedAnswer(newArr);
                    }}
                    autoCapitalize="none"
                  />
                );
              })}
              {isEvaluated && (
                <View className="mt-2 pl-2">
                  <Text className={`font-bold mb-1 ${isDark ? 'text-red-400' : 'text-red-500'}`}>Accepted Answers {currentQ.exactOrder ? '(In Order)' : '(Any Order)'}:</Text>
                  <Text className={`leading-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{currentQ.correctAnswers.join(', ')}</Text>
                </View>
              )}
            </View>
          )}

          {/* REARRANGE (BULLETPROOF ARROWS) */}
          {currentQ.type === 'rearrange' && Array.isArray(selectedAnswer) && (
            <View>
              <Text className={`text-sm font-bold tracking-widest uppercase mb-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                Use arrows to set correct order
              </Text>
              
              {selectedAnswer.map((item, idx) => {
                const isExactMatch = isEvaluated ? item === currentQ.correctOrder[idx] : false;
                
                let borderClass = isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white';
                let textClass = isDark ? 'text-white' : 'text-gray-800';

                if (isEvaluated) {
                  if (isExactMatch) {
                    borderClass = isDark ? 'border-green-500 bg-green-900/30' : 'border-green-500 bg-green-50';
                    textClass = isDark ? 'text-green-300' : 'text-green-800';
                  } else {
                    borderClass = isDark ? 'border-red-500 bg-red-900/30' : 'border-red-500 bg-red-50';
                    textClass = isDark ? 'text-red-300' : 'text-red-800';
                  }
                }

                return (
                  <View key={idx} className={`flex-row items-center justify-between p-4 rounded-2xl mb-3 border-2 ${borderClass}`}>
                    <View className="flex-row items-center flex-1 pr-4">
                      <Text className={`font-black text-lg mr-4 opacity-50 ${textClass}`}>{idx + 1}</Text>
                      <Text className={`text-lg font-medium flex-1 ${textClass}`}>{item}</Text>
                    </View>

                    {/* Up/Down Arrows */}
                    {!isEvaluated && (
                      <View className={`flex-row items-center rounded-xl overflow-hidden border ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                        <TouchableOpacity onPress={() => moveItem(idx, -1)} disabled={idx === 0} className={`p-2 border-r ${isDark ? 'border-gray-700' : 'border-gray-200'} ${idx === 0 ? 'opacity-30' : ''}`}>
                          <ChevronUpIcon color={isDark ? "#a5b4fc" : "#4f46e5"} size={20} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => moveItem(idx, 1)} disabled={idx === selectedAnswer.length - 1} className={`p-2 ${idx === selectedAnswer.length - 1 ? 'opacity-30' : ''}`}>
                          <ChevronDownIcon color={isDark ? "#a5b4fc" : "#4f46e5"} size={20} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}

              {isEvaluated && JSON.stringify(selectedAnswer) !== JSON.stringify(currentQ.correctOrder) && (
                <View className="mt-4 pl-2">
                  <Text className={`font-bold mb-2 ${isDark ? 'text-red-400' : 'text-red-500'}`}>Correct Order:</Text>
                  {currentQ.correctOrder.map((item, i) => (
                    <Text key={i} className={`leading-5 mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{i + 1}. {item}</Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* EXPLANATION BOX */}
          {isEvaluated && currentQ.explanation && (
            <View className={`mt-4 mb-6 p-5 rounded-3xl border-2 ${isDark ? 'bg-indigo-900/20 border-indigo-900/50' : 'bg-indigo-50 border-indigo-200'}`}>
              <View className="flex-row items-center mb-2">
                <InformationCircleIcon color={isDark ? "#818cf8" : "#4f46e5"} size={22} />
                <Text className={`font-bold text-base ml-2 ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>Explanation</Text>
              </View>
              <Text className={`text-base leading-6 ${isDark ? 'text-gray-300' : 'text-indigo-900'}`}>{currentQ.explanation}</Text>
            </View>
          )}

        </View>
      </ScrollView>

      <View className="pb-8 pt-4 border-t border-transparent">
        <TouchableOpacity 
          onPress={() => handlePrimaryAction(false)}
          disabled={isSubmitDisabled()}
          className={`py-4 rounded-full shadow-md ${
            !isSubmitDisabled()
              ? (isDark ? 'bg-indigo-600 shadow-indigo-950' : 'bg-blue-900 shadow-blue-300') 
              : (isDark ? 'bg-gray-800 shadow-none' : 'bg-gray-300 shadow-none')
          }`}
        >
          <Text className={`text-lg font-bold text-center ${isDark && isSubmitDisabled() ? 'text-gray-600' : 'text-white'}`}>
            {immediateFeedback && !isEvaluated 
              ? 'Check Answer' 
              : currentIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}