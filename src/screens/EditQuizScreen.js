import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuizStore } from '../store/useQuizStore';
import { generateQuizWithAI } from '../services/geminiService'; 

import { 
  ArrowLeftIcon, 
  CheckIcon, 
  TrashIcon, 
  ListBulletIcon, 
  CheckCircleIcon, 
  PencilSquareIcon,
  BookOpenIcon,
  QueueListIcon,       
  ArrowsUpDownIcon,   
  PlusCircleIcon,     
  XMarkIcon            
} from 'react-native-heroicons/outline';
import { SparklesIcon, CheckIcon as CheckIconSolid } from 'react-native-heroicons/solid';

export default function EditQuizScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  
  const { quiz } = route.params || {};
  
  const { 
    theme, 
    updateQuiz, 
    addQuiz, 
    collections, 
    addQuizzesToCollection, 
  } = useQuizStore(); 
  const isDark = theme === 'dark';

  // --- PRE-FILLED STATE ---
  const [title, setTitle] = useState(quiz?.title || '');
  const [subject, setSubject] = useState(quiz?.subject || ''); 
  const [description, setDescription] = useState(quiz?.description || '');
  const [questions, setQuestions] = useState(quiz?.questions || []);

  // --- AI MODIFICATION STATE ---
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAIModified, setIsAIModified] = useState(false); 

  const [isSuccessVisible, setIsSuccessVisible] = useState(false);

  // --- LOGIC: AI PARAPHRASE ---
  const handleAIParaphrase = async () => {
    if (questions.length === 0) {
      Alert.alert("No Questions", "There are no questions to modify!");
      return;
    }

    setIsGenerating(true);
    try {
      const simpleQuestions = questions.map(q => ({
        type: q.type,
        question: q.question,
        options: q.options || q.choices || [],
        correctAnswer: q.correctAnswer || q.answer || "",
        correctAnswers: q.correctAnswers || [],
        correctOrder: q.correctOrder || [],
        exactOrder: q.exactOrder || false
      }));

      const prompt = `You are an expert educator. Please paraphrase and reword the following quiz questions and their options to sound different, but retain the exact same meaning, difficulty, and correct answers. Keep the original 'type' of each question intact. Output ONLY the updated questions in your standard JSON format. Here is the original data: ${JSON.stringify(simpleQuestions)}`;

      const generatedData = await generateQuizWithAI(prompt, questions.length, null);
      
      const formattedQuestions = generatedData.questions.map((q, idx) => ({
        ...q,
        id: Date.now().toString() + idx, 
        type: q.type || 'multiple_choice', 
      }));
      
      setQuestions(formattedQuestions);
      
      setTitle(title.includes("(Modified)") ? title : `${title} (Modified)`);
      setIsAIModified(true); 
      
    } catch (error) {
      Alert.alert("AI Error", "Something went wrong while rewording the questions. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- LOGIC: MANAGE QUESTIONS ---
  const addNewQuestion = (type) => {
    const newQ = { id: Date.now().toString(), type: type, question: '', points: 1 };
    
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

  // --- ARRAY LOGIC FOR ENUMERATION/REARRANGE ---
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

    // SMART DATA SANITIZATION
    const sanitizedQuestions = questions.map(q => {
      // Skip heavy formatting for array-based questions to preserve them properly
      if (q.type === 'enumeration' || q.type === 'rearrange') {
        return q; 
      }

      let correct = "";
      let opts = [];

      if (q.type === 'multiple_choice' || q.type === 'true_false') {
        opts = q.options;
        correct = q.options[q.correctAnswerIndex] || q.correctAnswer;
      } else {
        correct = q.correctAnswer;
        opts = [];
      }

      const incorrect = opts.filter(o => o !== correct);

      return {
        ...q,
        options: opts,
        choices: opts,
        answers: opts,
        incorrect_answers: incorrect,
        incorrectAnswers: incorrect,
        correctAnswer: correct,
        answer: correct,
        correct_answer: correct
      };
    });

    const finalData = {
      ...quiz,
      title,
      subject, 
      description,
      questions: sanitizedQuestions,
      timerMinutes: sanitizedQuestions.length * 2 
    };

    if (isAIModified) {
      const newQuizId = `quiz-${Date.now()}`;
      finalData.id = newQuizId;
      addQuiz(finalData);

      collections.forEach(collection => {
        if (collection.quizIds && collection.quizIds.includes(quiz.id)) {
          addQuizzesToCollection(collection.id, [newQuizId]);
        }
      });
    } else {
      updateQuiz(quiz.id, finalData);
    }
    
    setIsSuccessVisible(true);
  };

  const handleCloseSuccess = () => {
    setIsSuccessVisible(false);
    navigation.goBack();
  };

  return (
    <View className={`flex-1 pt-12 ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
      
      <View className="flex-row items-center justify-between px-5 mb-4">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
          <ArrowLeftIcon color={isDark ? "white" : "#1e3a8a"} size={24} />
        </TouchableOpacity>
        <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-blue-900'}`}>Edit Quiz</Text>
        <TouchableOpacity onPress={handleSave} className={`p-2 rounded-full ${isDark ? 'bg-green-900/30' : 'bg-green-100'}`}>
          <CheckIcon color={isDark ? "#4ade80" : "#16a34a"} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        
        <TouchableOpacity 
          onPress={handleAIParaphrase}
          disabled={isGenerating}
          className={`flex-row items-center justify-center py-4 rounded-3xl mb-6 shadow-sm border ${isDark ? 'bg-indigo-900/40 border-indigo-500/50' : 'bg-indigo-600 border-indigo-700'}`}
        >
          {isGenerating ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <SparklesIcon color={isDark ? "#818cf8" : "white"} size={20} />
              <Text className={`font-bold text-base ml-2 ${isDark ? 'text-indigo-200' : 'text-white'}`}>Paraphrase Questions with AI</Text>
            </>
          )}
        </TouchableOpacity>

        <View className={`p-5 rounded-[32px] shadow-sm mb-6 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <Text className={`text-[10px] font-bold uppercase tracking-widest mb-1 ml-1 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>Quiz Title</Text>
          <TextInput
            className={`text-xl font-black mb-4 border-b pb-2 ${isDark ? 'text-white border-gray-700' : 'text-gray-800 border-gray-100'}`}
            value={title}
            onChangeText={setTitle}
            placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
          />

          <Text className={`text-[10px] font-bold uppercase tracking-widest mb-1 ml-1 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>Subject / Category</Text>
          <View className={`flex-row items-center rounded-xl px-3 mb-4 border ${isDark ? 'bg-indigo-900/20 border-indigo-900/50' : 'bg-indigo-50 border-indigo-100'}`}>
            <BookOpenIcon color={isDark ? "#818cf8" : "#4f46e5"} size={20} />
            <TextInput
              className={`flex-1 py-3 ml-2 font-bold ${isDark ? 'text-indigo-200' : 'text-indigo-900'}`}
              value={subject}
              onChangeText={setSubject}
              placeholderTextColor={isDark ? "#3730a3" : "#818cf8"}
            />
          </View>

          <Text className={`text-[10px] font-bold uppercase tracking-widest mb-1 ml-1 ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>Description</Text>
          <TextInput
            className={`rounded-xl p-3 border ${isDark ? 'bg-gray-900/50 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-100 text-gray-600'}`}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        <Text className={`text-sm font-bold uppercase tracking-widest mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Questions ({questions.length})</Text>

        {questions.map((q, index) => {
          const defaultCorrectIndex = q.correctAnswerIndex ?? q.options?.findIndex(opt => opt === (q.correctAnswer || q.answer));
          const safeCorrectIndex = defaultCorrectIndex !== -1 ? defaultCorrectIndex : 0;

          return (
            <View key={q.id || index} className={`p-5 rounded-3xl mb-4 shadow-sm border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
              <View className="flex-row justify-between items-center mb-3">
                <Text className={`font-bold uppercase text-[10px] tracking-tighter ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  {index + 1}. {(q.type || 'multiple_choice').replace('_', ' ')}
                </Text>
                <TouchableOpacity onPress={() => deleteQuestion(index)}>
                  <TrashIcon color="#ef4444" size={18} />
                </TouchableOpacity>
              </View>

              <TextInput
                className={`rounded-xl p-3 mb-3 font-medium border ${isDark ? 'bg-gray-900/50 border-gray-700 text-white' : 'bg-gray-50 border-gray-100 text-gray-800'}`}
                value={q.question}
                onChangeText={(text) => handleUpdateQuestionText(text, index)}
                placeholderTextColor={isDark ? "#4b5563" : "#9ca3af"}
                multiline
              />

              {/* MULTIPLE CHOICE / TRUE FALSE */}
              {((q.type || 'multiple_choice') === 'multiple_choice' || q.type === 'true_false') && (
                <View>
                  {(q.options || ['', '', '', '']).map((opt, optIdx) => (
                    <View key={optIdx} className="flex-row items-center mb-2">
                      <TouchableOpacity 
                        onPress={() => {
                          const updated = [...questions];
                          updated[index].correctAnswerIndex = optIdx;
                          setQuestions(updated);
                        }}
                        className={`w-5 h-5 rounded-full border-2 mr-2 items-center justify-center ${safeCorrectIndex === optIdx ? 'bg-indigo-600 border-indigo-600' : (isDark ? 'border-gray-600' : 'border-gray-300')}`}
                      >
                        {safeCorrectIndex === optIdx && <View className="w-2 h-2 bg-white rounded-full" />}
                      </TouchableOpacity>
                      <TextInput
                        className={`flex-1 rounded-lg px-3 py-2 border ${isDark ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-gray-50 border-gray-100 text-gray-700'}`}
                        value={opt}
                        onChangeText={(text) => handleUpdateOption(text, index, optIdx)}
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
            </View>
          );
        })}

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

      <View className="absolute bottom-6 right-5 left-5">
        <TouchableOpacity className="bg-indigo-600 py-4 rounded-full shadow-xl flex-row justify-center items-center" onPress={handleSave}>
          <CheckIcon color="white" size={24} />
          <Text className="text-white font-bold text-lg ml-2">
            {isAIModified ? 'Save as New Quiz' : 'Update Quiz'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal animationType="fade" transparent={true} visible={isSuccessVisible} onRequestClose={handleCloseSuccess}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
          <View className={`w-10/12 rounded-[40px] p-8 items-center shadow-2xl ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
            <View className="bg-[#4caf50] w-20 h-20 rounded-full items-center justify-center mb-6 shadow-sm shadow-green-200">
              <CheckIconSolid color="white" size={40} />
            </View>
            <Text className={`text-2xl font-extrabold mb-3 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {isAIModified ? "Saved Successfully" : "Update Successful"}
            </Text>
            <Text className={`text-base text-center mb-8 px-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {isAIModified ? "Your paraphrased quiz has been saved as a new file in this folder." : "Your changes have been saved to your library."}
            </Text>
            <TouchableOpacity className="bg-indigo-600 w-full py-4 rounded-full shadow-md" onPress={handleCloseSuccess}>
              <Text className="text-white text-center font-bold text-lg">OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}