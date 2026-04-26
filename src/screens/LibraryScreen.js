import React, { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, TouchableWithoutFeedback, Alert, ActivityIndicator, Animated, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuizStore } from "../store/useQuizStore";
import * as FileSystem from "expo-file-system/legacy";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { generateDailyChallenge } from "../services/geminiService";
import { triggerHaptic } from "../utils/hapticHelper";

import {
  ClockIcon,
  DocumentArrowUpIcon,
  DocumentTextIcon,
  BookOpenIcon,
  FolderIcon,
  FolderPlusIcon,
  BriefcaseIcon,
  BookmarkIcon,
  GlobeAltIcon,
  MapIcon,
  BeakerIcon,
  RocketLaunchIcon,
  PaintBrushIcon,
  ChevronRightIcon,
  Squares2X2Icon,
  ListBulletIcon,
  QuestionMarkCircleIcon, 
  ClipboardDocumentListIcon 
} from "react-native-heroicons/outline";

import {
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  SparklesIcon,
  CheckIcon as CheckIconSolid,
  AcademicCapIcon,
  FireIcon,
  StarIcon as StarSolid,
  PlusCircleIcon,
  KeyIcon // <-- NEW: Imported for the API Modal
} from "react-native-heroicons/solid";

const ICON_MAP = {
  folder: FolderIcon, book: BookOpenIcon, briefcase: BriefcaseIcon,
  bookmark: BookmarkIcon, globe: GlobeAltIcon, map: MapIcon,
  beaker: BeakerIcon, rocket: RocketLaunchIcon, art: PaintBrushIcon,
};

const formatHistoryDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function LibraryScreen() {
  const { theme } = useQuizStore();
  const isDark = theme === "dark";
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const {
    quizzes, quizHistory = [], deleteQuiz, addQuiz,
    dailyChallenge, lastDailyFetch, setDailyChallenge,
    collections = [], createCollection, editCollection, deleteCollection,
    updateCollectionIcon, addQuizzesToCollection, hapticsEnabled,
    geminiApiKeys = []
  } = useQuizStore();

  const recentHistory = quizHistory.slice(0, 3);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const popAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.spring(popAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();
    }, 400);
  }, []);

  const [isGeneratingDaily, setIsGeneratingDaily] = useState(false);
  const [successConfig, setSuccessConfig] = useState({ visible: false, title: "", message: "" });
  
  // 🚨 NEW: State for API Key Modal
  const [isApiKeyModalVisible, setIsApiKeyModalVisible] = useState(false);

  const [isFolderModalVisible, setIsFolderModalVisible] = useState(false);
  const [isFolderActionModalVisible, setIsFolderActionModalVisible] = useState(false);
  const [isIconPickerVisible, setIsIconPickerVisible] = useState(false);
  const [folderNameInput, setFolderNameInput] = useState("");
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [isGridView, setIsGridView] = useState(false);
  const [isPasteModalVisible, setIsPasteModalVisible] = useState(false);
  const [pastedJSON, setPastedJSON] = useState("");
const handlePlayDailyChallenge = async () => {
    // 🚨 CHECK IF ARRAY IS EMPTY
    if (geminiApiKeys.length === 0 || !geminiApiKeys[0].trim()) {
      triggerHaptic(hapticsEnabled, "Warning");
      setIsApiKeyModalVisible(true);
      return;
    }

    const today = new Date().toDateString();
    if (dailyChallenge && lastDailyFetch === today) {
      navigation.navigate("QuizPlayer", { quiz: dailyChallenge });
      return;
    }
    
    setIsGeneratingDaily(true);
    try {
      const pastDailyQuizzes = quizHistory.filter((q) => q.quizTitle && q.quizTitle.includes("Daily Trivia"));
      const pastQuestions = pastDailyQuizzes.flatMap((q) => (q.history || []).map((h) => h.question)).slice(0, 50);

      
      const dailyQuiz = await generateDailyChallenge(pastQuestions, geminiApiKeys[0]);
    
      if (!dailyQuiz || !dailyQuiz.questions) throw new Error("Invalid AI Response");
      const finalQuiz = { ...dailyQuiz, id: `daily-${Date.now()}` };
      if (setDailyChallenge) setDailyChallenge(finalQuiz);
      setIsGeneratingDaily(false);
      navigation.navigate("QuizPlayer", { quiz: finalQuiz });
    } catch (error) {
      setIsGeneratingDaily(false);
      Alert.alert("AI Error", "The AI Masters are busy. Please try again.");
    }
  };

  const loadSampleStarterPack = () => {
    const timeKey = Date.now();
    const q1Id = `sample-q1-${timeKey}`;
    const q2Id = `sample-q2-${timeKey}`;
    const q3Id = `sample-q3-${timeKey}`;
    const q4Id = `sample-q4-${timeKey}`;

    const q1 = {
      id: q1Id,
      title: "The 5 Quiz Modes",
      subject: "Tutorial",
      description: "A quick tour of all the interactive question types you can build and play in QuizBud.",
      timerMinutes: 10,
      questions: [
        { id: "q1", type: "multiple_choice", question: "Which of the following is NOT a feature of QuizBud?", options: ["AI Generation", "Folder Collections", "Video Streaming", "JSON Import"], correctAnswerIndex: 2, points: 1, explanation: "QuizBud is for interactive studying, not video streaming!" },
        { id: "q2", type: "true_false", question: "You can import quizzes generated by ChatGPT or Claude directly into QuizBud.", options: ["True", "False"], correctAnswerIndex: 0, points: 1, explanation: "Absolutely! Just use the AI Prompt Guide to get the correct JSON format." },
        { id: "q3", type: "identification", question: "What is the official name of this app?", correctAnswer: "QuizBud", points: 2, explanation: "You are using QuizBud!" },
        { id: "q4", type: "enumeration", question: "Name 3 default icons you can use for your collections.", exactOrder: false, correctAnswers: ["folder", "book", "rocket"], points: 3, explanation: "There are many icons like globe, map, beaker, and art too!" },
        { id: "q5", type: "rearrange", question: "Arrange these steps to create an AI quiz.", correctOrder: ["Tap 'Create New Quiz'", "Tap 'Auto-Generate with AI'", "Enter your topic", "Tap 'Generate Quiz'"], points: 4, explanation: "It's that easy to let AI do the heavy lifting for you." }
      ]
    };

    const q2 = {
      id: q2Id,
      title: "Science: The Cosmos",
      subject: "Astronomy",
      description: "Test your knowledge of the universe with Enumeration and Rearrange modes.",
      timerMinutes: 5,
      questions: [
        { id: "s1", type: "enumeration", question: "List the 4 terrestrial planets in our solar system.", exactOrder: false, correctAnswers: ["Mercury", "Venus", "Earth", "Mars"], points: 4, explanation: "These planets have solid, rocky surfaces." },
        { id: "s2", type: "rearrange", question: "Order these celestial bodies from smallest to largest.", correctOrder: ["Moon", "Planet", "Star", "Galaxy", "Universe"], points: 5, explanation: "Moons orbit planets, planets orbit stars, stars group into galaxies." }
      ]
    };

    const q3 = {
      id: q3Id,
      title: "World Geography",
      subject: "Geography",
      description: "Do you know your continents and capitals?",
      timerMinutes: 5,
      questions: [
        { id: "g1", type: "multiple_choice", question: "Which is the largest ocean on Earth?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], correctAnswerIndex: 3, points: 1, explanation: "The Pacific Ocean covers more than 30% of the Earth's surface." },
        { id: "g2", type: "identification", question: "What is the capital city of Japan?", correctAnswer: "Tokyo", points: 2, explanation: "Tokyo is the bustling capital of Japan." }
      ]
    };

    const q4 = {
      id: q4Id,
      title: "Programming Logic",
      subject: "Computer Science",
      description: "Basic programming concepts.",
      timerMinutes: 5,
      questions: [
        { id: "c1", type: "true_false", question: "JavaScript is the exact same programming language as Java.", options: ["True", "False"], correctAnswerIndex: 1, points: 1, explanation: "They are completely different programming languages!" },
        { id: "c2", type: "rearrange", question: "Order the standard software development life cycle.", correctOrder: ["Planning", "Design", "Implementation", "Testing", "Deployment"], points: 5, explanation: "This is the classic Waterfall/SDLC model." }
      ]
    };

    addQuiz(q1); addQuiz(q2); addQuiz(q3); addQuiz(q4);

    useQuizStore.setState((state) => ({
      collections: [
        { id: `col1-${timeKey}`, name: "Getting Started", icon: "rocket", quizIds: [q1.id] },
        { id: `col2-${timeKey}`, name: "Science & Nature", icon: "beaker", quizIds: [q2.id] },
        { id: `col3-${timeKey}`, name: "World Geography", icon: "globe", quizIds: [q3.id] },
        { id: `col4-${timeKey}`, name: "Computer Science", icon: "briefcase", quizIds: [q4.id] },
        ...state.collections
      ]
    }));

    triggerHaptic(hapticsEnabled, 'Heavy');
    setSuccessConfig({ visible: true, title: "Starter Pack Loaded", message: "4 sample quizzes and custom collections have been added to your library!" });
  };

  const handleSaveFolder = () => {
    if (!folderNameInput.trim()) return;
    if (selectedFolder) editCollection(selectedFolder.id, folderNameInput.trim());
    else createCollection(folderNameInput.trim());
    setIsFolderModalVisible(false);
    setFolderNameInput("");
    setSelectedFolder(null);
    triggerHaptic(hapticsEnabled, "Light");
  };

  const handleLongPressFolder = (folder) => {
    triggerHaptic(hapticsEnabled, "Medium");
    setSelectedFolder(folder);
    setIsFolderActionModalVisible(true);
  };

  const handleDeleteFolder = () => {
    if (selectedFolder) {
      deleteCollection(selectedFolder.id);
      setIsFolderActionModalVisible(false);
      setSelectedFolder(null);
      triggerHaptic(hapticsEnabled, "Heavy");
    }
  };

  const openFolderEditor = () => {
    setIsFolderActionModalVisible(false);
    setFolderNameInput(selectedFolder.name);
    setTimeout(() => setIsFolderModalVisible(true), 300);
  };

  const openIconPicker = () => {
    setIsFolderActionModalVisible(false);
    setTimeout(() => setIsIconPickerVisible(true), 300);
  };

  const handleIconSelect = (iconName) => {
    if (selectedFolder) {
      updateCollectionIcon(selectedFolder.id, iconName);
      triggerHaptic(hapticsEnabled, "Medium");
    }
    setIsIconPickerVisible(false);
    setSelectedFolder(null);
  };

  const handlePasteImport = () => {
    try {
      if (!pastedJSON.trim()) throw new Error("Empty input");
      
      const parsedData = JSON.parse(pastedJSON);
      let quizzesToAdd = [];
      if (parsedData.type === "multi" && Array.isArray(parsedData.quizzes)) {
        quizzesToAdd = parsedData.quizzes;
      } else {
        quizzesToAdd = [parsedData.quiz || parsedData];
      }

      const newQuizIds = [];
      let totalImportedCount = 0;

      quizzesToAdd.forEach((q) => {
        if (q && q.title && q.questions) {
          const finalQuiz = {
            ...q,
            id: `imported-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
          };
          addQuiz(finalQuiz);
          newQuizIds.push(finalQuiz.id);
          totalImportedCount++;
        }
      });

      if (parsedData.collectionName && newQuizIds.length > 0) {
        let targetFolder = useQuizStore
          .getState()
          .collections.find((c) => c.name.toLowerCase() === parsedData.collectionName.toLowerCase());
        
        if (targetFolder) {
          addQuizzesToCollection(targetFolder.id, newQuizIds);
        } else {
          const newFolderId = `col-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          useQuizStore.setState((state) => ({
            collections: [
              ...state.collections,
              { id: newFolderId, name: parsedData.collectionName, quizIds: newQuizIds },
            ],
          }));
        }
      }

      if (totalImportedCount > 0) {
        setSuccessConfig({
          visible: true,
          title: "Import Successful",
          message: `Imported ${totalImportedCount} quiz(zes) successfully into your library.`,
        });
        triggerHaptic(hapticsEnabled, "Heavy");
        setPastedJSON("");
        setIsPasteModalVisible(false);
      } else {
        Alert.alert("Invalid Format", "Could not find a valid QuizBud structure in the pasted text.");
      }
    } catch (error) {
      Alert.alert("Invalid JSON", "Make sure you copied the exact raw JSON format without any extra markdown text.");
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "*/*"],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        let totalImportedCount = 0;
        for (const asset of result.assets) {
          const fileContent = await FileSystem.readAsStringAsync(asset.uri);
          const parsedData = JSON.parse(fileContent);
          let quizzesToAdd = [];
          if (parsedData.type === "multi" && Array.isArray(parsedData.quizzes))
            quizzesToAdd = parsedData.quizzes;
          else quizzesToAdd = [parsedData.quiz || parsedData];

          const newQuizIds = [];
          quizzesToAdd.forEach((q) => {
            if (q && q.title && q.questions) {
              const finalQuiz = { ...q, id: `imported-${Date.now()}-${Math.floor(Math.random() * 1000000)}` };
              addQuiz(finalQuiz);
              newQuizIds.push(finalQuiz.id);
              totalImportedCount++;
            }
          });

          if (parsedData.collectionName && newQuizIds.length > 0) {
            let targetFolder = useQuizStore.getState().collections.find((c) => c.name.toLowerCase() === parsedData.collectionName.toLowerCase());
            if (targetFolder) addQuizzesToCollection(targetFolder.id, newQuizIds);
            else {
              const newFolderId = `col-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
              useQuizStore.setState((state) => ({
                collections: [...state.collections, { id: newFolderId, name: parsedData.collectionName, quizIds: newQuizIds }],
              }));
            }
          }
        }
        if (totalImportedCount > 0) {
          setSuccessConfig({ visible: true, title: "Import Successful", message: `Imported ${totalImportedCount} quiz(zes) successfully into your library.` });
          triggerHaptic(hapticsEnabled, "Heavy");
        }
      }
    } catch (error) {
      Alert.alert("Import Failed", "Could not read the selected file(s).");
    }
  };

  return (
    <View className={`flex-1 ${isDark ? "bg-[#0f172a]" : "bg-[#f5f5fa]"}`}>
      <Image source={require('../../assets/gradient.png')} blurRadius={90} className={`absolute z-0 top-[-10%] left-0 h-[500px] w-[500px] ${isDark ? "opacity-30" : "opacity-40"}`} style={{ height: 500, width: 500, tintColor: isDark ? "#4f46e5" : "#818cf8" }} />
      <Image source={require('../../assets/purple-gradient.png')} blurRadius={90} className={`absolute z-0 top-[-35%] left-[-50%] h-[500px] w-[500px] ${isDark ? "opacity-30" : "opacity-60"}`} style={{ height: 500, width: 500, tintColor: isDark ? "#4f46e5" : "#818cf8" }} />

      <View className="flex-1 bg-transparent" style={{ paddingTop: insets.top }}>
        <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          
          <View className="flex-row justify-between items-center mb-6">
            <View className="flex-row items-center">
              <AcademicCapIcon color={isDark ? "#a5b4fc" : "#312e81"} size={30} />
              <Text className={`text-2xl font-black ml-2 tracking-tight ${isDark ? "text-white" : "text-indigo-900"}`}>QuizBud</Text>
            </View>
            <TouchableOpacity className={`p-2 rounded-full ${isDark ? "bg-indigo-900/50" : "bg-[#e6e6ff]"}`} onPress={() => navigation.navigate("AIAssistant")}>
              <SparklesIcon color={isDark ? "#818cf8" : "#4f46e5"} size={22} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handlePlayDailyChallenge} disabled={isGeneratingDaily} className="rounded-[32px] overflow-hidden mb-8 shadow-lg shadow-indigo-300">
            <LinearGradient colors={isDark ? ["#312e81", "#1e1b4b"] : ["#4f46e5", "#3730a3"]} className="p-6 relative">
              <View className="absolute top-4 right-4 bg-white/20 p-2 rounded-full"><FireIcon color="#fbbf24" size={24} /></View>
              <Text className="text-indigo-200 font-bold text-[10px] tracking-widest uppercase mb-1">AI Powered Trivia</Text>
              <Text className="text-white text-2xl font-black mb-2 w-3/4">Today's Challenge</Text>
              <Text className="text-indigo-100 text-sm mb-4">10 fresh questions generated for you today. Ready to win?</Text>
              <View className="bg-white py-3 rounded-full items-center flex-row justify-center">
                {isGeneratingDaily ? <ActivityIndicator color="#4f46e5" size="small" /> : <><SparklesIcon color="#4f46e5" size={18} /><Text className="text-indigo-700 font-bold ml-2">Start Daily Quiz</Text></>}
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            
            <Text className={`text-3xl font-extrabold mb-2 leading-tight ${isDark ? "text-white" : "text-gray-900"}`}>Manage Your{"\n"}Quizzes</Text>
            <Text className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Organize, refine, and track insights for your personalized study collection.</Text>

            {quizzes.length === 0 && (
              <View className={`rounded-[32px] p-6 mb-8 border-2 border-dashed ${isDark ? 'bg-indigo-900/20 border-indigo-700' : 'bg-indigo-50 border-indigo-200'}`}>
                <View className="flex-row items-center mb-3">
                  <View className={`p-2 rounded-full mr-3 ${isDark ? 'bg-indigo-900/50' : 'bg-indigo-200'}`}>
                    <SparklesIcon color={isDark ? "#a5b4fc" : "#4f46e5"} size={20} />
                  </View>
                  <Text className={`text-xl font-extrabold flex-1 ${isDark ? 'text-white' : 'text-indigo-900'}`}>Empty Library?</Text>
                </View>
                <Text className={`mb-6 leading-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Load our Sample Starter Pack to instantly see how folders work and test out all 5 interactive quiz modes!
                </Text>
                <TouchableOpacity
                  onPress={loadSampleStarterPack}
                  className="bg-indigo-600 py-3.5 rounded-full shadow-md items-center flex-row justify-center"
                >
                  <DocumentArrowUpIcon color="white" size={18} />
                  <Text className="text-white font-bold text-base ml-2">Load Sample Quizzes</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity className="bg-indigo-600 rounded-full py-4 flex-row justify-center items-center mb-8 shadow-md shadow-indigo-200" onPress={() => { triggerHaptic(true, "Heavy"); navigation.navigate("CreateQuiz"); }}>
              <PlusCircleIcon color="white" size={24} />
              <Text className="text-white font-bold ml-2 text-base">Create New Quiz</Text>
            </TouchableOpacity>

            <View className="flex-row justify-between items-center mb-4 mt-2">
              <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-800"}`}>Recent Activity</Text>
              <TouchableOpacity onPress={() => { triggerHaptic(hapticsEnabled); navigation.navigate("RecentActivityScreen"); }}>
                <Text className={`font-bold text-sm ${isDark ? "text-indigo-400" : "text-indigo-600"}`}>View All</Text>
              </TouchableOpacity>
            </View>

            {recentHistory.length === 0 ? (
              <View className={`rounded-[24px] p-6 mb-6 border items-center shadow-sm ${isDark ? "bg-gray-800 border-gray-700 shadow-none" : "bg-white border-slate-200 shadow-slate-200/50"}`}>
                <Text className={`font-medium text-center leading-5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>No quizzes taken yet.</Text>
              </View>
            ) : (
              recentHistory.map((historyItem, index) => {
                const percentage = Math.round((historyItem.score / historyItem.totalPoints) * 100);
                let ringColorClass = "border-red-600"; let textColClass = "text-red-600";
                if (percentage >= 75) { ringColorClass = "border-indigo-600"; textColClass = "text-indigo-700"; } 
                else if (percentage >= 50) { ringColorClass = "border-amber-500"; textColClass = "text-amber-600"; }
                const fallbackQuizItem = quizzes.find((item) => (item.quiz || item).title === historyItem.quizTitle);
                const retakeQuizData = historyItem.originalQuiz || (fallbackQuizItem ? fallbackQuizItem.quiz || fallbackQuizItem : null);
                const displayDate = formatHistoryDate(historyItem.date);

                return (
                  <View key={historyItem.id || index} className={`rounded-[24px] p-5 mb-4 border shadow-xl ${isDark ? "bg-gray-800 border-gray-700 shadow-none" : "bg-white border-slate-100 shadow-slate-300/70"}`}>
                    <View className="flex-row justify-between items-center">
                      <View className="flex-1 pr-4">
                        <Text className={`text-[15px] font-bold mb-1 leading-tight ${isDark ? "text-white" : "text-gray-900"}`} numberOfLines={1}>{historyItem.quizTitle}</Text>
                        <Text className={`text-xs font-semibold ${isDark ? "text-gray-400" : "text-gray-500"}`}>{displayDate} • {historyItem.score}/{historyItem.totalPoints} Points Earned</Text>
                      </View>
                      <Animated.View style={{ transform: [{ scale: popAnim }] }} className={`w-[52px] h-[52px] rounded-full border-[3.5px] items-center justify-center ${isDark && ringColorClass.includes("indigo") ? "border-indigo-400" : ringColorClass}`}>
                        <Text className={`text-sm font-black ${isDark && textColClass.includes("indigo") ? "text-indigo-300" : textColClass}`}>{percentage}%</Text>
                      </Animated.View>
                    </View>
                    <TouchableOpacity className={`mt-4 py-3.5 rounded-xl flex-row justify-center items-center ${isDark ? "bg-indigo-900/40" : "bg-[#edecff]"}`} onPress={() => navigation.navigate("Results", { score: historyItem.score, totalPoints: historyItem.totalPoints, history: historyItem.history, quizTitle: historyItem.quizTitle, quiz: retakeQuizData })}>
                      <Text className={`font-bold text-sm ${isDark ? "text-indigo-300" : "text-indigo-600"}`}>Review</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}

            <View className="flex-row justify-between items-center mb-4 mt-6">
              <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Your Collections</Text>
              <View className="flex-row items-center">
                {collections.length > 4 && (
                  <TouchableOpacity onPress={() => navigation.navigate("AllCollectionsScreen")}>
                    <Text className={`font-bold mr-4 ${isDark ? "text-indigo-400" : "text-indigo-600"}`}>View All</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity className={`p-2 rounded-full mr-2 shadow-sm ${isDark ? "bg-indigo-900/50" : "bg-[#e6e6ff] shadow-indigo-200"}`} onPress={() => { triggerHaptic(hapticsEnabled, "Light"); setIsGridView(!isGridView); }}>
                  {isGridView ? <ListBulletIcon color={isDark ? "#a5b4fc" : "#4f46e5"} size={20} /> : <Squares2X2Icon color={isDark ? "#a5b4fc" : "#4f46e5"} size={20} />}
                </TouchableOpacity>
                <TouchableOpacity className={`p-2 rounded-full shadow-sm ${isDark ? "bg-indigo-900/50" : "bg-[#e6e6ff] shadow-indigo-200"}`} onPress={() => { setSelectedFolder(null); setFolderNameInput(""); setIsFolderModalVisible(true); }}>
                  <FolderPlusIcon color={isDark ? "#a5b4fc" : "#4f46e5"} size={20} />
                </TouchableOpacity>
              </View>
            </View>

            <View className={isGridView ? "flex-row flex-wrap justify-between" : "flex-col"}>
              <TouchableOpacity className={isGridView ? `w-[48%] aspect-square p-5 rounded-3xl mb-4 shadow-lg justify-between ${isDark ? "bg-indigo-600 shadow-none border border-indigo-500" : "bg-[#8b5cf6] shadow-indigo-200"}` : `flex-row items-center p-4 rounded-3xl mb-3 shadow-md ${isDark ? "bg-indigo-600 shadow-none border border-indigo-500" : "bg-[#8b5cf6] shadow-indigo-200"}`} onPress={() => navigation.navigate("CollectionScreen", { id: "all", name: "All Quizzes" })}>
                <View className={`bg-white/20 rounded-2xl ${isGridView ? "self-start p-2.5" : "p-3 mr-4"}`}>
                  <DocumentTextIcon color="#ffffff" size={isGridView ? 26 : 24} />
                </View>
                <View className={isGridView ? "" : "flex-1"}>
                  <Text className={`font-bold text-white ${isGridView ? "text-base mb-1" : "text-base"}`}>All Quizzes</Text>
                  <Text className={`font-medium text-indigo-100 ${isGridView ? "text-[11px]" : "text-[10px] mt-1"}`}>{quizzes.length} Quizzes</Text>
                </View>
              </TouchableOpacity>

              {[...collections].reverse().slice(0, isGridView ? 3 : 4).map((folder, index) => {
                const FolderDisplayIcon = folder.icon && ICON_MAP[folder.icon] ? ICON_MAP[folder.icon] : FolderIcon;
                const colorStyles = [
                  { bg: "bg-green-50", icon: "#16a34a", darkBg: "bg-green-900/30", darkIcon: "#4ade80" },
                  { bg: "bg-amber-50", icon: "#d97706", darkBg: "bg-amber-900/30", darkIcon: "#fbbf24" },
                  { bg: "bg-blue-50", icon: "#2563eb", darkBg: "bg-blue-900/30", darkIcon: "#60a5fa" },
                  { bg: "bg-rose-50", icon: "#e11d48", darkBg: "bg-rose-900/30", darkIcon: "#fb7185" },
                ];
                const style = colorStyles[index % colorStyles.length];

                return (
                  <TouchableOpacity key={folder.id} className={isGridView ? `w-[48%] aspect-square p-5 rounded-3xl mb-4 border shadow-sm justify-between ${isDark ? "bg-gray-800 border-gray-700 shadow-none" : "bg-white border-slate-100 shadow-slate-200/50"}` : `flex-row items-center p-4 border rounded-3xl  mb-3 shadow-sm ${isDark ? "bg-gray-800 border-gray-700 shadow-none" : "bg-white border-slate-200 shadow-slate-200/50"}`} onPress={() => navigation.navigate("CollectionScreen", { id: folder.id, name: folder.name })} onLongPress={() => handleLongPressFolder(folder)} delayLongPress={400}>
                    <View className={`rounded-2xl ${isGridView ? "self-start p-2.5" : "p-3 mr-4"} ${isDark ? style.darkBg : style.bg}`}>
                      <FolderDisplayIcon color={isDark ? style.darkIcon : style.icon} size={24} />
                    </View>
                    <View className={isGridView ? "" : "flex-1"}>
                      <Text className={`font-bold ${isDark ? "text-white" : "text-gray-900"} ${isGridView ? "text-base mb-1" : "text-base"}`} numberOfLines={1}>{folder.name}</Text>
                      <Text className={`font-medium ${isDark ? "text-gray-400" : "text-gray-500"} ${isGridView ? "text-[11px]" : "text-[10px] mt-1"}`}>{folder.quizIds?.length || 0} Quizzes</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className={`border-2 border-dashed rounded-[40px] p-6 pb-8 items-center mt-6 mb-10 relative ${isDark ? "bg-indigo-900/10 border-indigo-800" : "bg-[#f4f2ff] border-indigo-200"}`}>
              <TouchableOpacity className={`absolute top-4 right-4 p-2 rounded-full ${isDark ? 'bg-gray-800' : 'bg-white shadow-sm'}`} onPress={() => navigation.navigate("AIPromptGuideScreen")}>
                 <QuestionMarkCircleIcon color={isDark ? "#818cf8" : "#4f46e5"} size={22} />
              </TouchableOpacity>
              <View className="bg-indigo-600 p-3 rounded-xl mb-4 mt-2"><DocumentArrowUpIcon color="white" size={28} /></View>
              <Text className={`text-xl font-extrabold mb-2 text-center ${isDark ? "text-white" : "text-gray-900"}`}>Import Local Quiz</Text>
              <Text className={`text-sm mb-6 text-center leading-5 px-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Upload an existing quiz file (.qb or JSON) or paste code directly.</Text>
              <View className="flex-row space-x-3 w-full px-2">
                <TouchableOpacity className={`flex-1 rounded-full py-4 flex-row items-center justify-center shadow-sm border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-indigo-100 shadow-indigo-100"}`} onPress={handleImport}>
                  <DocumentTextIcon color={isDark ? "#a5b4fc" : "#1e3a8a"} size={18} />
                  <Text className={`font-bold text-sm ml-2 ${isDark ? "text-indigo-200" : "text-blue-900"}`}>File</Text>
                </TouchableOpacity>
                <TouchableOpacity className={`flex-1 rounded-full py-4 flex-row items-center justify-center shadow-sm border ${isDark ? "bg-indigo-600 border-indigo-500" : "bg-indigo-600 border-indigo-500 shadow-indigo-200"}`} onPress={() => setIsPasteModalVisible(true)}>
                  <ClipboardDocumentListIcon color="white" size={18} />
                  <Text className="font-bold text-sm ml-2 text-white">Paste</Text>
                </TouchableOpacity>
              </View>
            </View>

          </Animated.View>
          <View className="h-10" />
        </ScrollView>
      </View>

      {/* 🚨 NEW: API KEY MISSING MODAL */}
      <Modal animationType="fade" transparent={true} visible={isApiKeyModalVisible} onRequestClose={() => setIsApiKeyModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" }}>
          <View className={`w-10/12 rounded-[40px] p-8 items-center shadow-2xl ${isDark ? "bg-gray-900" : "bg-white"}`}>
            
            <View className={`w-20 h-20 rounded-full items-center justify-center mb-6 ${isDark ? 'bg-amber-900/40' : 'bg-amber-100'}`}>
              <KeyIcon color={isDark ? "#fbbf24" : "#d97706"} size={40} />
            </View>
            
            <Text className={`text-2xl font-extrabold mb-3 text-center ${isDark ? "text-white" : "text-gray-900"}`}>API Key Required</Text>
            
            <Text className={`text-base text-center mb-8 px-2 leading-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              To generate AI quizzes and play the Daily Challenge, you need to add your free Gemini API key in the app settings.
            </Text>
            
            <View className="w-full space-y-3">
              <TouchableOpacity 
                className="bg-indigo-600 w-full py-4 rounded-full shadow-md" 
                onPress={() => {
                  setIsApiKeyModalVisible(false);
                  navigation.navigate("Settings"); // Adjust this route name if your settings screen is named differently!
                }}
              >
                <Text className="text-white text-center font-bold text-lg">Go to Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                className="w-full py-4 rounded-full" 
                onPress={() => setIsApiKeyModalVisible(false)}
              >
                <Text className={`text-center font-bold text-base ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Maybe Later</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* PASTE MODAL */}
      <Modal animationType="slide" transparent={true} visible={isPasteModalVisible} onRequestClose={() => setIsPasteModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
          <View className={`rounded-t-[32px] p-6 pt-8 pb-10 shadow-2xl h-[80%] ${isDark ? "bg-gray-900" : "bg-white"}`}>
            <View className="flex-row justify-between items-center mb-6">
              <Text className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>Paste Quiz JSON</Text>
              <TouchableOpacity onPress={() => { setIsPasteModalVisible(false); setPastedJSON(""); }}>
                 <XMarkIcon color={isDark ? "#9ca3af" : "#4b5563"} size={24} />
              </TouchableOpacity>
            </View>
            <TextInput value={pastedJSON} onChangeText={setPastedJSON} multiline placeholder='Paste your raw JSON code here...' placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"} textAlignVertical="top" className={`flex-1 p-4 rounded-2xl border mb-6 font-mono text-sm leading-5 ${isDark ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-700"}`} />
            <TouchableOpacity className="bg-indigo-600 py-4 rounded-full shadow-sm items-center" onPress={handlePasteImport}>
              <Text className="text-white font-bold text-lg">Import Quiz</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* FOLDER MODAL */}
      <Modal animationType="fade" transparent={true} visible={isFolderModalVisible} onRequestClose={() => setIsFolderModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" }}>
          <View className={`w-10/12 rounded-[32px] p-6 shadow-2xl ${isDark ? "bg-gray-900" : "bg-white"}`}>
            <Text className={`text-xl font-extrabold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>{selectedFolder ? "Rename Folder" : "New Folder"}</Text>
            <TextInput value={folderNameInput} onChangeText={setFolderNameInput} placeholder="e.g., Biology Finals" placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"} autoFocus className={`p-4 rounded-2xl border mb-6 font-bold text-base ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`} />
            <View className="flex-row justify-end items-center">
              <TouchableOpacity className="px-5 py-3 rounded-full mr-2" onPress={() => setIsFolderModalVisible(false)}><Text className={`font-bold ${isDark ? "text-gray-400" : "text-gray-500"}`}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity className="bg-indigo-600 px-6 py-3 rounded-full shadow-sm" onPress={handleSaveFolder}><Text className="text-white font-bold">Save</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={isFolderActionModalVisible} onRequestClose={() => setIsFolderActionModalVisible(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" }} activeOpacity={1} onPressOut={() => setIsFolderActionModalVisible(false)}>
          <TouchableWithoutFeedback>
            <View className={`w-10/12 rounded-3xl p-5 shadow-2xl ${isDark ? "bg-gray-900" : "bg-white"}`}>
              <TouchableOpacity className={`p-2 rounded-full self-end mb-1 ${isDark ? "bg-gray-800" : "bg-gray-100"}`} onPress={() => setIsFolderActionModalVisible(false)}><XMarkIcon color={isDark ? "#9ca3af" : "#4b5563"} size={18} /></TouchableOpacity>
              <View className="flex-row items-center mb-1"><View className="w-2 h-2 rounded-full bg-indigo-500 mr-2" /><Text className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Folder Actions</Text></View>
              <Text className={`text-xl font-extrabold mb-6 leading-tight ${isDark ? "text-indigo-300" : "text-blue-900"}`}>{selectedFolder?.name}</Text>
              <TouchableOpacity className={`flex-row items-center p-3 rounded-2xl mb-3 ${isDark ? "bg-gray-800" : "bg-gray-100"}`} onPress={openFolderEditor}><View className={`p-3 rounded-xl mr-3 ${isDark ? "bg-indigo-900" : "bg-indigo-200"}`}><PencilIcon color={isDark ? "#a5b4fc" : "#3730a3"} size={20} /></View><View><Text className={`text-base font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Rename Folder</Text></View></TouchableOpacity>
              <TouchableOpacity className={`flex-row items-center p-3 rounded-2xl mb-3 ${isDark ? "bg-gray-800" : "bg-gray-100"}`} onPress={openIconPicker}><View className={`p-3 rounded-xl mr-3 ${isDark ? "bg-yellow-900/60" : "bg-yellow-100"}`}><StarSolid color={isDark ? "#fde047" : "#ca8a04"} size={20} /></View><View><Text className={`text-base font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Change Icon</Text></View></TouchableOpacity>
              <TouchableOpacity className={`flex-row items-center p-3 rounded-2xl mb-2 ${isDark ? "bg-red-900/30" : "bg-red-50"}`} onPress={handleDeleteFolder}><View className={`p-3 rounded-xl mr-3 ${isDark ? "bg-red-900" : "bg-red-200"}`}><TrashIcon color={isDark ? "#fca5a5" : "#b91c1c"} size={20} /></View><View><Text className={`text-base font-bold ${isDark ? "text-red-400" : "text-red-700"}`}>Delete Folder</Text></View></TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={isIconPickerVisible} onRequestClose={() => setIsIconPickerVisible(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" }} activeOpacity={1} onPressOut={() => setIsIconPickerVisible(false)}>
          <TouchableWithoutFeedback>
            <View className={`w-10/12 rounded-[32px] p-6 shadow-2xl ${isDark ? "bg-gray-900" : "bg-white"}`}>
              <Text className={`text-xl font-extrabold mb-4 text-center ${isDark ? "text-white" : "text-gray-900"}`}>Choose an Icon</Text>
              <View className="flex-row flex-wrap justify-center gap-3 mt-2">
                {Object.keys(ICON_MAP).map((iconKey) => {
                  const IconComp = ICON_MAP[iconKey];
                  const isSelected = selectedFolder?.icon === iconKey || (!selectedFolder?.icon && iconKey === "folder");
                  return (
                    <TouchableOpacity key={iconKey} onPress={() => handleIconSelect(iconKey)} className={`p-4 rounded-2xl border ${isSelected ? "border-indigo-500 bg-indigo-500/20" : isDark ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"}`}>
                      <IconComp color={isSelected ? "#818cf8" : isDark ? "#9ca3af" : "#6b7280"} size={32} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Success Modal */}
      <Modal animationType="fade" transparent={true} visible={successConfig.visible} onRequestClose={() => setSuccessConfig({ ...successConfig, visible: false })}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" }}>
          <View className={`w-10/12 rounded-[40px] p-8 items-center shadow-2xl ${isDark ? "bg-gray-900" : "bg-white"}`}>
            <View className="bg-[#4caf50] w-20 h-20 rounded-full items-center justify-center mb-6 shadow-sm shadow-green-200"><CheckIconSolid color="white" size={40} /></View>
            <Text className={`text-2xl font-extrabold mb-3 text-center ${isDark ? "text-white" : "text-gray-900"}`}>{successConfig.title}</Text>
            <Text className={`text-base text-center mb-8 px-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{successConfig.message}</Text>
            <TouchableOpacity className="bg-indigo-600 w-full py-4 rounded-full shadow-md" onPress={() => setSuccessConfig({ ...successConfig, visible: false })}><Text className="text-white text-center font-bold text-lg">OK</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}