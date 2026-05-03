import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Modal, 
  TouchableWithoutFeedback, 
  TextInput,
  Animated,
  Dimensions
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuizStore } from '../store/useQuizStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from "expo-linear-gradient";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { triggerHaptic } from '../utils/hapticHelper';

import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';

// Import the separated modal component
import FolderSelectorModal from '../components/FolderSelectorModal'; 

// Icons
import { 
  ChevronLeftIcon, 
  DocumentTextIcon, 
  ArrowDownTrayIcon, 
  XMarkIcon as XMarkOutline,
  DocumentDuplicateIcon,
  FolderOpenIcon,
  ShareIcon,
  CheckCircleIcon as CheckCircleOutline,
  PencilIcon
} from 'react-native-heroicons/outline';
import { 
  CheckCircleIcon as CheckCircleSolid, 
  FolderIcon,
  TrashIcon,
  CheckIcon as CheckIconSolid,
  PlayIcon,
  HeartIcon,
  PuzzlePieceIcon,
  RectangleStackIcon,
  ClockIcon as ClockIconSolid,
  XMarkIcon
} from 'react-native-heroicons/solid';

const { height } = Dimensions.get('window');

export default function CollectionScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const { 
    theme, 
    quizzes, 
    collections, 
    addQuiz,
    updateQuiz, 
    addQuizzesToCollection,
    removeQuizzesFromCollection,
    deleteMultipleQuizzes,
    hapticsEnabled 
  } = useQuizStore();
  
  const isDark = theme === "dark";
  
  // Safety check for params
  const { id, name } = route.params || { id: 'all', name: 'All Quizzes' };

  const swipeableRefs = useRef({});

  // Selection States
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Custom Modal States
  const [isFolderModalVisible, setIsFolderModalVisible] = useState(false);
  const [actionType, setActionType] = useState(null); 
  
  const [deleteModalConfig, setDeleteModalConfig] = useState({ visible: false, title: "", message: "", onConfirm: () => {} });
  const [successConfig, setSuccessConfig] = useState({ visible: false, title: "", message: "" });
  const [errorConfig, setErrorConfig] = useState({ visible: false, title: "", message: "" });

  // Rename States
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [quizToRename, setQuizToRename] = useState(null);
  const [renameInput, setRenameInput] = useState("");

  // Animated Game Mode States
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [quizToPlay, setQuizToPlay] = useState(null);
  
  const slideAnim = useRef(new Animated.Value(height)).current; 
  const fadeAnim = useRef(new Animated.Value(0)).current; 

  // Filter Display Quizzes
  let displayQuizzes = [];
  if (id === 'all') {
    displayQuizzes = quizzes;
  } else {
    const folder = collections.find(c => c.id === id);
    if (folder && folder.quizIds) {
      displayQuizzes = quizzes.filter(q => {
        const qId = q.quiz ? q.quiz.id : q.id;
        return folder.quizIds.includes(qId);
      });
    }
  }

  // --- SELECTION LOGIC ---
  const toggleSelection = (quizId) => {
    triggerHaptic(hapticsEnabled, 'Light');
    if (selectedIds.includes(quizId)) {
      const newSelection = selectedIds.filter(i => i !== quizId);
      setSelectedIds(newSelection);
      if (newSelection.length === 0) setIsSelectionMode(false);
    } else {
      setSelectedIds([...selectedIds, quizId]);
    }
  };

  const handleLongPress = (quizId) => {
    triggerHaptic(hapticsEnabled, 'Medium');
    setIsSelectionMode(true);
    if (!selectedIds.includes(quizId)) {
      setSelectedIds([...selectedIds, quizId]);
    }
  };

  const toggleSelectAll = () => {
    triggerHaptic(hapticsEnabled, 'Light');
    if (selectedIds.length === displayQuizzes.length) {
      setSelectedIds([]);
      setIsSelectionMode(false);
    } else {
      const allIds = displayQuizzes.map(q => q.quiz ? q.quiz.id : q.id);
      setSelectedIds(allIds);
    }
  };

  // --- ANIMATED GAME MODE HANDLERS ---
  const openModeSelector = (quizData) => {
    triggerHaptic(hapticsEnabled, 'Medium');
    swipeableRefs.current[quizData.id]?.close(); 
    setQuizToPlay(quizData);
    setIsGameModalOpen(true); 

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 65, useNativeDriver: true })
    ]).start();
  };

  const closeModeSelector = (callback) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: height, duration: 250, useNativeDriver: true })
    ]).start(() => {
      setIsGameModalOpen(false); 
      setQuizToPlay(null);
      if (typeof callback === 'function') callback();
    });
  };

  const navigateToGame = (gameRoute) => {
    triggerHaptic(hapticsEnabled, 'Heavy');
    closeModeSelector(() => {
      navigation.navigate(gameRoute, { quiz: quizToPlay });
    });
  };

  // --- LOGIC: PLAY MULTIPLE SELECTED QUIZZES ---
  const handlePlaySelected = () => {
    triggerHaptic(hapticsEnabled, 'Heavy');
    
    const selectedQuizzes = displayQuizzes
      .filter(q => selectedIds.includes(q.quiz ? q.quiz.id : q.id))
      .map(q => q.quiz || q);

    if (selectedQuizzes.length === 0) return;

    if (selectedQuizzes.length === 1) {
      setQuizToPlay(selectedQuizzes[0]);
    } else {
      let combinedQuestions = [];
      selectedQuizzes.forEach(q => {
        if (q.questions) {
          combinedQuestions = [...combinedQuestions, ...q.questions];
        }
      });

      // Fisher-Yates Shuffle
      for (let i = combinedQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [combinedQuestions[i], combinedQuestions[j]] = [combinedQuestions[j], combinedQuestions[i]];
      }

      const combinedQuiz = {
        id: `combined-${Date.now()}`,
        title: `Combined Quiz (${selectedQuizzes.length} Quizzes)`,
        subject: 'Mixed Collection',
        questions: combinedQuestions,
        timerMinutes: combinedQuestions.length * 2, 
      };

      setQuizToPlay(combinedQuiz);
    }
    
    setIsSelectionMode(false);
    setSelectedIds([]);

    setIsGameModalOpen(true);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 65, useNativeDriver: true })
    ]).start();
  };

  // --- ACTIONS ---
  const navigateToEditQuiz = (quizData) => {
    triggerHaptic(hapticsEnabled, 'Light');
    swipeableRefs.current[quizData.id]?.close(); 
    const actualQuizData = quizData.quiz || quizData;
    navigation.navigate("EditQuiz", { quiz: actualQuizData });
  };

  const handleRenameFromSelection = () => {
    const quizToRenameData = displayQuizzes.find(q => (q.quiz ? q.quiz.id : q.id) === selectedIds[0]);
    if (quizToRenameData) {
      const actualQuizData = quizToRenameData.quiz || quizToRenameData;
      setQuizToRename(actualQuizData);
      setRenameInput(actualQuizData.title);
      
      setIsSelectionMode(false);
      setSelectedIds([]);
      
      setIsRenameModalVisible(true);
      triggerHaptic(hapticsEnabled, 'Light');
    }
  };

  const executeRename = () => {
    if (!renameInput.trim() || !quizToRename) return;
    const updatedQuiz = { ...quizToRename, title: renameInput.trim() };
    updateQuiz(quizToRename.id, updatedQuiz);
    
    triggerHaptic(hapticsEnabled, 'Medium');
    setIsRenameModalVisible(false);
    setQuizToRename(null);
  };

  const handleBulkDelete = () => {
    const isGlobalDelete = id === 'all';
    setDeleteModalConfig({
      visible: true,
      title: isGlobalDelete ? "Delete Quizzes?" : "Remove Quizzes?",
      message: isGlobalDelete 
        ? `Are you sure you want to delete ${selectedIds.length > 1 ? `these ${selectedIds.length} quizzes` : 'this quiz'}? This action cannot be undone.`
        : `Are you sure you want to remove ${selectedIds.length > 1 ? `these ${selectedIds.length} quizzes` : 'this quiz'} from this folder? They will remain in "All Quizzes".`,
      onConfirm: () => {
        if (isGlobalDelete) deleteMultipleQuizzes(selectedIds);
        else removeQuizzesFromCollection(id, selectedIds);
        
        setIsSelectionMode(false);
        setSelectedIds([]);
        setDeleteModalConfig({ ...deleteModalConfig, visible: false });
        triggerHaptic(hapticsEnabled, 'Heavy');
      }
    });
  };

  const executeMoveOrCopy = (targetFolderId) => {
    if (actionType === 'copy') addQuizzesToCollection(targetFolderId, selectedIds);
    else if (actionType === 'move') {
      addQuizzesToCollection(targetFolderId, selectedIds);
      if (id !== 'all') removeQuizzesFromCollection(id, selectedIds);
    }
    setIsFolderModalVisible(false);
    setIsSelectionMode(false);
    setSelectedIds([]);
    triggerHaptic(hapticsEnabled, 'Heavy');
    setSuccessConfig({ visible: true, title: "Action Successful", message: `Quizzes successfully ${actionType === 'copy' ? 'copied' : 'moved'} to the selected folder.` });
  };

  const renderRightActions = (quizData) => {
    return (
      <View className="flex-row items-center mb-3 pl-3 pr-1">
        <TouchableOpacity 
          onPress={() => navigateToEditQuiz(quizData)}
          className="w-14 h-14 bg-indigo-500 rounded-2xl items-center justify-center shadow-sm"
        >
          <PencilIcon color="white" size={24} />
        </TouchableOpacity>
      </View>
    );
  };

  // --- SMART EXPORT ---
  const handleExport = async () => { 
    try {
      const exportQuizzes = displayQuizzes.filter(q => selectedIds.includes(q.quiz ? q.quiz.id : q.id)).map(q => q.quiz || q);
      const fileUri = `${FileSystem.documentDirectory}${name.replace(/[^a-zA-Z0-9]/g, "_")}_Export.qb`;
      
      const exportData = { 
        version: "1.2", 
        type: "multi", 
        collectionName: name === "All Quizzes" ? null : name, 
        quizzes: exportQuizzes 
      };

      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(exportData, null, 2));

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { dialogTitle: `Export ${exportQuizzes.length} Quizzes` });
      }
      setIsSelectionMode(false); setSelectedIds([]);
    } catch (error) {
      setErrorConfig({ visible: true, title: "Export Failed", message: "Error saving the file." });
    }
  };

  // --- SMART MULTI-IMPORT ---
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

          if (id !== 'all') {
            addQuizzesToCollection(id, newQuizIds);
          } else if (parsedData.collectionName && newQuizIds.length > 0) {
            let targetFolder = useQuizStore.getState().collections.find(c => c.name.toLowerCase() === parsedData.collectionName.toLowerCase());
            
            if (targetFolder) {
              addQuizzesToCollection(targetFolder.id, newQuizIds);
            } else {
              const newFolderId = `col-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
              useQuizStore.setState((state) => ({
                collections: [
                  ...state.collections,
                  { id: newFolderId, name: parsedData.collectionName, quizIds: newQuizIds }
                ]
              }));
            }
          }
        }
        
        if (totalImportedCount > 0) {
          setSuccessConfig({ visible: true, title: "Import Successful", message: `Imported and organized ${totalImportedCount} quizzes.` });
          triggerHaptic(hapticsEnabled, 'Heavy');
        } else {
          Alert.alert("Import Error", "No valid quizzes found.");
        }
      }
    } catch (error) {
      setErrorConfig({ visible: true, title: "Import Failed", message: "Invalid file format." });
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LinearGradient colors={isDark ? ["#0f172a", "#0f172a"] : ["#e0e7ff", "#f9fafb"]} className="absolute inset-0" />
      
      <View className="flex-1" style={{ paddingTop: insets.top }}>
        
        {/* HEADER */}
        <View className="flex-row items-center justify-between p-5">
          {isSelectionMode ? (
            <TouchableOpacity onPress={() => { setIsSelectionMode(false); setSelectedIds([]); }} className={`p-2 rounded-full ${isDark ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
              <XMarkOutline color={isDark ? "white" : "black"} size={24} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => navigation.goBack()} className={`p-2 rounded-full ${isDark ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
              <ChevronLeftIcon color={isDark ? "white" : "black"} size={24} />
            </TouchableOpacity>
          )}

          <Text className={`text-xl font-black flex-1 text-center px-4 ${isDark ? 'text-white' : 'text-gray-900'}`} numberOfLines={1}>
            {isSelectionMode ? `${selectedIds.length} Selected` : name}
          </Text>

          {isSelectionMode ? (
            <TouchableOpacity onPress={toggleSelectAll} className="p-2">
              <Text className="text-indigo-500 font-bold">Select All</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleImport} className={`p-2 rounded-full ${isDark ? 'bg-indigo-900/50' : 'bg-indigo-100 shadow-sm'}`}>
              <ArrowDownTrayIcon color={isDark ? "#a5b4fc" : "#4f46e5"} size={20} />
            </TouchableOpacity>
          )}
        </View>

        {/* QUIZ LIST */}
        <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 120 }}>
          {displayQuizzes.length === 0 ? (
            <Text className={`text-center mt-10 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              This folder is empty.
            </Text>
          ) : (
            displayQuizzes.map((quizItem) => {
              const quizData = quizItem.quiz || quizItem;
              const isSelected = selectedIds.includes(quizData.id);

              return (
                <Swipeable
                  key={quizData.id}
                  ref={(ref) => (swipeableRefs.current[quizData.id] = ref)}
                  enabled={!isSelectionMode} 
                  renderRightActions={() => renderRightActions(quizData)}
                  friction={2}
                >
                  <TouchableOpacity
                    className={`flex-row items-center p-4 rounded-3xl mb-3 shadow-sm border 
                      ${isSelected ? (isDark ? "bg-indigo-900/40 border-indigo-500" : "bg-indigo-50  border-indigo-500") 
                                   : (isDark ? "bg-gray-800 border-transparent" : "bg-white border-slate-200")}`}
                    onPress={() => isSelectionMode ? toggleSelection(quizData.id) : openModeSelector(quizData)}
                    onLongPress={() => handleLongPress(quizData.id)}
                    delayLongPress={300}
                  >
                    {isSelectionMode && (
                      <View className="mr-3">
                        {isSelected ? (
                          <CheckCircleSolid color="#4f46e5" size={26} />
                        ) : (
                          <CheckCircleOutline color={isDark ? "#4b5563" : "#d1d5db"} size={26} />
                        )}
                      </View>
                    )}

                    <View className={`p-3 rounded-2xl mr-4 ${isDark ? "bg-indigo-900/50" : "bg-indigo-50"}`}>
                      <DocumentTextIcon color={isDark ? "#a5b4fc" : "#4f46e5"} size={24} />
                    </View>
                    <View className="flex-1">
                      <Text className={`font-bold text-base ${isDark ? "text-white" : "text-gray-900"}`}>{quizData.title}</Text>
                      <Text className={`text-[10px] mt-1 flex-row ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        {quizData.questions?.length || 0} Questions • <Text className="italic">Swipe left to edit</Text>
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Swipeable>
              )
            })
          )}
        </ScrollView>

        {/* FLOATING ACTION BAR FOR MULTI-SELECTION */}
        {isSelectionMode && selectedIds.length > 0 && (
          <View className="absolute bottom-8 left-2 right-2 bg-indigo-900 rounded-full flex-row justify-evenly items-center px-2 py-4 shadow-2xl border border-indigo-700">
            
            <TouchableOpacity className="items-center flex-1" onPress={handlePlaySelected}>
              <PlayIcon color="#34d399" size={22} />
              <Text className="text-[10px] text-indigo-200 mt-1 font-bold text-center" numberOfLines={1}>
                {selectedIds.length > 1 ? 'Play All' : 'Play'}
              </Text>
            </TouchableOpacity>

            {selectedIds.length === 1 && (
              <TouchableOpacity className="items-center flex-1" onPress={handleRenameFromSelection}>
                <PencilIcon color="#a5b4fc" size={22} />
                <Text className="text-[10px] text-indigo-200 mt-1 font-bold text-center" numberOfLines={1}>Rename</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity className="items-center flex-1" onPress={handleExport}>
              <ShareIcon color="#a5b4fc" size={22} />
              <Text className="text-[10px] text-indigo-200 mt-1 font-bold text-center" numberOfLines={1}>Export</Text>
            </TouchableOpacity>

            <TouchableOpacity className="items-center flex-1" onPress={() => { setActionType('copy'); setIsFolderModalVisible(true); }}>
              <DocumentDuplicateIcon color="#a5b4fc" size={22} />
              <Text className="text-[10px] text-indigo-200 mt-1 font-bold text-center" numberOfLines={1}>Copy To</Text>
            </TouchableOpacity>

            <TouchableOpacity className="items-center flex-1" onPress={() => { setActionType('move'); setIsFolderModalVisible(true); }}>
              <FolderOpenIcon color="#a5b4fc" size={22} />
              <Text className="text-[10px] text-indigo-200 mt-1 font-bold text-center" numberOfLines={1}>Move To</Text>
            </TouchableOpacity>

            <TouchableOpacity className="items-center flex-1" onPress={handleBulkDelete}>
              <TrashIcon color="#fca5a5" size={22} />
              <Text className="text-[10px] text-red-200 mt-1 font-bold text-center" numberOfLines={1}>{id === 'all' ? 'Delete' : 'Remove'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* RENAME QUIZ MODAL */}
      <Modal animationType="fade" transparent={true} visible={isRenameModalVisible} onRequestClose={() => setIsRenameModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" }}>
          <View className={`w-10/12 rounded-[32px] p-6 shadow-2xl ${isDark ? "bg-gray-900" : "bg-white"}`}>
            <Text className={`text-xl font-extrabold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>Rename Quiz</Text>
            <TextInput
              value={renameInput}
              onChangeText={setRenameInput}
              placeholder="Quiz Title"
              placeholderTextColor={isDark ? "#6b7280" : "#9ca3af"}
              autoFocus
              className={`p-4 rounded-2xl border mb-6 font-bold text-base ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
            />
            <View className="flex-row justify-end items-center">
              <TouchableOpacity className="px-5 py-3 rounded-full mr-2" onPress={() => setIsRenameModalVisible(false)}>
                <Text className={`font-bold ${isDark ? "text-gray-400" : "text-gray-500"}`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity className="bg-indigo-600 px-6 py-3 rounded-full shadow-sm" onPress={executeRename}>
                <Text className="text-white font-bold">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* NEW: EXPORTED COMPONENT RENDERED HERE */}
      <FolderSelectorModal 
        visible={isFolderModalVisible}
        onClose={() => setIsFolderModalVisible(false)}
        actionType={actionType}
        collections={collections}
        currentFolderId={id}
        onSelectFolder={executeMoveOrCopy}
        isDark={isDark}
      />

      {/* FEEDBACK MODALS */}
      <Modal animationType="fade" transparent={true} visible={deleteModalConfig.visible} onRequestClose={() => setDeleteModalConfig({ ...deleteModalConfig, visible: false })}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" }}>
          <View className={`w-10/12 rounded-[32px] p-8 items-center shadow-2xl ${isDark ? "bg-[#1e1e2d] border border-gray-800" : "bg-white"}`}>
            <View className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${isDark ? "bg-red-900/30" : "bg-red-100"}`}>
              <TrashIcon color={isDark ? "#fca5a5" : "#dc2626"} size={28} />
            </View>
            <Text className={`text-2xl font-extrabold mb-3 text-center ${isDark ? "text-white" : "text-gray-900"}`}>{deleteModalConfig.title}</Text>
            <Text className={`text-center text-sm mb-8 px-2 leading-5 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{deleteModalConfig.message}</Text>
            <TouchableOpacity className={`w-full py-4 rounded-full mb-3 ${isDark ? "bg-red-700" : "bg-[#b91c1c]"}`} onPress={deleteModalConfig.onConfirm}>
              <Text className="text-white text-center font-bold text-lg">{id === 'all' ? 'Delete' : 'Remove'}</Text>
            </TouchableOpacity>
            <TouchableOpacity className={`w-full py-4 rounded-full ${isDark ? "bg-transparent" : "bg-gray-200"}`} onPress={() => setDeleteModalConfig({ ...deleteModalConfig, visible: false })}>
              <Text className={`text-center font-bold text-lg ${isDark ? "text-gray-300" : "text-gray-900"}`}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={successConfig.visible} onRequestClose={() => setSuccessConfig({ ...successConfig, visible: false })}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" }}>
          <View className={`w-10/12 rounded-[32px] p-8 items-center shadow-2xl ${isDark ? "bg-[#1e1e2d] border border-gray-800" : "bg-white"}`}>
            <View className="bg-[#4caf50] w-20 h-20 rounded-full items-center justify-center mb-6 shadow-sm shadow-green-200"><CheckIconSolid color="white" size={40} /></View>
            <Text className={`text-2xl font-extrabold mb-3 text-center ${isDark ? "text-white" : "text-gray-900"}`}>{successConfig.title}</Text>
            <Text className={`text-base text-center mb-8 px-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{successConfig.message}</Text>
            <TouchableOpacity className="bg-indigo-600 w-full py-4 rounded-full shadow-md" onPress={() => setSuccessConfig({ ...successConfig, visible: false })}><Text className="text-white text-center font-bold text-lg">OK</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={errorConfig.visible} onRequestClose={() => setErrorConfig({ ...errorConfig, visible: false })}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" }}>
          <View className={`w-10/12 rounded-[32px] p-8 items-center shadow-2xl ${isDark ? "bg-[#1e1e2d] border border-gray-800" : "bg-white"}`}>
            <View className="bg-red-500 w-20 h-20 rounded-full items-center justify-center mb-6 shadow-sm shadow-red-200"><XMarkIcon color="white" size={40} /></View>
            <Text className={`text-2xl font-extrabold mb-3 text-center ${isDark ? "text-white" : "text-gray-900"}`}>{errorConfig.title}</Text>
            <Text className={`text-base text-center mb-8 px-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{errorConfig.message}</Text>
            <TouchableOpacity className="bg-red-600 w-full py-4 rounded-full shadow-md" onPress={() => setErrorConfig({ ...errorConfig, visible: false })}><Text className="text-white text-center font-bold text-lg">OK</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* GAME MODE SELECTOR BOTTOM SHEET */}
      <Modal animationType="none" transparent={true} visible={isGameModalOpen} onRequestClose={() => closeModeSelector()}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          
          <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', opacity: fadeAnim }}>
            <TouchableWithoutFeedback onPress={() => closeModeSelector()}>
              <View style={{ flex: 1 }} />
            </TouchableWithoutFeedback>
          </Animated.View>

          <Animated.View 
            style={{ transform: [{ translateY: slideAnim }], maxHeight: height * 0.8 }} 
            className={`rounded-t-[40px] p-6 pb-8 shadow-2xl ${isDark ? 'bg-gray-900' : 'bg-white'}`}
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Select Game Mode</Text>
              <TouchableOpacity onPress={() => closeModeSelector()} className={`p-2 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <XMarkIcon color={isDark ? "#9ca3af" : "#4b5563"} size={20} />
              </TouchableOpacity>
            </View>

            <Text className={`font-bold mb-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{quizToPlay?.title}</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity activeOpacity={0.8} className={`p-4 rounded-3xl flex-row items-center mb-3 border ${isDark ? 'bg-blue-900/20 border-blue-900/30' : 'bg-blue-50 border-blue-100'}`} onPress={() => navigateToGame('QuizPlayer')}>
                <View className={`p-3 rounded-2xl mr-4 ${isDark ? 'bg-blue-900' : 'bg-blue-200'}`}><PlayIcon color={isDark ? "#93c5fd" : "#1e3a8a"} size={24} /></View>
                <View><Text className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>Standard Quiz</Text><Text className="text-xs text-gray-500">Classic testing mode</Text></View>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.8} className={`p-4 rounded-3xl flex-row items-center mb-3 border ${isDark ? 'bg-yellow-900/20 border-yellow-900/30' : 'bg-yellow-50 border-yellow-100'}`} onPress={() => navigateToGame('Flashcards')}>
                <View className={`p-3 rounded-2xl mr-4 ${isDark ? 'bg-yellow-900' : 'bg-yellow-200'}`}><RectangleStackIcon color={isDark ? "#fde047" : "#a16207"} size={24} /></View>
                <View><Text className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>Flashcards</Text><Text className="text-xs text-gray-500">Flip cards to memorize</Text></View>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.8} className={`p-4 rounded-3xl flex-row items-center mb-3 border ${isDark ? 'bg-purple-900/20 border-purple-900/30' : 'bg-purple-50 border-purple-100'}`} onPress={() => navigateToGame('MatchMaster')}>
                <View className={`p-3 rounded-2xl mr-4 ${isDark ? 'bg-purple-900' : 'bg-purple-200'}`}><PuzzlePieceIcon color={isDark ? "#d8b4fe" : "#6b21a8"} size={24} /></View>
                <View><Text className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>Match Master</Text><Text className="text-xs text-gray-500">Pair questions to answers</Text></View>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.8} className={`p-4 rounded-3xl flex-row items-center mb-3 border ${isDark ? 'bg-orange-900/20 border-orange-900/30' : 'bg-orange-50 border-orange-100'}`} onPress={() => navigateToGame('TimeAttack')}>
                <View className={`p-3 rounded-2xl mr-4 ${isDark ? 'bg-orange-900' : 'bg-orange-200'}`}><ClockIconSolid color={isDark ? "#fdba74" : "#c2410c"} size={24} /></View>
                <View><Text className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>Time Attack</Text><Text className="text-xs text-gray-500">60 seconds speed run</Text></View>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.8} className={`p-4 rounded-3xl flex-row items-center mb-8 border ${isDark ? 'bg-red-900/20 border-red-900/30' : 'bg-red-50 border-red-100'}`} onPress={() => navigateToGame('SurvivalMode')}>
                <View className={`p-3 rounded-2xl mr-4 ${isDark ? 'bg-red-900' : 'bg-red-200'}`}><HeartIcon color={isDark ? "#fca5a5" : "#b91c1c"} size={24} /></View>
                <View><Text className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>Survival Mode</Text><Text className="text-xs text-gray-500">3 lives. Sudden death.</Text></View>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

    </GestureHandlerRootView>
  );
}