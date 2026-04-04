import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator } from 'react-native';
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
  DocumentIcon
} from 'react-native-heroicons/outline';
import { SparklesIcon, XMarkIcon, CheckIcon as CheckIconSolid } from 'react-native-heroicons/solid'; // Added CheckIconSolid for the modal

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
  const [numQuestions, setNumQuestions] = useState(5);

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
    if (!aiTopic.trim() && !selectedFile) {
      Alert.alert("Hold up", "Please enter a topic or upload a study document.");
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

      const generatedData = await generateQuizWithAI(aiTopic, numQuestions, fileData);
      
      setTitle(generatedData.title || '');
      setSubject(generatedData.subject || '');
      setDescription(generatedData.description || '');
      
      const formattedQuestions = generatedData.questions.map((q, idx) => ({
        ...q,
        id: Date.now().toString() + idx, 
        type: 'multiple_choice', 
      }));
      
      setQuestions(formattedQuestions);
      setIsAIModalVisible(false);
      setAiTopic('');
      setSelectedFile(null); 
      
    } catch (error) {
      Alert.alert("AI Error", "Something went wrong. If you uploaded a file, ensure it is not too large.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- LOGIC: MANAGE QUESTIONS ---
  const addNewQuestion = (type) => {
    const newQ = { id: Date.now().toString(), type: type, question: '', points: 1 };
    if (type === 'multiple_choice') { newQ.options = ['', '', '', '']; newQ.correctAnswerIndex = 0; } 
    else if (type === 'true_false') { newQ.options = ['True', 'False']; newQ.correctAnswerIndex = 0; } 
    else { newQ.correctAnswer = ''; }
    setQuestions([...questions, newQ]);
  };

  const handleUpdateQuestionText = (text, index) => {
    const updated = [...questions];
    updated[index].question = text;
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

  const deleteQuestion = (index) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
  };

  // --- LOGIC: SAVE QUIZ ---
  const handleSave = () => {
    // Keep error alerts as quick popups
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
    
    // Trigger custom modal instead of system alert
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
              className={`rounded-xl p-3 mb-3 font-medium border ${isDark ? 'bg-gray-900/50 border-gray-700 text-white' : 'bg-gray-50 border-gray-100 text-gray-800'}`}
              value={q.question}
              onChangeText={(text) => handleUpdateQuestionText(text, index)}
              placeholder="Enter question..."
              placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
              multiline
            />

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

            {q.type === 'identification' && (
              <TextInput
                className={`rounded-xl p-3 border font-bold ${isDark ? 'bg-indigo-900/30 border-indigo-800 text-indigo-300' : 'bg-indigo-50 border-indigo-100 text-indigo-900'}`}
                value={q.correctAnswer}
                onChangeText={(text) => handleUpdateAnswer(text, index)}
                placeholder="Correct Answer"
                placeholderTextColor={isDark ? "#3730a3" : "#818cf8"}
              />
            )}
          </View>
        ))}

        {/* MANUAL ADD QUESTION SECTION */}
        <View className={`p-6 rounded-[40px] mt-4 shadow-lg ${isDark ? 'bg-indigo-950' : 'bg-indigo-900 shadow-indigo-300'}`}>
          <Text className="text-white font-bold text-lg mb-4 text-center">Add Question Manually</Text>
          <View className="flex-row justify-between">
            <TouchableOpacity onPress={() => addNewQuestion('multiple_choice')} className={`items-center p-3 rounded-2xl w-[30%] ${isDark ? 'bg-indigo-900' : 'bg-indigo-800'}`}>
              <ListBulletIcon color="white" size={24} />
              <Text className="text-white text-[10px] font-bold mt-1">MCQ</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => addNewQuestion('true_false')} className={`items-center p-3 rounded-2xl w-[30%] ${isDark ? 'bg-indigo-900' : 'bg-indigo-800'}`}>
              <CheckCircleIcon color="white" size={24} />
              <Text className="text-white text-[10px] font-bold mt-1">T / F</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => addNewQuestion('identification')} className={`items-center p-3 rounded-2xl w-[30%] ${isDark ? 'bg-indigo-900' : 'bg-indigo-800'}`}>
              <PencilSquareIcon color="white" size={24} />
              <Text className="text-white text-[10px] font-bold mt-1">Ident</Text>
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
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
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
              <View>
                {/* File Upload Section */}
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

                {/* Topic Input */}
                <Text className={`font-bold mb-2 ml-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>2. Specific Topic or Instructions</Text>
                <TextInput
                  className={`rounded-2xl p-4 mb-6 border ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  placeholder="e.g., 'Focus on Chapter 3' or 'JavaScript Promises'"
                  placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
                  value={aiTopic}
                  onChangeText={setAiTopic}
                />

                {/* Number of Questions */}
                <Text className={`font-bold mb-2 ml-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>3. Number of Questions</Text>
                <View className="flex-row items-center justify-between mb-8 px-4">
                  <TouchableOpacity 
                    onPress={() => setNumQuestions(prev => Math.max(1, prev - 1))}
                    className={`w-12 h-12 rounded-full items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}
                  >
                    <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>-</Text>
                  </TouchableOpacity>
                  
                  <Text className={`text-3xl font-black ${isDark ? 'text-indigo-400' : 'text-indigo-900'}`}>{numQuestions}</Text>
                  
                  <TouchableOpacity 
                    onPress={() => setNumQuestions(prev => Math.min(20, prev + 1))} // Capped at 20 to avoid timeouts
                    className={`w-12 h-12 rounded-full items-center justify-center ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}
                  >
                    <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>+</Text>
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity 
                  className={`py-4 rounded-full flex-row items-center justify-center ${(aiTopic.trim() || selectedFile) ? 'bg-indigo-600' : 'bg-gray-400'}`}
                  onPress={handleAIGenerate}
                  disabled={!aiTopic.trim() && !selectedFile}
                >
                  <Text className="text-white font-bold text-lg mr-2">Generate Quiz</Text>
                  <SparklesIcon color="white" size={20} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
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