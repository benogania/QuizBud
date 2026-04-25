import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  ActivityIndicator, 
  Animated, 
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuizStore } from "../store/useQuizStore";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context"; 
import { generateDailyChallenge } from "../services/geminiService"; 
import { triggerHaptic } from '../utils/hapticHelper';

import {
  ClockIcon,
  DocumentArrowUpIcon,
  DocumentTextIcon,
  ShareIcon,
  BookOpenIcon,
  FolderIcon,        
  FolderPlusIcon,
  BriefcaseIcon,
  BookmarkIcon,
  GlobeAltIcon,
  MapIcon,
  BeakerIcon,
  RocketLaunchIcon,
  PaintBrushIcon
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
  PlusCircleIcon
} from "react-native-heroicons/solid";

const ICON_MAP = {
  folder: FolderIcon, book: BookOpenIcon, briefcase: BriefcaseIcon,
  bookmark: BookmarkIcon, globe: GlobeAltIcon, map: MapIcon,
  beaker: BeakerIcon, rocket: RocketLaunchIcon, art: PaintBrushIcon
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
    updateCollectionIcon, addQuizzesToCollection, hapticsEnabled
  } = useQuizStore();

  const recentHistory = quizHistory.slice(0, 3);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const popAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
    ]).start();

    setTimeout(() => {
      Animated.spring(popAnim, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();
    }, 400); 
  }, []);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [isGeneratingDaily, setIsGeneratingDaily] = useState(false);
  const [successConfig, setSuccessConfig] = useState({ visible: false, title: "", message: "" });

  const [isFolderModalVisible, setIsFolderModalVisible] = useState(false);
  const [isFolderActionModalVisible, setIsFolderActionModalVisible] = useState(false);
  const [isIconPickerVisible, setIsIconPickerVisible] = useState(false); 
  const [folderNameInput, setFolderNameInput] = useState("");
  const [selectedFolder, setSelectedFolder] = useState(null);

  const handlePlayDailyChallenge = async () => {
    const today = new Date().toDateString();
    if (dailyChallenge && lastDailyFetch === today) {
      navigation.navigate("QuizPlayer", { quiz: dailyChallenge });
      return;
    }
    setIsGeneratingDaily(true);
    try {
      const dailyQuiz = await generateDailyChallenge();
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

  const handleSaveFolder = () => {
    if (!folderNameInput.trim()) return;
    if (selectedFolder) editCollection(selectedFolder.id, folderNameInput.trim());
    else createCollection(folderNameInput.trim());
    setIsFolderModalVisible(false);
    setFolderNameInput("");
    setSelectedFolder(null);
    triggerHaptic(hapticsEnabled, 'Light');
  };

  const handleLongPressFolder = (folder) => {
    triggerHaptic(hapticsEnabled, 'Medium');
    setSelectedFolder(folder);
    setIsFolderActionModalVisible(true);
  };

  const handleDeleteFolder = () => {
    if (selectedFolder) {
      deleteCollection(selectedFolder.id);
      setIsFolderActionModalVisible(false);
      setSelectedFolder(null);
      triggerHaptic(hapticsEnabled, 'Heavy');
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
      triggerHaptic(hapticsEnabled, 'Medium');
    }
    setIsIconPickerVisible(false);
    setSelectedFolder(null);
  };

  const handleLongPress = (quizData) => { setSelectedQuiz(quizData); setIsModalVisible(true); };
  const handleEdit = () => { setIsModalVisible(false); if (selectedQuiz) navigation.navigate("EditQuiz", { quiz: selectedQuiz }); };
  const handleDelete = () => { if (selectedQuiz) { deleteQuiz(selectedQuiz.id); setIsModalVisible(false); setSelectedQuiz(null); } };

  const handleExport = async () => { 
    if (!selectedQuiz) return;
    try {
      const safeFilename = selectedQuiz.title.replace(/[^a-zA-Z0-9]/g, "_");
      const fileUri = `${FileSystem.documentDirectory}${safeFilename}.qb`;
      const exportData = { version: "1.0", type: "single", quiz: selectedQuiz };
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(exportData, null, 2));
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(fileUri, { dialogTitle: `Export ${selectedQuiz.title}` });
      else Alert.alert("Error", "Sharing is not available on this device.");
    } catch (error) {
      Alert.alert("Export Failed", "There was an error saving the file.");
    } finally {
      setIsModalVisible(false);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["application/json", "*/*"], copyToCacheDirectory: true, multiple: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        let totalImportedCount = 0;
        for (const asset of result.assets) {
          const fileContent = await FileSystem.readAsStringAsync(asset.uri);
          const parsedData = JSON.parse(fileContent);
          let quizzesToAdd = [];
          if (parsedData.type === 'multi' && Array.isArray(parsedData.quizzes)) quizzesToAdd = parsedData.quizzes;
          else quizzesToAdd = [parsedData.quiz || parsedData];

          const newQuizIds = [];
          quizzesToAdd.forEach(q => {
            if (q && q.title && q.questions) {
              const finalQuiz = { ...q, id: `imported-${Date.now()}-${Math.floor(Math.random() * 1000000)}` };
              addQuiz(finalQuiz);
              newQuizIds.push(finalQuiz.id);
              totalImportedCount++;
            }
          });

          if (parsedData.collectionName && newQuizIds.length > 0) {
            let targetFolder = useQuizStore.getState().collections.find(c => c.name.toLowerCase() === parsedData.collectionName.toLowerCase());
            if (targetFolder) addQuizzesToCollection(targetFolder.id, newQuizIds);
            else {
              const newFolderId = `col-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
              useQuizStore.setState((state) => ({
                collections: [...state.collections, { id: newFolderId, name: parsedData.collectionName, quizIds: newQuizIds }]
              }));
            }
          }
        }
        if (totalImportedCount > 0) {
          setSuccessConfig({ visible: true, title: "Import Successful", message: `Imported ${totalImportedCount} quiz(zes) successfully into your library.` });
          triggerHaptic(hapticsEnabled, 'Heavy');
        } else {
          Alert.alert("Import Error", "Could not find any valid quizzes in the selected file(s).");
        }
      }
    } catch (error) {
      Alert.alert("Import Failed", "Could not read the selected file(s). Ensure they are valid .qb or JSON files.");
    }
  };

  return (
    <View className="flex-1">
      {/* UPGRADED: Deeper blue gradient ending for ~20% visibility in Light Mode */}
      <LinearGradient 
        colors={isDark ? ["#0f172a", "#09090b"] : ["#ffffff", "#dbeafe"]} 
        className="absolute inset-0" 
      />

      <View className="flex-1" style={{ paddingTop: insets.top }}>
        <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          
          <View className="flex-row justify-between items-center mb-6">
            <View className="flex-row items-center">
              <AcademicCapIcon color={isDark ? "#a5b4fc" : "#312e81"} size={30} />
              <Text className={`text-2xl font-black ml-2 tracking-tight ${isDark ? "text-white" : "text-indigo-900"}`}>QuizBud</Text>
            </View>
            <TouchableOpacity className={`p-2 rounded-full ${isDark ? "bg-indigo-900/50" : "bg-indigo-100"}`} onPress={() => navigation.navigate("AIAssistant")}>
              <SparklesIcon color={isDark ? "#818cf8" : "#4f46e5"} size={22} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handlePlayDailyChallenge} disabled={isGeneratingDaily} className="rounded-[32px] overflow-hidden mb-8 shadow-lg shadow-indigo-300">
            <LinearGradient colors={isDark ? ['#312e81', '#1e1b4b'] : ['#4f46e5', '#3730a3']} className="p-6 relative">
              <View className="absolute top-4 right-4 bg-white/20 p-2 rounded-full"><FireIcon color="#fbbf24" size={24} /></View>
              <Text className="text-indigo-200 font-bold text-[10px] tracking-widest uppercase mb-1">AI Powered Trivia</Text>
              <Text className="text-white text-2xl font-black mb-2 w-3/4">Today's Challenge</Text>
              <Text className="text-indigo-100 text-sm mb-4">5 fresh questions generated for you today. Ready to win?</Text>
              <View className="bg-white py-3 rounded-full items-center flex-row justify-center">
                {isGeneratingDaily ? <ActivityIndicator color="#4f46e5" size="small" /> : <><SparklesIcon color="#4f46e5" size={18} /><Text className="text-indigo-700 font-bold ml-2">Start Daily Quiz</Text></>}
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            
            <Text className={`text-3xl font-extrabold mb-2 leading-tight ${isDark ? "text-white" : "text-gray-900"}`}>Manage Your{"\n"}Quizzes</Text>
            <Text className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Organize, refine, and track insights for your personalized study collection.</Text>

            <TouchableOpacity className="bg-indigo-600 rounded-full py-4 flex-row justify-center items-center mb-8 shadow-md shadow-indigo-200" onPress={() => { triggerHaptic(true, 'Heavy'); navigation.navigate("CreateQuiz"); }}>
              <PlusCircleIcon color="white" size={24} />
              <Text className="text-white font-bold ml-2 text-base">Create New Quiz</Text>
            </TouchableOpacity>

            <View className="flex-row items-center mb-4 mt-2">
              <ClockIcon color="#4f46e5" size={20} />
              <Text className={`text-lg font-bold ml-2 ${isDark ? "text-white" : "text-gray-900"}`}>Recent Activity</Text>
            </View>

            {/* UPGRADED: Enhanced shadows (shadow-xl shadow-slate-300/70) for Recent Activity */}
            {recentHistory.length === 0 ? (
              <View className={`rounded-[24px] p-6 mb-6 border items-center shadow-xl ${isDark ? "bg-gray-800 border-gray-700 shadow-none" : "bg-white border-slate-100 shadow-slate-300/70"}`}>
                <Text className={`font-medium text-center leading-5 ${isDark ? "text-gray-400" : "text-gray-400"}`}>No quizzes taken yet.{"\n"}Play one to see your history!</Text>
              </View>
            ) : (
              recentHistory.map((historyItem, index) => {
                const percentage = Math.round((historyItem.score / historyItem.totalPoints) * 100);
                let grade = "F", badgeBg = "bg-red-400", textCol = "text-red-900";
                if (percentage >= 90) { grade = "A"; badgeBg = "bg-green-400"; textCol = "text-green-900"; } 
                else if (percentage >= 75) { grade = "B"; badgeBg = "bg-blue-400"; textCol = "text-blue-900"; } 
                else if (percentage >= 50) { grade = "C"; badgeBg = "bg-yellow-400"; textCol = "text-yellow-900"; }

                const fallbackQuizItem = quizzes.find(item => (item.quiz || item).title === historyItem.quizTitle);
                const retakeQuizData = historyItem.originalQuiz || (fallbackQuizItem ? fallbackQuizItem.quiz || fallbackQuizItem : null);

                return (
                  <View key={historyItem.id || index} className={`rounded-[28px] p-6 mb-4 relative overflow-hidden border shadow-xl ${isDark ? "bg-gray-800 border-gray-700 shadow-none" : "bg-white border-slate-100 shadow-slate-300/70"}`}>
                    <Animated.View style={{ transform: [{ scale: popAnim }] }} className={`absolute -top-4 -right-4 w-20 h-20 rounded-full items-center justify-center pt-3 pr-3 ${badgeBg}`}>
                      <Text className={`text-sm font-black ${textCol}`}>{percentage}%</Text>
                    </Animated.View>
                    <Text className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">Grade: <Text className={textCol}>{grade}</Text></Text>
                    <Text className={`text-xl font-extrabold mb-1 w-3/4 leading-tight ${isDark ? "text-white" : "text-gray-900"}`} numberOfLines={1}>{historyItem.quizTitle}</Text>
                    <Text className={`text-xs font-medium mb-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{historyItem.score} / {historyItem.totalPoints} Points Earned</Text>
                    <View className="flex-row justify-between items-center mt-2">
                      <Text className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{new Date(historyItem.date).toLocaleDateString()}</Text>
                      <TouchableOpacity className={`border px-4 py-2 rounded-full ${isDark ? "bg-indigo-900 border-indigo-700" : "bg-indigo-50 border-indigo-100"}`} onPress={() => navigation.navigate("Results", { score: historyItem.score, totalPoints: historyItem.totalPoints, history: historyItem.history, quizTitle: historyItem.quizTitle, quiz: retakeQuizData })}>
                        <Text className={`font-bold text-xs ${isDark ? "text-indigo-200" : "text-indigo-900"}`}>Review Answers {">"}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}

            <View className="flex-row justify-between items-center mb-4 mt-6">
              <Text className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Your Collections</Text>
              
              <View className="flex-row items-center">
                {collections.length > 4 && (
                  <TouchableOpacity onPress={() => { triggerHaptic(hapticsEnabled); navigation.navigate("AllCollectionsScreen"); }}>
                    <Text className={`font-bold mr-4 ${isDark ? "text-indigo-400" : "text-indigo-600"}`}>View All</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity className={`p-2 rounded-full shadow-sm ${isDark ? "bg-indigo-900/50" : "bg-indigo-100 shadow-indigo-200"}`} onPress={() => { setSelectedFolder(null); setFolderNameInput(""); setIsFolderModalVisible(true); }}>
                  <FolderPlusIcon color={isDark ? "#a5b4fc" : "#4f46e5"} size={20} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Collections: Left Exactly As Requested (With user's original borders) */}
            <TouchableOpacity className={`flex-row items-center p-4 border rounded-3xl mb-3 shadow-sm ${isDark ? "bg-gray-800 border-slate-800 " : "bg-white border-slate-200 "}`} onPress={() => navigation.navigate("CollectionScreen", { id: 'all', name: "All Quizzes" })}>
              <View className={`p-3 rounded-2xl mr-4 ${isDark ? "bg-indigo-900" : "bg-indigo-50 "}`}><DocumentTextIcon color={isDark ? "#a5b4fc" : "#3730a3"} size={24} /></View>
              <View className="flex-1">
                <Text className={`font-bold text-base ${isDark ? "text-white" : "text-gray-900"}`}>All Quizzes</Text>
                <Text className={`text-[10px] mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{quizzes.length} Quizzes</Text>
              </View>
            </TouchableOpacity>

            {[...collections].reverse().slice(0, 4).map((folder) => {
              const FolderDisplayIcon = folder.icon && ICON_MAP[folder.icon] ? ICON_MAP[folder.icon] : FolderIcon;
              return (
                <TouchableOpacity
                  key={folder.id}
                  className={`flex-row items-center p-4 border rounded-3xl mb-3 shadow-xl ${isDark ? "bg-gray-800 border-slate-800 " : "bg-white border-slate-200"}`}
                  onPress={() => navigation.navigate("CollectionScreen", { id: folder.id, name: folder.name })}
                  onLongPress={() => handleLongPressFolder(folder)}
                  delayLongPress={400}
                >
                  <View className={`p-3 rounded-2xl mr-4 ${isDark ? "bg-indigo-900" : "bg-indigo-50"}`}>
                    <FolderDisplayIcon color={isDark ? "#a5b4fc" : "#3730a3"} size={24} />
                  </View>
                  <View className="flex-1">
                    <Text className={`font-bold text-base ${isDark ? "text-white" : "text-gray-900"}`}>{folder.name}</Text>
                    <Text className={`text-[10px] mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{folder.quizIds?.length || 0} Quizzes</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            <View className={`border-2 border-dashed rounded-[40px] p-8 items-center mt-6 mb-10 ${isDark ? "bg-indigo-900/10 border-indigo-800" : "bg-indigo-50/50 border-indigo-200"}`}>
              <View className="bg-indigo-600 p-3 rounded-xl mb-4"><DocumentArrowUpIcon color="white" size={28} /></View>
              <Text className={`text-xl font-extrabold mb-2 text-center ${isDark ? "text-white" : "text-gray-900"}`}>Import Local Quiz</Text>
              <Text className={`text-sm mb-8 text-center leading-5 px-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}>Upload your existing quiz files in{"\n"}JSON or .qb format.</Text>
              <TouchableOpacity className={`rounded-full py-4 px-10 flex-row items-center justify-center w-full shadow-sm border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-indigo-100 shadow-indigo-100"}`} onPress={handleImport}>
                <DocumentTextIcon color={isDark ? "#a5b4fc" : "#1e3a8a"} size={20} />
                <Text className={`font-bold text-base ml-3 ${isDark ? "text-indigo-200" : "text-blue-900"}`}>Import File</Text>
              </TouchableOpacity>
            </View>

          </Animated.View>

          <View className="h-10" />
        </ScrollView>
      </View>

      {/* --- MODALS --- */}
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
              <TouchableOpacity className={`p-2 rounded-full self-end mb-1 ${isDark ? "bg-gray-800" : "bg-gray-100"}`} onPress={() => setIsFolderActionModalVisible(false)}>
                <XMarkIcon color={isDark ? "#9ca3af" : "#4b5563"} size={18} />
              </TouchableOpacity>
              <View className="flex-row items-center mb-1"><View className="w-2 h-2 rounded-full bg-indigo-500 mr-2" /><Text className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Folder Actions</Text></View>
              <Text className={`text-xl font-extrabold mb-6 leading-tight ${isDark ? "text-indigo-300" : "text-blue-900"}`}>{selectedFolder?.name}</Text>
              
              <TouchableOpacity className={`flex-row items-center p-3 rounded-2xl mb-3 ${isDark ? "bg-gray-800" : "bg-gray-100"}`} onPress={openFolderEditor}>
                <View className={`p-3 rounded-xl mr-3 ${isDark ? "bg-indigo-900" : "bg-indigo-200"}`}><PencilIcon color={isDark ? "#a5b4fc" : "#3730a3"} size={20} /></View>
                <View><Text className={`text-base font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Rename Folder</Text></View>
              </TouchableOpacity>

              <TouchableOpacity className={`flex-row items-center p-3 rounded-2xl mb-3 ${isDark ? "bg-gray-800" : "bg-gray-100"}`} onPress={openIconPicker}>
                <View className={`p-3 rounded-xl mr-3 ${isDark ? "bg-yellow-900/60" : "bg-yellow-100"}`}><StarSolid color={isDark ? "#fde047" : "#ca8a04"} size={20} /></View>
                <View><Text className={`text-base font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Change Icon</Text></View>
              </TouchableOpacity>

              <TouchableOpacity className={`flex-row items-center p-3 rounded-2xl mb-2 ${isDark ? "bg-red-900/30" : "bg-red-50"}`} onPress={handleDeleteFolder}>
                <View className={`p-3 rounded-xl mr-3 ${isDark ? "bg-red-900" : "bg-red-200"}`}><TrashIcon color={isDark ? "#fca5a5" : "#b91c1c"} size={20} /></View>
                <View><Text className={`text-base font-bold ${isDark ? "text-red-400" : "text-red-700"}`}>Delete Folder</Text></View>
              </TouchableOpacity>
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
                {Object.keys(ICON_MAP).map(iconKey => {
                  const IconComp = ICON_MAP[iconKey];
                  const isSelected = selectedFolder?.icon === iconKey || (!selectedFolder?.icon && iconKey === 'folder');
                  return (
                    <TouchableOpacity key={iconKey} onPress={() => handleIconSelect(iconKey)} className={`p-4 rounded-2xl border ${isSelected ? 'border-indigo-500 bg-indigo-500/20' : (isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50')}`}>
                      <IconComp color={isSelected ? "#818cf8" : (isDark ? "#9ca3af" : "#6b7280")} size={32} />
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

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