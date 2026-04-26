import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuizStore } from '../store/useQuizStore';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { triggerHaptic } from '../utils/hapticHelper';

import { ArrowLeftIcon, DocumentDuplicateIcon } from 'react-native-heroicons/outline';
import { SparklesIcon, CheckCircleIcon } from 'react-native-heroicons/solid';

export default function AIPromptGuideScreen() {
  const { theme, hapticsEnabled } = useQuizStore();
  const isDark = theme === 'dark';
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [copiedId, setCopiedId] = useState(null);

  // --- PROMPT TEMPLATES ---

  const standardPrompt = `Act as an expert teacher. Analyze the attached document/text and generate a quiz. You MUST include Multiple Choice, True/False, and Identification questions with explanations.

CRITICAL: Return ONLY a raw JSON object with this exact structure. Do not use Markdown formatting like \`\`\`json.

{
  "version": "1.2",
  "type": "multi",
  "collectionName": "Generated Standard Quiz",
  "quizzes": [
    {
      "id": "quiz-1",
      "title": "Your Topic Here",
      "description": "Short description of the quiz.",
      "timerMinutes": 15,
      "questions": [
        {
          "id": "q1",
          "type": "multiple_choice",
          "question": "Question text here?",
          "options": ["A", "B", "C", "D"],
          "correctAnswerIndex": 1,
          "points": 1,
          "explanation": "Why this is correct."
        },
        {
          "id": "q2",
          "type": "identification",
          "question": "Identify this concept...",
          "correctAnswer": "Exact Word",
          "points": 1,
          "explanation": "Why this is correct."
        },
        {
          "id": "q3",
          "type": "true_false",
          "question": "Statement here.",
          "options": ["True", "False"],
          "correctAnswerIndex": 1,
          "points": 1,
          "explanation": "Why this is correct."
        }
      ]
    }
  ]
}`;

  const enumerationPrompt = `Act as an expert teacher. Analyze the attached document/text and generate an Enumeration (Listing) quiz. Provide a concept/question and the list of exact correct answers.

CRITICAL: Return ONLY a raw JSON object with this exact structure. Do not use Markdown formatting like \`\`\`json.

{
  "version": "1.2",
  "type": "multi",
  "collectionName": "Generated Enumeration Quiz",
  "quizzes": [
    {
      "id": "quiz-enum",
      "title": "Enumeration Topic",
      "description": "List the correct items based on the text.",
      "timerMinutes": 10,
      "questions": [
        {
          "id": "q1",
          "type": "enumeration",
          "question": "List the 3 primary states of matter.",
          "correctAnswers": ["Solid", "Liquid", "Gas"],
          "points": 3,
          "explanation": "These are the fundamental states."
        }
      ]
    }
  ]
}`;

  const rearrangePrompt = `Act as an expert teacher. Analyze the attached document/text and generate a Re-arrange (Ordering) quiz. Provide a question/scenario and the items in their EXACT correct chronological or logical order.

CRITICAL: Return ONLY a raw JSON object with this exact structure. Do not use Markdown formatting like \`\`\`json.

{
  "version": "1.2",
  "type": "multi",
  "collectionName": "Generated Rearrange Quiz",
  "quizzes": [
    {
      "id": "quiz-arr",
      "title": "Rearranging Topic",
      "description": "Order the items correctly based on the text.",
      "timerMinutes": 10,
      "questions": [
        {
          "id": "q1",
          "type": "rearrange",
          "question": "Arrange these historical events in chronological order.",
          "correctOrder": ["Oldest Event", "Middle Event", "Most Recent Event"],
          "points": 3,
          "explanation": "This is the correct sequence."
        }
      ]
    }
  ]
}`;

  const PROMPT_DATA = [
    {
      id: 'standard',
      title: 'Standard Mix',
      desc: 'Multiple Choice, True/False, and Identification.',
      text: standardPrompt,
    },
    {
      id: 'enumeration',
      title: 'Enumeration (Listing)',
      desc: 'Questions where users must list multiple correct answers.',
      text: enumerationPrompt,
    },
    {
      id: 'rearrange',
      title: 'Re-arrange (Ordering)',
      desc: 'Questions where users must drag items into the correct sequence.',
      text: rearrangePrompt,
    },
  ];

  const handleCopy = async (id, text) => {
    triggerHaptic(hapticsEnabled, 'Light');
    await Clipboard.setStringAsync(text);
    setCopiedId(id);
    
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  return (
    <View className={`flex-1 ${isDark ? "bg-[#0f172a]" : "bg-[#fbf8ff]"}`}>
      <LinearGradient 
        colors={isDark ? ["#1e1b4b", "transparent"] : ["#e0e0fa", "transparent"]} 
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400 }} 
      />

      <View className="flex-1 bg-transparent" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center px-5 py-4 mb-2">
          <TouchableOpacity onPress={() => { triggerHaptic(hapticsEnabled, 'Light'); navigation.goBack(); }} className="p-2 -ml-2">
            <ArrowLeftIcon color={isDark ? "white" : "#1e3a8a"} size={24} />
          </TouchableOpacity>
          <Text className={`text-xl font-black ml-2 ${isDark ? "text-white" : "text-indigo-900"}`}>AI Import Guide</Text>
        </View>

        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          
          <View className={`p-6 rounded-[32px] mb-8 shadow-sm ${isDark ? "bg-indigo-900/30" : "bg-white shadow-indigo-100"}`}>
            <View className="flex-row items-center mb-3">
              <SparklesIcon color="#4f46e5" size={24} />
              <Text className={`text-xl font-extrabold ml-2 ${isDark ? "text-white" : "text-gray-900"}`}>Use Any AI</Text>
            </View>
            <Text className={`leading-6 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              Want to generate a quiz from a PDF, photo, or long article using ChatGPT or Claude? Copy a prompt below, attach your file to the AI, and paste the resulting JSON code back into QuizBud!
            </Text>
          </View>

          {PROMPT_DATA.map((prompt) => {
            const isCopied = copiedId === prompt.id;
            
            return (
              <View key={prompt.id} className="mb-10">
                <View className="flex-row justify-between items-end mb-3">
                  <View className="flex-1 pr-4">
                    <Text className={`text-base font-extrabold mb-1 ${isDark ? "text-indigo-300" : "text-indigo-900"}`}>{prompt.title}</Text>
                    <Text className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{prompt.desc}</Text>
                  </View>
                  
                  <TouchableOpacity 
                    onPress={() => handleCopy(prompt.id, prompt.text)}
                    className={`flex-row items-center px-4 py-2 rounded-full shadow-sm ${isCopied ? 'bg-green-500' : (isDark ? 'bg-indigo-600' : 'bg-indigo-100 shadow-indigo-200')}`}
                  >
                    {isCopied ? (
                      <>
                        <CheckCircleIcon color="white" size={14} />
                        <Text className="text-white text-xs font-bold ml-1.5">Copied!</Text>
                      </>
                    ) : (
                      <>
                        <DocumentDuplicateIcon color={isDark ? "white" : "#4f46e5"} size={14} />
                        <Text className={`text-xs font-bold ml-1.5 ${isDark ? "text-white" : "text-indigo-700"}`}>Copy</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <View className={`p-5 rounded-3xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-slate-200 shadow-sm shadow-slate-200/50"}`}>
                  <Text selectable={true} className={`font-mono text-xs leading-5 ${isDark ? "text-gray-300" : "text-gray-700"}`} numberOfLines={5}>
                    {prompt.text}
                  </Text>
                </View>
              </View>
            );
          })}

        </ScrollView>
      </View>
    </View>
  );
}