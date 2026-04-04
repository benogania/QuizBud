import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useQuizStore } from '../store/useQuizStore'; // Import the store
import { XMarkIcon, ArrowLeftIcon } from 'react-native-heroicons/outline';
import { CheckCircleIcon, ArrowPathIcon } from 'react-native-heroicons/solid';

export default function MatchMasterScreen({ route, navigation }) {
  const { quiz } = route.params;
  
  // Pull theme from the store
  const { theme } = useQuizStore();
  const isDark = theme === 'dark';
  
  const [cards, setCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState(0);

  // Scoring & Stats
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameQuestions, setGameQuestions] = useState([]);

  // Initialize the game
  const startGame = () => {
    const selectedQs = quiz.questions.sort(() => Math.random() - 0.5).slice(0, 6);
    setGameQuestions(selectedQs);

    let deck = [];
    selectedQs.forEach((q) => {
      const answer = q.type === 'identification' ? q.correctAnswer : q.options[q.correctAnswerIndex];
      deck.push({ id: `Q-${q.id}`, matchId: q.id, text: q.question, type: 'Q', isMatched: false, status: 'default' });
      deck.push({ id: `A-${q.id}`, matchId: q.id, text: answer, type: 'A', isMatched: false, status: 'default' });
    });

    setCards(deck.sort(() => Math.random() - 0.5));
    setSelectedCards([]);
    setMatchedPairs(0);
    setScore(0);
    setAttempts(0);
    setIsGameOver(false);
  };

  useEffect(() => {
    startGame();
  }, []);

  const handleTap = (card) => {
    if (card.isMatched || selectedCards.length === 2 || selectedCards.find(c => c.id === card.id)) return;

    const newSelected = [...selectedCards, card];
    setSelectedCards(newSelected);

    setCards(prev => prev.map(c => c.id === card.id ? { ...c, status: 'selected' } : c));

    if (newSelected.length === 2) {
      setAttempts(prev => prev + 1);
      const isMatch = newSelected[0].matchId === newSelected[1].matchId;

      if (isMatch) {
        setScore(prev => prev + 100);
        setCards(prev => prev.map(c => 
          (c.id === newSelected[0].id || c.id === newSelected[1].id) ? { ...c, status: 'correct' } : c
        ));

        setTimeout(() => {
          setCards(prev => prev.map(c => 
            (c.id === newSelected[0].id || c.id === newSelected[1].id) ? { ...c, isMatched: true, status: 'default' } : c
          ));
          setSelectedCards([]);
          setMatchedPairs(prev => prev + 1);
        }, 600);

      } else {
        setScore(prev => Math.max(0, prev - 15));
        setCards(prev => prev.map(c => 
          (c.id === newSelected[0].id || c.id === newSelected[1].id) ? { ...c, status: 'incorrect' } : c
        ));

        setTimeout(() => {
          setCards(prev => prev.map(c => 
            (c.id === newSelected[0].id || c.id === newSelected[1].id) ? { ...c, status: 'default' } : c
          ));
          setSelectedCards([]);
        }, 800);
      }
    }
  };

  useEffect(() => {
    if (cards.length > 0 && matchedPairs === cards.length / 2) {
      setTimeout(() => setIsGameOver(true), 600);
    }
  }, [matchedPairs, cards]);

  if (isGameOver) {
    const accuracy = Math.round((matchedPairs / attempts) * 100) || 0;

    return (
      <View className={`flex-1 pt-12 ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
        <View className="flex-row items-center justify-between px-5 mb-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
            <ArrowLeftIcon color={isDark ? "white" : "#1e3a8a"} size={24} />
          </TouchableOpacity>
          <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-blue-900'}`}>Match Results</Text>
          <View className="w-8" />
        </View>

        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          <View className={`${isDark ? 'bg-indigo-950 border border-indigo-900' : 'bg-purple-900'} rounded-[40px] p-8 items-center shadow-lg mb-8 mt-4`}>
            <Text className="text-purple-300 font-bold tracking-widest uppercase text-xs mb-2">Final Score</Text>
            <Text className="text-6xl font-black text-white mb-6">{score}</Text>
            
            <View className="flex-row space-x-4 w-full">
              <View className={`${isDark ? 'bg-indigo-900' : 'bg-purple-800'} flex-1 py-4 rounded-2xl items-center border border-purple-700`}>
                <Text className="text-purple-300 text-[10px] font-bold uppercase mb-1">Attempts</Text>
                <Text className="text-xl font-bold text-white">{attempts}</Text>
              </View>
              <View className={`${isDark ? 'bg-indigo-900' : 'bg-purple-800'} flex-1 py-4 rounded-2xl items-center border border-purple-700`}>
                <Text className="text-purple-300 text-[10px] font-bold uppercase mb-1">Accuracy</Text>
                <Text className="text-xl font-bold text-white">{accuracy}%</Text>
              </View>
            </View>
          </View>

          <Text className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>Review Answers</Text>
          {gameQuestions.map((q, index) => {
            const answer = q.type === 'identification' ? q.correctAnswer : q.options[q.correctAnswerIndex];
            return (
              <View key={index} className={`p-5 rounded-3xl mb-4 shadow-sm border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                <View className="flex-row items-center mb-3">
                  <CheckCircleIcon color="#10b981" size={20} />
                  <Text className="text-xs font-bold text-green-600 tracking-wider uppercase ml-2">Matched Pair</Text>
                </View>
                <Text className={`text-sm font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>{q.question}</Text>
                <View className={`${isDark ? 'bg-indigo-900/30 border-indigo-900' : 'bg-purple-50 border-purple-100'} px-4 py-3 rounded-xl border`}>
                  <Text className={`${isDark ? 'text-indigo-300' : 'text-purple-900'} font-bold`}>{answer}</Text>
                </View>
              </View>
            );
          })}
          <View className="h-10" />
        </ScrollView>

        <View className={`px-5 pt-4 pb-8 border-t flex-row justify-between ${isDark ? 'bg-[#0f172a] border-gray-800' : 'bg-white border-gray-100'}`}>
          <TouchableOpacity 
            className={`py-4 rounded-full w-[48%] items-center ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}
            onPress={() => navigation.goBack()}
          >
            <Text className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-800'}`}>Exit Game</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className={`py-4 rounded-full w-[48%] items-center flex-row justify-center shadow-lg ${isDark ? 'bg-indigo-600' : 'bg-purple-700 shadow-purple-300'}`}
            onPress={startGame}
          >
            <ArrowPathIcon color="white" size={20} />
            <Text className="text-white font-bold text-base ml-2">Play Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className={`flex-1 pt-12 px-5 ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
      <View className="flex-row justify-between items-center mb-4">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <XMarkIcon color={isDark ? "white" : "#1e3a8a"} size={28} />
        </TouchableOpacity>
        <Text className={`text-xl font-black tracking-wide ${isDark ? 'text-purple-400' : 'text-purple-900'}`}>Match Master</Text>
        <Text className={`text-sm font-bold px-3 py-1 rounded-full ${isDark ? 'text-purple-300 bg-purple-900/40' : 'text-purple-600 bg-purple-100'}`}>
          {score} pts
        </Text>
      </View>

      <Text className={`text-center text-xs font-medium mb-6 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Tap a question and its matching answer!</Text>

      <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {cards.map(card => {
          if (card.isMatched) return <View key={card.id} className="w-[48%] h-32 mb-4" />;

          let cardStyle = isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
          let textStyle = card.type === 'Q' 
            ? (isDark ? "text-gray-200" : "text-gray-800") 
            : (isDark ? "text-indigo-300" : "text-indigo-800");

          if (card.status === 'selected') {
            cardStyle = isDark ? "bg-purple-900 border-purple-400 shadow-md" : "bg-purple-100 border-purple-500 shadow-md";
            textStyle = isDark ? "text-white" : "text-purple-900";
          } else if (card.status === 'correct') {
            cardStyle = isDark ? "bg-green-900 border-green-400 shadow-md" : "bg-green-100 border-green-500 shadow-md";
            textStyle = isDark ? "text-green-300" : "text-green-900";
          } else if (card.status === 'incorrect') {
            cardStyle = isDark ? "bg-red-900 border-red-400 shadow-md" : "bg-red-100 border-red-500 shadow-md";
            textStyle = isDark ? "text-red-300" : "text-red-900";
          }

          return (
            <TouchableOpacity
              key={card.id}
              activeOpacity={0.8}
              onPress={() => handleTap(card)}
              className={`w-[48%] h-32 p-3 mb-4 rounded-3xl justify-center items-center shadow-sm border-2 ${cardStyle}`}
            >
              <Text className={`text-center font-bold text-[11px] ${textStyle}`} numberOfLines={5}>
                {card.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}