import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator,
  Keyboard,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuizStore } from '../store/useQuizStore';
import { askAIAssistant, generateQuizWithAI } from '../services/geminiService'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { 
  ArrowLeftIcon, 
  PaperClipIcon, 
  DocumentTextIcon, 
  XMarkIcon 
} from 'react-native-heroicons/outline';
import { 
  SparklesIcon, 
  PaperAirplaneIcon, 
  BoltIcon 
} from 'react-native-heroicons/solid';

export default function AIAssistantScreen() {
  const navigation = useNavigation();
  const { theme, addQuiz } = useQuizStore(); 
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const flatListRef = useRef(null);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false); 
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  const [messages, setMessages] = useState([
    { 
      id: '1', 
      role: 'model', 
      text: "Hi there! I'm QuizBud AI. 🧠✨\n\nStuck on a concept? Upload a document, ask a question, or have me instantly generate a quiz from our chat!" 
    }
  ]);

  // Keyboard Listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const handleAttachFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain'], 
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const base64Data = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        setSelectedFile({
          name: file.name,
          mimeType: file.mimeType || 'application/pdf',
          base64: base64Data
        });
      }
    } catch (error) {
      Alert.alert("Error", "Could not attach the file.");
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() && !selectedFile) return;

    const userMessage = { 
      id: Date.now().toString(), 
      role: 'user', 
      text: inputText.trim() || "Here is a document.",
      hasFile: !!selectedFile 
    };
    
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    const fileToProcess = selectedFile;
    setSelectedFile(null);

    try {
      const historyForGemini = newMessages.slice(1, -1); 
      const replyText = await askAIAssistant(historyForGemini, userMessage.text, fileToProcess);
      
      const aiMessage = { id: (Date.now() + 1).toString(), role: 'model', text: replyText };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = { id: (Date.now() + 1).toString(), role: 'model', text: "Oops! My brain froze. Make sure you are connected to the internet and try again." };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- UPDATED: AUTO-QUIZ GENERATOR WITH STRICT CLEANUP ---
  const handleCreateQuizFromChat = async () => {
    if (isGeneratingQuiz) return;
    
    const chatContext = messages.length > 1 
      ? "the concepts we discussed in this chat" 
      : "General Knowledge";

    Alert.alert(
      "Create Quiz",
      "Generate a 5-question quiz based on this conversation or your uploaded file?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Generate", 
          onPress: async () => {
            setIsGeneratingQuiz(true);
            try {
              const newQuiz = await generateQuizWithAI(chatContext, 5, selectedFile);
              
              // 1. Validate the AI actually returned questions
              if (!newQuiz || !newQuiz.questions || !Array.isArray(newQuiz.questions)) {
                throw new Error("Invalid Format");
              }

              // 2. Force the data to perfectly match your QuizPlayer requirements
              const safeQuestions = newQuiz.questions.map((q, index) => {
                // Handle cases where AI names the array 'choices' instead of 'options'
                const safeOptions = q.options || q.choices || ["A", "B", "C", "D"];
                
                return {
                  id: q.id || `chat-q-${index}-${Date.now()}`,
                  type: "multiple_choice", // STRICT ENFORCEMENT
                  question: q.question || "Missing question text?",
                  options: safeOptions,
                  correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
                  points: q.points || 1
                };
              });

              // 3. Assemble the final bulletproof quiz
              const finalQuiz = { 
                ...newQuiz, 
                id: `chat-gen-${Date.now()}`,
                subject: newQuiz.subject || "Study Assistant Quiz",
                questions: safeQuestions
              };
              
              addQuiz(finalQuiz); 
              setSelectedFile(null); 
              
              Alert.alert("Success!", "Quiz saved to your Library!");
              setIsGeneratingQuiz(false);
              navigation.navigate("QuizPlayer", { quiz: finalQuiz });

            } catch (error) {
              setIsGeneratingQuiz(false);
              Alert.alert("Formatting Error", "The AI generated an incomplete quiz. Please try tapping Generate again!");
            }
          }
        }
      ]
    );
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View className={`mb-4 max-w-[85%] ${isUser ? 'self-end' : 'self-start'}`}>
        {!isUser && (
          <View className="flex-row items-center mb-1 ml-1">
            <SparklesIcon color={isDark ? "#818cf8" : "#4f46e5"} size={14} />
            <Text className={`text-[10px] font-bold ml-1 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>QuizBud AI</Text>
          </View>
        )}
        <View 
          className={`p-4 rounded-3xl ${
            isUser 
              ? (isDark ? 'bg-indigo-600 rounded-tr-sm' : 'bg-indigo-600 rounded-tr-sm') 
              : (isDark ? 'bg-gray-800 rounded-tl-sm border border-gray-700' : 'bg-white rounded-tl-sm shadow-sm border border-gray-100')
          }`}
        >
          {item.hasFile && (
            <View className="flex-row items-center mb-2 bg-black/20 p-2 rounded-xl">
              <DocumentTextIcon color="white" size={16} />
              <Text className="text-white text-xs font-bold ml-2">Attached Document</Text>
            </View>
          )}
          <Text className={`text-base leading-6 ${isUser ? 'text-white' : (isDark ? 'text-gray-200' : 'text-gray-800')}`}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View className={`flex-1 ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`} style={{ paddingTop: insets.top }}>
      
      {/* Header */}
      <View className={`flex-row items-center justify-between px-5 py-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
            <ArrowLeftIcon color={isDark ? "white" : "#1e3a8a"} size={24} />
          </TouchableOpacity>
          <View className="flex-row items-center ml-2">
            <SparklesIcon color={isDark ? "#a5b4fc" : "#4f46e5"} size={24} />
            <Text className={`text-lg font-bold ml-2 ${isDark ? 'text-white' : 'text-blue-900'}`}>Study Assistant</Text>
          </View>
        </View>

        <TouchableOpacity 
          onPress={handleCreateQuizFromChat}
          disabled={isGeneratingQuiz}
          className={`flex-row items-center px-3 py-1.5 rounded-full ${isDark ? 'bg-indigo-900/50' : 'bg-indigo-100'}`}
        >
          {isGeneratingQuiz ? (
             <ActivityIndicator color={isDark ? "#818cf8" : "#4f46e5"} size="small" />
          ) : (
             <>
               <BoltIcon color={isDark ? "#818cf8" : "#4f46e5"} size={16} />
               <Text className={`ml-1 font-bold text-xs ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>Make Quiz</Text>
             </>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "android" ? (isKeyboardVisible ? 25 : 0) : 0} 
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 20, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled" 
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {isLoading && (
          <View className="px-6 pb-4 self-start flex-row items-center">
            <ActivityIndicator size="small" color={isDark ? "#818cf8" : "#4f46e5"} />
            <Text className={`ml-2 text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>QuizBud is typing...</Text>
          </View>
        )}

        {selectedFile && (
          <View className={`mx-5 flex-row items-center self-start px-3 py-2 rounded-xl mb-3 ${isDark ? 'bg-gray-800' : 'bg-indigo-50 border border-indigo-100'}`}>
            <DocumentTextIcon color={isDark ? "#a5b4fc" : "#4f46e5"} size={16} />
            <Text className={`text-xs font-bold mx-2 ${isDark ? 'text-gray-300' : 'text-indigo-900'}`} numberOfLines={1} style={{ maxWidth: 200 }}>
              {selectedFile.name}
            </Text>
            <TouchableOpacity onPress={() => setSelectedFile(null)}>
              <XMarkIcon color={isDark ? "#9ca3af" : "#9ca3af"} size={16} />
            </TouchableOpacity>
          </View>
        )}

        <View 
          className={`px-5 py-4 border-t flex-row items-end ${isDark ? 'bg-[#0f172a] border-gray-800' : 'bg-white border-gray-200'}`}
          style={{ paddingBottom: isKeyboardVisible ? 16 : Math.max(insets.bottom, 16) }}
        >
          <TouchableOpacity 
            onPress={handleAttachFile}
            className={`p-3 rounded-full mr-2 mb-0.5 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}
          >
            <PaperClipIcon color={isDark ? "#9ca3af" : "#6b7280"} size={22} />
          </TouchableOpacity>

          <TextInput
            className={`flex-1 rounded-3xl px-5 py-3.5 max-h-32 text-base ${isDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'}`}
            placeholder="Ask a question..."
            placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            className={`ml-2 w-12 h-12 rounded-full items-center justify-center ${
              (inputText.trim() || selectedFile) ? 'bg-indigo-600' : (isDark ? 'bg-gray-800' : 'bg-gray-200')
            }`}
            onPress={sendMessage}
            disabled={(!inputText.trim() && !selectedFile) || isLoading}
          >
            <PaperAirplaneIcon color={(inputText.trim() || selectedFile) ? "white" : (isDark ? "#4b5563" : "#9ca3af")} size={20} style={{ marginLeft: -2 }} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

    </View>
  );
}