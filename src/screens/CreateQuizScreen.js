import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuizStore } from '../store/useQuizStore';
import { generateQuizWithAI } from '../services/geminiService'; 

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { 
  ArrowLeftIcon, 
  CheckIcon, 
  TrashIcon, 
  ListBulletIcon, 
  CheckCircleIcon, 
  PencilSquareIcon,
  BookOpenIcon,
  DocumentPlusIcon, 
  DocumentIcon,
  QueueListIcon,       
  ArrowsUpDownIcon,    
  PlusCircleIcon      
} from 'react-native-heroicons/outline';
import { SparklesIcon, XMarkIcon, CheckIcon as CheckIconSolid } from 'react-native-heroicons/solid';

export default function CreateQuizScreen() {
  const navigation = useNavigation();
  const addQuiz = useQuizStore((state) => state.addQuiz);
  const { theme } = useQuizStore(); 
  const isDark = theme === 'dark';

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(''); 
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState([]);

  // --- AI STATE ---
  const [isAIModalVisible, setIsAIModalVisible] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // --- FILE & NUMBER STATE ---
  const [selectedFile, setSelectedFile] = useState(null);
  const [numQuestions, setNumQuestions] = useState('5'); 

  // --- CUSTOM SUCCESS MODAL STATE ---
  const [isSuccessVisible, setIsSuccessVisible] = useState(false);

  // --- LOGIC: FILE PICKING ---
  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain'], 
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      Alert.alert("Error", "Could not select the file.");
    }
  };

  // --- LOGIC: AI GENERATION ---
  const handleAIGenerate = async () => {
    const apiKeys = useQuizStore.getState().geminiApiKeys || [];
    if (apiKeys.length === 0 || !apiKeys[0].trim()) {
      setIsAIModalVisible(false); 
      Alert.alert(
        "API Key Required",
        "To generate AI quizzes, you need to add your free Gemini API key in the app settings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Go to Settings", onPress: () => navigation.navigate("Settings") } 
        ]
      );
      return;
    }

    if (!aiTopic.trim() && !selectedFile) {
      Alert.alert("Hold up", "Please enter a topic or upload a study document.");
      return;
    }

    const parsedNum = parseInt(numQuestions, 10);
    if (isNaN(parsedNum) || parsedNum <= 0) {
      Alert.alert("Invalid Number", "Please enter a valid number of questions.");
      return;
    }

    setIsGenerating(true);
    try {
      let fileData = null;

      if (selectedFile) {
        const base64 = await FileSystem.readAsStringAsync(selectedFile.uri, { 
          encoding: FileSystem.EncodingType.Base64 
        });
        fileData = {
          base64: base64,
          mimeType: selectedFile.mimeType || 'application/pdf'
        };
      }

      // 🚨 UPDATED PROMPT: Appended explicit instruction forcing explanations
      const promptWithExplanationRequirement = `${aiTopic}\n\nCRITICAL INSTRUCTION: You MUST provide a clear, concise "explanation" property for every single question explaining why the correct answer is right. Do not omit this.`;

      const generatedData = await generateQuizWithAI(promptWithExplanationRequirement, parsedNum, fileData);
      
      setTitle(generatedData.title || '');
      setSubject(generatedData.subject || '');
      setDescription(generatedData.description || '');
      
      const formattedQuestions = generatedData.questions.map((q, idx) => ({
        ...q,
        id: Date.now().toString() + idx, 
        type: q.type || 'multiple_choice', 
      }));
      
      setQuestions(formattedQuestions);
      setIsAIModalVisible(false);
      setAiTopic('');
      setSelectedFile(null); 
      
    } catch (error) {
      const errorMsg = error?.message?.toLowerCase() || "";
      if (errorMsg.includes("api key") || errorMsg.includes("not valid") || errorMsg.includes("unauthorized") || errorMsg.includes("not found")) {
        Alert.alert("API Key Required", "Please add a valid Gemini API Key in the Settings screen to generate quizzes.");
      } else if (errorMsg.includes("quota") || errorMsg.includes("429") || errorMsg.includes("exhausted")) {
        Alert.alert("Limit Reached", "Your API key has reached its usage limit for today. Please try again later.");
      } else if (errorMsg.includes("network") || errorMsg.includes("internet") || errorMsg.includes("fetch")) {
        Alert.alert("Connection Error", "Please check your internet connection and try again.");
      } else {
        Alert.alert("AI Error", "Something went wrong. If you uploaded a file, ensure it is not too large.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // --- LOGIC: MANAGE QUESTIONS ---
  const addNewQuestion = (type) => {
    const newQ = { id: Date.now().toString(), type: type, question: '', points: 1, explanation: '' };
    
    if (type === 'multiple_choice') { 
      newQ.options = ['', '', '', '']; 
      newQ.correctAnswerIndex = 0; 
    } 
    else if (type === 'true_false') { 
      newQ.options = ['True', 'False']; 
      newQ.correctAnswerIndex = 0; 
    } 
    else if (type === 'identification') { 
      newQ.correctAnswer = ''; 
    }
    else if (type === 'enumeration') {
      newQ.correctAnswers = ['', ''];
      newQ.exactOrder = false;
    }
    else if (type === 'rearrange') {
      newQ.correctOrder = ['', ''];
    }
    
    setQuestions([...questions, newQ]);
  };

  const handleUpdateQuestionText = (text, index) => {
    const updated = [...questions];
    updated[index].question = text;
    setQuestions(updated);
  };

  const handleUpdateExplanationText = (text, index) => {
    const updated = [...questions];
    updated[index].explanation = text;
    setQuestions(updated);
  };

  const handleUpdateAnswer = (text, qIndex) => {
    const updated = [...questions];
    updated[qIndex].correctAnswer = text;
    setQuestions(updated);
  };

  const handleUpdateOption = (text, qIndex, optIndex) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = text;
    setQuestions(updated);
  };

  const handleUpdateArrayItem = (text, qIndex, itemIndex, fieldKey) => {
    const updated = [...questions];
    updated[qIndex][fieldKey][itemIndex] = text;
    setQuestions(updated);
  };

  const handleAddArrayItem = (qIndex, fieldKey) => {
    const updated = [...questions];
    updated[qIndex][fieldKey].push('');
    setQuestions(updated);
  };

  const handleRemoveArrayItem = (qIndex, itemIndex, fieldKey) => {
    const updated = [...questions];
    updated[qIndex][fieldKey].splice(itemIndex, 1);
    setQuestions(updated);
  };

  const handleToggleExactOrder = (qIndex) => {
    const updated = [...questions];
    updated[qIndex].exactOrder = !updated[qIndex].exactOrder;
    setQuestions(updated);
  };

  const deleteQuestion = (index) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
  };

  // --- LOGIC: SAVE QUIZ ---
  const handleSave = () => {
    if (!title.trim()) return Alert.alert("Error", "Quiz title is required!");
    if (!subject.trim()) return Alert.alert("Error", "Please enter a subject!");
    if (questions.length === 0) return Alert.alert("Error", "Please add at least one question!");

    const newQuiz = {
      id: Date.now().toString(),
      title,
      subject, 
      description,
      questions,
      timerMinutes: questions.length * 2 
    };

    addQuiz(newQuiz);
    setIsSuccessVisible(true);
  };

  const handleCloseSuccess = () => {
    setIsSuccessVisible(false);
    navigation.goBack();
  };

  return (
    <View className={`flex-1 pt-12 ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 mb-4">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
          <ArrowLeftIcon color={isDark ? "white" : "#1e3a8a"} size={24} />
        </TouchableOpacity>
        <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-blue-900'}`}>Create New Quiz</Text>
        <TouchableOpacity onPress={handleSave} className={`p-2 rounded-full ${isDark ? 'bg-green-900/30' : 'bg-green-100'}`}>
          <CheckIcon color={isDark ? "#4ade80" : "#16a34a"} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        
        {/* MAGIC AI BUTTON */}
        <TouchableOpacity 
          onPress={() => setIsAIModalVisible(true)}
          className={`flex-row items-center justify-center py-4 rounded-3xl mb-6 shadow-sm border ${isDark ? 'bg-indigo-900/40 border-indigo-500/50' : 'bg-indigo-600 border-indigo-700'}`}
        >
          <SparklesIcon color={isDark ? "#818cf8" : "white"} size={20} />
          <Text className={`font-bold text-base ml-2 ${isDark ? 'text-indigo-200' : 'text-white'}`}>Auto-Generate with AI</Text>
        </TouchableOpacity>

        {/* Quiz Details Form */}
        <View className={`p-5 rounded-[32px] shadow-sm mb-6 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <Text className={`text-[10px] font-bold uppercase tracking-widest mb-1 ml-1 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>Quiz Title</Text>
          <TextInput
            className={`text-xl font-black mb-4 border-b pb-2 ${isDark ? 'text-white border-gray-700' : 'text-gray-800 border-gray-100'}`}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Cellular Biology 101"
            placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
          />

          <Text className={`text-[10px] font-bold uppercase tracking-widest mb-1 ml-1 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>Subject / Category</Text>
          <View className={`flex-row items-center rounded-xl px-3 mb-4 border ${isDark ? 'bg-indigo-900/20 border-indigo-900/50' : 'bg-indigo-50 border-indigo-100'}`}>
            <BookOpenIcon color={isDark ? "#818cf8" : "#4f46e5"} size={20} />
            <TextInput
              className={`flex-1 py-3 ml-2 font-bold ${isDark ? 'text-indigo-200' : 'text-indigo-900'}`}
              value={subject}
              onChangeText={setSubject}
              placeholder="e.g., Science, History, Math"
              placeholderTextColor={isDark ? "#3730a3" : "#818cf8"}
            />
          </View>

          <Text className={`text-[10px] font-bold uppercase tracking-widest mb-1 ml-1 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>Description (Optional)</Text>
          <TextInput
            className={`rounded-xl p-3 border ${isDark ? 'bg-gray-900/50 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-100 text-gray-600'}`}
            value={description}
            onChangeText={setDescription}
            placeholder="What is this quiz about?"
            placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
            multiline
          />
        </View>

        {/* Questions List Header */}
        <Text className={`text-sm font-bold uppercase tracking-widest mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Questions ({questions.length})</Text>
        
        {questions.length === 0 && (
          <View className="items-center justify-center py-8">
            <Text className="text-gray-400 italic">No questions yet. Generate or add one below!</Text>
          </View>
        )}

        {/* MAPPING QUESTIONS */}
        {questions.map((q, index) => (
          <View key={q.id || index} className={`p-5 rounded-3xl mb-4 shadow-sm border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <View className="flex-row justify-between items-center mb-3">
              <Text className={`font-bold uppercase text-[10px] tracking-tighter ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                {index + 1}. {q.type.replace('_', ' ')}
              </Text>
              <TouchableOpacity onPress={() => deleteQuestion(index)}>
                <TrashIcon color="#ef4444" size={18} />
              </TouchableOpacity>
            </View>

            <TextInput
              className={`rounded-xl p-3 mb-3 font-medium border min-h-[60px] ${isDark ? 'bg-gray-900/50 border-gray-700 text-white' : 'bg-gray-50 border-gray-100 text-gray-800'}`}
              value={q.question}
              onChangeText={(text) => handleUpdateQuestionText(text, index)}
              placeholder="Enter question..."
              placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
              multiline
              textAlignVertical="top" // Ensure text starts at the top of the box
            />

            {/* MULTIPLE CHOICE & TRUE FALSE */}
            {(q.type === 'multiple_choice' || q.type === 'true_false') && (
              <View>
                {q.options.map((opt, optIdx) => (
                  <View key={optIdx} className="flex-row items-center mb-2">
                    <TouchableOpacity 
                      onPress={() => {
                        const updated = [...questions];
                        updated[index].correctAnswerIndex = optIdx;
                        setQuestions(updated);
                      }}
                      className={`w-5 h-5 rounded-full border-2 mr-2 items-center justify-center ${q.correctAnswerIndex === optIdx ? 'bg-indigo-600 border-indigo-600' : (isDark ? 'border-gray-600' : 'border-gray-300')}`}
                    >
                      {q.correctAnswerIndex === optIdx && <View className="w-2 h-2 bg-white rounded-full" />}
                    </TouchableOpacity>
                    <TextInput
                      className={`flex-1 rounded-lg px-3 py-2 border ${isDark ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-gray-50 border-gray-100 text-gray-700'}`}
                      value={opt}
                      onChangeText={(text) => handleUpdateOption(text, index, optIdx)}
                      placeholder={`Option ${optIdx + 1}`}
                      placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
                      editable={q.type !== 'true_false'} 
                    />
                  </View>
                ))}
              </View>
            )}

            {/* IDENTIFICATION */}
            {q.type === 'identification' && (
              <TextInput
                className={`rounded-xl p-3 border font-bold ${isDark ? 'bg-indigo-900/30 border-indigo-800 text-indigo-300' : 'bg-indigo-50 border-indigo-100 text-indigo-900'}`}
                value={q.correctAnswer}
                onChangeText={(text) => handleUpdateAnswer(text, index)}
                placeholder="Correct Answer"
                placeholderTextColor={isDark ? "#3730a3" : "#818cf8"}
              />
            )}

            {/* ENUMERATION */}
            {q.type === 'enumeration' && (
              <View>
                <TouchableOpacity 
                  onPress={() => handleToggleExactOrder(index)}
                  className="flex-row items-center mb-3 ml-1"
                >
                  <View className={`w-5 h-5 rounded border items-center justify-center mr-2 ${q.exactOrder ? 'bg-indigo-500 border-indigo-500' : (isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-white')}`}>
                    {q.exactOrder && <CheckIconSolid color="white" size={14} />}
                  </View>
                  <Text className={`text-xs font-bold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Require Exact Order</Text>
                </TouchableOpacity>

                {q.correctAnswers?.map((ans, aIdx) => (
                  <View key={aIdx} className="flex-row items-center mb-2">
                    <Text className={`font-bold mr-2 w-4 text-right ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{aIdx + 1}.</Text>
                    <TextInput
                      className={`flex-1 rounded-lg px-3 py-2 border ${isDark ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-gray-50 border-gray-100 text-gray-700'}`}
                      value={ans}
                      onChangeText={(text) => handleUpdateArrayItem(text, index, aIdx, 'correctAnswers')}
                      placeholder={`Answer ${aIdx + 1}`}
                      placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
                    />
                    <TouchableOpacity onPress={() => handleRemoveArrayItem(index, aIdx, 'correctAnswers')} className="p-2">
                      <XMarkIcon color="#ef4444" size={20} />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity 
                  onPress={() => handleAddArrayItem(index, 'correctAnswers')}
                  className={`mt-2 flex-row items-center justify-center py-2 rounded-lg border border-dashed ${isDark ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-gray-50'}`}
                >
                  <PlusCircleIcon color={isDark ? "#9ca3af" : "#6b7280"} size={18} />
                  <Text className={`font-bold ml-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Add Item</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* REARRANGE */}
            {q.type === 'rearrange' && (
              <View>
                <Text className={`text-xs font-bold mb-2 ml-1 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Define the Correct Order:</Text>
                {q.correctOrder?.map((item, oIdx) => (
                  <View key={oIdx} className="flex-row items-center mb-2">
                    <Text className={`font-bold mr-2 w-4 text-right ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{oIdx + 1}.</Text>
                    <TextInput
                      className={`flex-1 rounded-lg px-3 py-2 border ${isDark ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-gray-50 border-gray-100 text-gray-700'}`}
                      value={item}
                      onChangeText={(text) => handleUpdateArrayItem(text, index, oIdx, 'correctOrder')}
                      placeholder={`Step ${oIdx + 1}`}
                      placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
                    />
                    <TouchableOpacity onPress={() => handleRemoveArrayItem(index, oIdx, 'correctOrder')} className="p-2">
                      <XMarkIcon color="#ef4444" size={20} />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity 
                  onPress={() => handleAddArrayItem(index, 'correctOrder')}
                  className={`mt-2 flex-row items-center justify-center py-2 rounded-lg border border-dashed ${isDark ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-gray-50'}`}
                >
                  <PlusCircleIcon color={isDark ? "#9ca3af" : "#6b7280"} size={18} />
                  <Text className={`font-bold ml-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Add Step</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 🚨 NEW: EXPLANATION FIELD */}
            <View className="mt-4 border-t border-dashed pt-3 border-gray-200 dark:border-gray-700">
              <Text className={`text-[10px] font-bold uppercase tracking-widest mb-1 ml-1 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Explanation</Text>
              <TextInput
                className={`rounded-xl p-3 border text-sm ${isDark ? 'bg-gray-900/50 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-100 text-gray-600'}`}
                value={q.explanation || ''}
                onChangeText={(text) => handleUpdateExplanationText(text, index)}
                placeholder="Why is this the correct answer?"
                placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
                multiline
              />
            </View>
          </View>
        ))}

        {/* MANUAL ADD QUESTION SECTION */}
        <View className={`p-6 rounded-[40px] mt-4 shadow-lg ${isDark ? 'bg-indigo-950' : 'bg-indigo-900 shadow-indigo-300'}`}>
          <Text className="text-white font-bold text-lg mb-4 text-center">Add Question Manually</Text>
          
          <View className="flex-row flex-wrap justify-between gap-y-3">
            <TouchableOpacity onPress={() => addNewQuestion('multiple_choice')} className={`items-center p-3 rounded-2xl w-[31%] ${isDark ? 'bg-indigo-900' : 'bg-indigo-800'}`}>
              <ListBulletIcon color="white" size={24} />
              <Text className="text-white text-[10px] font-bold mt-1">MCQ</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => addNewQuestion('true_false')} className={`items-center p-3 rounded-2xl w-[31%] ${isDark ? 'bg-indigo-900' : 'bg-indigo-800'}`}>
              <CheckCircleIcon color="white" size={24} />
              <Text className="text-white text-[10px] font-bold mt-1">T / F</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => addNewQuestion('identification')} className={`items-center p-3 rounded-2xl w-[31%] ${isDark ? 'bg-indigo-900' : 'bg-indigo-800'}`}>
              <PencilSquareIcon color="white" size={24} />
              <Text className="text-white text-[10px] font-bold mt-1">Ident</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => addNewQuestion('enumeration')} className={`items-center p-3 rounded-2xl w-[48%] ${isDark ? 'bg-indigo-900' : 'bg-indigo-800'}`}>
              <QueueListIcon color="white" size={24} />
              <Text className="text-white text-[10px] font-bold mt-1">Enum</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => addNewQuestion('rearrange')} className={`items-center p-3 rounded-2xl w-[48%] ${isDark ? 'bg-indigo-900' : 'bg-indigo-800'}`}>
              <ArrowsUpDownIcon color="white" size={24} />
              <Text className="text-white text-[10px] font-bold mt-1">Rearrange</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Save FAB */}
      <View className="absolute bottom-6 right-5 left-5">
        <TouchableOpacity 
          className="bg-indigo-600 py-4 rounded-full shadow-xl flex-row justify-center items-center"
          onPress={handleSave}
        >
          <CheckIcon color="white" size={24} />
          <Text className="text-white font-bold text-lg ml-2">Save Quiz</Text>
        </TouchableOpacity>
      </View>

      {/* AI GENERATION MODAL */}
      <Modal animationType="slide" transparent={true} visible={isAIModalVisible} onRequestClose={() => setIsAIModalVisible(false)}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}
        >
          <View className={`w-full rounded-t-[40px] p-6 pb-12 shadow-2xl ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
            <View className="flex-row justify-between items-center mb-6">
              <View className="flex-row items-center">
                <View className={`p-2 rounded-full mr-2 ${isDark ? 'bg-indigo-900/50' : 'bg-indigo-100'}`}>
                  <SparklesIcon color={isDark ? "#818cf8" : "#4f46e5"} size={20} />
                </View>
                <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>AI Generator</Text>
              </View>
              <TouchableOpacity onPress={() => !isGenerating && setIsAIModalVisible(false)}>
                <XMarkIcon color={isDark ? "#9ca3af" : "#6b7280"} size={24} />
              </TouchableOpacity>
            </View>

            {isGenerating ? (
              <View className="items-center justify-center py-10">
                <ActivityIndicator size="large" color="#4f46e5" />
                <Text className={`mt-4 font-bold text-lg ${isDark ? 'text-indigo-300' : 'text-indigo-900'}`}>Reading & Analyzing...</Text>
                <Text className="text-sm text-gray-500 mt-2 text-center px-4">
                  Gemini is scanning your inputs and crafting the perfect questions. This may take a few seconds.
                </Text>
              </View>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text className={`font-bold mb-2 ml-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>1. Upload Study Material (Optional)</Text>
                <TouchableOpacity 
                  onPress={handlePickFile}
                  className={`flex-row items-center justify-center p-4 rounded-2xl border-2 border-dashed mb-6 ${isDark ? 'border-gray-700 bg-gray-800' : 'border-indigo-200 bg-indigo-50'}`}
                >
                  {selectedFile ? (
                    <View className="flex-row items-center justify-between w-full px-2">
                      <View className="flex-row items-center flex-1">
                        <DocumentIcon color={isDark ? "#818cf8" : "#4f46e5"} size={24} />
                        <Text className={`font-bold ml-2 flex-1 ${isDark ? 'text-indigo-200' : 'text-indigo-900'}`} numberOfLines={1}>
                          {selectedFile.name}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => setSelectedFile(null)} className="p-1">
                        <XMarkIcon color="#ef4444" size={20} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <DocumentPlusIcon color={isDark ? "#9ca3af" : "#4f46e5"} size={24} />
                      <Text className={`font-bold ml-2 ${isDark ? 'text-gray-400' : 'text-indigo-900'}`}>Select PDF or Text File</Text>
                    </>
                  )}
                </TouchableOpacity>

                <Text className={`font-bold mb-2 ml-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>2. Specific Topic or Instructions</Text>
                {/* 🚨 UPDATED: Made input taller and multiline */}
                <TextInput
                  className={`rounded-2xl p-4 mb-6 border min-h-[120px] ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  placeholder="e.g., 'Create a difficult quiz about JavaScript Promises. Focus heavily on async/await syntax and error handling...'"
                  placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                  value={aiTopic}
                  onChangeText={setAiTopic}
                  multiline
                  textAlignVertical="top" 
                />

                <Text className={`font-bold mb-2 ml-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>3. Number of Questions</Text>
                <TextInput
                  className={`rounded-2xl p-4 mb-8 border font-black text-center text-2xl ${isDark ? 'bg-gray-800 border-gray-700 text-indigo-400' : 'bg-gray-50 border-gray-200 text-indigo-900'}`}
                  keyboardType="numeric"
                  value={numQuestions}
                  onChangeText={(text) => {
                    const formatted = text.replace(/[^0-9]/g, '');
                    setNumQuestions(formatted);
                  }}
                  placeholder="e.g., 10"
                  placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
                  maxLength={2} 
                />
                
                <TouchableOpacity 
                  className={`py-4 rounded-full flex-row items-center justify-center ${(aiTopic.trim() || selectedFile) && numQuestions ? 'bg-indigo-600' : 'bg-gray-400'}`}
                  onPress={handleAIGenerate}
                  disabled={(!aiTopic.trim() && !selectedFile) || !numQuestions}
                >
                  <Text className="text-white font-bold text-lg mr-2">Generate Quiz</Text>
                  <SparklesIcon color="white" size={20} />
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* CUSTOM SUCCESS MODAL */}
      <Modal animationType="fade" transparent={true} visible={isSuccessVisible} onRequestClose={handleCloseSuccess}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
          <View className={`w-10/12 rounded-[40px] p-8 items-center shadow-2xl ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
            <View className="bg-[#4caf50] w-20 h-20 rounded-full items-center justify-center mb-6 shadow-sm shadow-green-200">
              <CheckIconSolid color="white" size={40} />
            </View>
            <Text className={`text-2xl font-extrabold mb-3 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>Action Successful</Text>
            <Text className={`text-base text-center mb-8 px-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Your new quiz has been successfully saved to your library.
            </Text>
            <TouchableOpacity 
              className="bg-indigo-600 w-full py-4 rounded-full shadow-md"
              onPress={handleCloseSuccess}
            >
              <Text className="text-white text-center font-bold text-lg">OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}