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
  Alert,
  Modal,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuizStore } from '../store/useQuizStore';
import { askAIAssistant, generateQuizWithAI } from '../services/geminiService'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { triggerHaptic } from '../utils/hapticHelper';

import { 
  ArrowLeftIcon, 
  PaperClipIcon, 
  DocumentTextIcon, 
  XMarkIcon,
  ClockIcon,
  TrashIcon,
  PlusIcon
} from 'react-native-heroicons/outline';
import { 
  SparklesIcon, 
  PaperAirplaneIcon, 
  BoltIcon,
  CheckCircleIcon
} from 'react-native-heroicons/solid';

const DEFAULT_MESSAGE = { 
  id: '1', 
  role: 'model', 
  text: "Hi there! I'm QuizBud AI. 🧠✨\n\nStuck on a concept? Upload a document, ask a question, or long-press my responses to generate a custom quiz!" 
};

export default function AIAssistantScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef(null);

  // Destructure the new history methods from your store
  const { 
    theme, 
    addQuiz, 
    aiTone, 
    hapticsEnabled, 
    chatHistory = [], 
    saveChatSession,
    deleteChatSession 
  } = useQuizStore(); 
  
  const isDark = theme === 'dark';

  // Chat & Session States
  const [currentSessionId, setCurrentSessionId] = useState(Date.now().toString());
  const [messages, setMessages] = useState([DEFAULT_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false); 
  const [selectedFile, setSelectedFile] = useState(null);

  // History Modal State
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);

  // Selection & Quiz Generation States
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [isQuizModalVisible, setIsQuizModalVisible] = useState(false);
  const [quizQuestionCount, setQuizQuestionCount] = useState(5);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  const getToneInstructions = () => {
    if (aiTone === "Explain like I'm 5") return "Use very simple language, relatable analogies, and a fun, encouraging tone. Assume the user is a complete beginner.";
    if (aiTone === "Academic") return "Use highly professional, academic, and rigorous language. Include technical terms and precise definitions.";
    return "Use a clear, helpful, and standard educational tone.";
  };

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow', () => setKeyboardVisible(true));
    const keyboardDidHideListener = Keyboard.addListener(Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide', () => setKeyboardVisible(false));
    return () => { keyboardDidHideListener.remove(); keyboardDidShowListener.remove(); };
  }, []);

  // Auto-save session when messages change (if there's actual conversation)
  useEffect(() => {
    if (messages.length > 1 && saveChatSession) {
      const firstUserMessage = messages.find(m => m.role === 'user');
      const previewText = firstUserMessage ? firstUserMessage.text : "New Chat";
      
      saveChatSession({
        id: currentSessionId,
        title: previewText.substring(0, 40) + (previewText.length > 40 ? '...' : ''),
        date: new Date().toISOString(),
        messages: messages
      });
    }
  }, [messages, currentSessionId]);

  const handleStartNewChat = () => {
    setCurrentSessionId(Date.now().toString());
    setMessages([DEFAULT_MESSAGE]);
    setIsHistoryModalVisible(false);
    triggerHaptic(hapticsEnabled, 'Light');
  };

  const handleLoadSession = (session) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setIsHistoryModalVisible(false);
    triggerHaptic(hapticsEnabled, 'Light');
  };

  const handleAttachFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'text/plain'], copyToCacheDirectory: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const base64Data = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
        setSelectedFile({ name: file.name, mimeType: file.mimeType || 'application/pdf', base64: base64Data });
      }
    } catch (error) {
      Alert.alert("Error", "Could not attach the file.");
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() && !selectedFile) return;

    const userMessage = { id: Date.now().toString(), role: 'user', text: inputText.trim() || "Here is a document.", hasFile: !!selectedFile };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    const fileToProcess = selectedFile;
    setSelectedFile(null);

    try {
      const historyForGemini = newMessages.slice(1, -1); 
      const hiddenPrompt = `${userMessage.text}\n\n[SYSTEM INSTRUCTION: ${getToneInstructions()}]`;
      const replyText = await askAIAssistant(historyForGemini, hiddenPrompt, fileToProcess);
      
      const aiMessage = { id: (Date.now() + 1).toString(), role: 'model', text: replyText };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = { id: (Date.now() + 1).toString(), role: 'model', text: "Oops! My brain froze. Make sure you are connected to the internet and try again." };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- SELECTION & QUIZ LOGIC ---
  const handleLongPressMessage = (item) => {
    if (item.role !== 'model') return; 
    triggerHaptic(hapticsEnabled, 'Medium');
    setIsSelectionMode(true);
    setSelectedMessageIds([item.id]);
  };

  const handlePressMessage = (item) => {
    if (!isSelectionMode || item.role !== 'model') return;
    triggerHaptic(hapticsEnabled, 'Light');
    
    if (selectedMessageIds.includes(item.id)) {
      const newSelected = selectedMessageIds.filter(id => id !== item.id);
      setSelectedMessageIds(newSelected);
      if (newSelected.length === 0) setIsSelectionMode(false);
    } else {
      setSelectedMessageIds([...selectedMessageIds, item.id]);
    }
  };

  const handleCreateQuizFromSelection = async () => {
    setIsQuizModalVisible(false);
    setIsGeneratingQuiz(true); 
    
    const selectedTextContext = messages
      .filter(m => selectedMessageIds.includes(m.id))
      .map(m => m.text)
      .join('\n\n---\n\n');

    try {
      const hiddenContext = `Based on the following extracted information from our chat:\n\n${selectedTextContext}\n\n[SYSTEM INSTRUCTION: Generate a ${quizQuestionCount}-question quiz based strictly on the information above. Write the questions and answers using this tone: ${getToneInstructions()}]`;
      
      const newQuiz = await generateQuizWithAI(hiddenContext, quizQuestionCount, null);
      
      if (!newQuiz || !newQuiz.questions || !Array.isArray(newQuiz.questions)) {
        throw new Error("Invalid Format");
      }

      const safeQuestions = newQuiz.questions.map((q, index) => {
        const safeOptions = q.options || q.choices || ["A", "B", "C", "D"];
        return {
          id: q.id || `chat-q-${index}-${Date.now()}`,
          type: "multiple_choice", 
          question: q.question || "Missing question text?",
          options: safeOptions,
          correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
          points: q.points || 1
        };
      });

      const finalQuiz = { 
        ...newQuiz, 
        id: `chat-gen-${Date.now()}`,
        title: `${quizQuestionCount}-Question AI Review`,
        subject: newQuiz.subject || "Study Assistant Quiz",
        questions: safeQuestions
      };
      
      addQuiz(finalQuiz); 
      
      setIsSelectionMode(false);
      setSelectedMessageIds([]);
      setIsGeneratingQuiz(false); 
      
      Alert.alert("Success!", "Quiz saved to your Library!");
      navigation.navigate("QuizPlayer", { quiz: finalQuiz });

    } catch (error) {
      setIsGeneratingQuiz(false);
      Alert.alert("Formatting Error", "The AI generated an incomplete quiz. Please try generating again!");
    }
  };

  const adjustQuestionCount = (amount) => {
    triggerHaptic(hapticsEnabled, 'Light');
    setQuizQuestionCount(prev => Math.max(1, Math.min(20, prev + amount))); 
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    const isSelected = selectedMessageIds.includes(item.id);

    return (
      <View className={`mb-4 max-w-[85%] ${isUser ? 'self-end' : 'self-start'}`}>
        {!isUser && (
          <View className="flex-row items-center mb-1 ml-1">
            <SparklesIcon color={isDark ? "#818cf8" : "#4f46e5"} size={14} />
            <Text className={`text-[10px] font-bold ml-1 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>QuizBud AI</Text>
          </View>
        )}
        
        <TouchableOpacity 
          activeOpacity={isUser ? 1 : 0.7}
          onLongPress={() => handleLongPressMessage(item)}
          onPress={() => handlePressMessage(item)}
          className={`p-4 rounded-3xl flex-row ${
            isUser 
              ? (isDark ? 'bg-indigo-600 rounded-tr-sm justify-end' : 'bg-indigo-600 rounded-tr-sm justify-end') 
              : (isSelected 
                  ? (isDark ? 'bg-indigo-900/80 border-indigo-500 rounded-tl-sm border-2' : 'bg-indigo-100 border-indigo-400 rounded-tl-sm border-2')
                  : (isDark ? 'bg-gray-800 rounded-tl-sm border-2 border-gray-700' : 'bg-white rounded-tl-sm shadow-sm border-2 border-transparent'))
          }`}
        >
          {isSelected && !isUser && (
            <View className="mr-3 mt-1">
              <CheckCircleIcon color={isDark ? "#818cf8" : "#4f46e5"} size={20} />
            </View>
          )}
          
          <View className="shrink">
            {item.hasFile && (
              <View className="flex-row items-center mb-2 bg-black/20 p-2 rounded-xl self-start">
                <DocumentTextIcon color="white" size={16} />
                <Text className="text-white text-xs font-bold ml-2">Attached Document</Text>
              </View>
            )}
            <Text className={`text-base leading-6 ${isUser ? 'text-white' : (isDark ? 'text-gray-200' : 'text-gray-800')}`}>
              {item.text}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View className={`flex-1 ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`} style={{ paddingTop: insets.top }}>
      
      {/* HEADER SECTION */}
      {isSelectionMode ? (
        <View className={`flex-row items-center justify-between px-5 py-4 border-b ${isDark ? 'bg-indigo-900/40 border-indigo-900' : 'bg-indigo-50 border-indigo-100'}`}>
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => { setIsSelectionMode(false); setSelectedMessageIds([]); }} className="p-2 -ml-2 rounded-full">
              <XMarkIcon color={isDark ? "white" : "#1e3a8a"} size={24} />
            </TouchableOpacity>
            <Text className={`text-lg font-bold ml-2 ${isDark ? 'text-white' : 'text-blue-900'}`}>
              {selectedMessageIds.length} Selected
            </Text>
          </View>

          <TouchableOpacity onPress={() => setIsQuizModalVisible(true)} className={`flex-row items-center px-4 py-2 rounded-full shadow-sm ${isDark ? 'bg-indigo-600' : 'bg-indigo-600'}`}>
             <BoltIcon color="white" size={16} />
             <Text className="ml-1 font-bold text-sm text-white">Make Quiz</Text>
          </TouchableOpacity>
        </View>
      ) : (
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
          <View className="flex-row items-center">
             <TouchableOpacity onPress={handleStartNewChat} className="p-2 mr-1">
              <PlusIcon color={isDark ? "white" : "#1e3a8a"} size={24} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsHistoryModalVisible(true)} className="p-2 -mr-2">
              <ClockIcon color={isDark ? "white" : "#1e3a8a"} size={24} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* CHAT INTERFACE */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "android" ? (isKeyboardVisible ? 25 : 0) : 0}>
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

        {selectedFile && !isSelectionMode && (
          <View className={`mx-5 flex-row items-center self-start px-3 py-2 rounded-xl mb-3 ${isDark ? 'bg-gray-800' : 'bg-indigo-50 border border-indigo-100'}`}>
            <DocumentTextIcon color={isDark ? "#a5b4fc" : "#4f46e5"} size={16} />
            <Text className={`text-xs font-bold mx-2 ${isDark ? 'text-gray-300' : 'text-indigo-900'}`} numberOfLines={1} style={{ maxWidth: 200 }}>{selectedFile.name}</Text>
            <TouchableOpacity onPress={() => setSelectedFile(null)}>
              <XMarkIcon color={isDark ? "#9ca3af" : "#9ca3af"} size={16} />
            </TouchableOpacity>
          </View>
        )}

        {!isSelectionMode && (
          <View className={`px-5 py-4 border-t flex-row items-end ${isDark ? 'bg-[#0f172a] border-gray-800' : 'bg-white border-gray-200'}`} style={{ paddingBottom: isKeyboardVisible ? 16 : Math.max(insets.bottom, 16) }}>
            <TouchableOpacity onPress={handleAttachFile} className={`p-3 rounded-full mr-2 mb-0.5 ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
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
              className={`ml-2 w-12 h-12 rounded-full items-center justify-center ${(inputText.trim() || selectedFile) ? 'bg-indigo-600' : (isDark ? 'bg-gray-800' : 'bg-gray-200')}`}
              onPress={sendMessage}
              disabled={(!inputText.trim() && !selectedFile) || isLoading}
            >
              <PaperAirplaneIcon color={(inputText.trim() || selectedFile) ? "white" : (isDark ? "#4b5563" : "#9ca3af")} size={20} style={{ marginLeft: -2 }} />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* CHAT HISTORY MODAL */}
      <Modal animationType="slide" transparent={true} visible={isHistoryModalVisible} onRequestClose={() => setIsHistoryModalVisible(false)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View className={`h-3/4 rounded-t-3xl p-6 shadow-2xl ${isDark ? "bg-gray-900" : "bg-white"}`}>
            <View className="flex-row justify-between items-center mb-6">
              <Text className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>Chat History</Text>
              <TouchableOpacity onPress={() => setIsHistoryModalVisible(false)} className={`p-2 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <XMarkIcon color={isDark ? "white" : "black"} size={20} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={handleStartNewChat} 
              className={`mb-4 flex-row items-center justify-center p-4 rounded-xl border ${isDark ? 'border-indigo-500 bg-indigo-900/30' : 'border-indigo-300 bg-indigo-50'}`}
            >
              <PlusIcon color={isDark ? "#818cf8" : "#4f46e5"} size={20} />
              <Text className={`ml-2 font-bold ${isDark ? "text-indigo-300" : "text-indigo-700"}`}>Start New Chat</Text>
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              {chatHistory.length === 0 ? (
                <Text className={`text-center mt-10 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No previous chats found.</Text>
              ) : (
                chatHistory.map((session) => (
                  <TouchableOpacity 
                    key={session.id}
                    onPress={() => handleLoadSession(session)}
                    className={`flex-row items-center justify-between p-4 mb-3 rounded-2xl ${currentSessionId === session.id ? (isDark ? 'bg-gray-800 border border-gray-700' : 'bg-gray-100 border border-gray-200') : (isDark ? 'bg-gray-800/50' : 'bg-gray-50')}`}
                  >
                    <View className="flex-1 mr-4">
                      <Text className={`font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`} numberOfLines={1}>
                        {session.title}
                      </Text>
                      <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(session.date).toLocaleDateString()}
                      </Text>
                    </View>
                    {deleteChatSession && (
                      <TouchableOpacity onPress={() => deleteChatSession(session.id)} className="p-2">
                        <TrashIcon color="#ef4444" size={20} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* QUIZ GENERATION MODALS*/}
      <Modal animationType="fade" transparent={true} visible={isQuizModalVisible} onRequestClose={() => setIsQuizModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" }}>
          <View className={`w-10/12 rounded-[32px] p-6 shadow-2xl ${isDark ? "bg-gray-900" : "bg-white"}`}>
            
            <View className={`w-16 h-16 rounded-full self-center items-center justify-center mb-4 ${isDark ? 'bg-indigo-900/50' : 'bg-indigo-100'}`}>
              <BoltIcon color={isDark ? "#818cf8" : "#4f46e5"} size={32} />
            </View>
            
            <Text className={`text-xl font-extrabold mb-2 text-center ${isDark ? "text-white" : "text-gray-900"}`}>
              Generate Quiz
            </Text>
            <Text className={`text-sm text-center mb-6 px-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              How many questions should QuizBud generate from the selected messages?
            </Text>
            
            <View className={`flex-row items-center justify-between p-4 rounded-2xl mb-8 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <TouchableOpacity onPress={() => adjustQuestionCount(-1)} className={`w-12 h-12 rounded-full items-center justify-center shadow-sm ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
                <Text className={`font-bold text-2xl ${isDark ? 'text-white' : 'text-indigo-900'}`}>-</Text>
              </TouchableOpacity>
              
              <Text className={`text-3xl font-black mx-4 w-16 text-center ${isDark ? 'text-white' : 'text-indigo-900'}`}>
                {quizQuestionCount}
              </Text>
              
              <TouchableOpacity onPress={() => adjustQuestionCount(1)} className={`w-12 h-12 rounded-full items-center justify-center shadow-sm ${isDark ? 'bg-gray-700' : 'bg-white'}`}>
                <Text className={`font-bold text-2xl ${isDark ? 'text-white' : 'text-indigo-900'}`}>+</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row justify-end items-center">
              <TouchableOpacity className="px-5 py-3 rounded-full mr-2" onPress={() => setIsQuizModalVisible(false)}>
                <Text className={`font-bold ${isDark ? "text-gray-400" : "text-gray-500"}`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity className="bg-indigo-600 px-6 py-3 rounded-full shadow-sm" onPress={handleCreateQuizFromSelection}>
                <Text className="text-white font-bold">Generate</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={isGeneratingQuiz} onRequestClose={() => {}}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", alignItems: "center" }}>
          <View className={`w-10/12 rounded-[40px] p-8 items-center shadow-2xl ${isDark ? "bg-[#1e1e2d] border border-gray-800" : "bg-white"}`}>
            <View className={`w-20 h-20 rounded-full items-center justify-center mb-6 shadow-sm ${isDark ? 'bg-indigo-900/50' : 'bg-indigo-100'}`}>
              <SparklesIcon color={isDark ? "#818cf8" : "#4f46e5"} size={40} />
            </View>
            
            <Text className={`text-2xl font-extrabold mb-3 text-center ${isDark ? "text-white" : "text-gray-900"}`}>
              Crafting Quiz...
            </Text>
            
            <Text className={`text-base text-center mb-8 px-2 leading-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              QuizBud is analyzing your selections and generating your custom questions.
            </Text>
            
            <ActivityIndicator size="large" color={isDark ? "#818cf8" : "#4f46e5"} />
          </View>
        </View>
      </Modal>

    </View>
  );
}