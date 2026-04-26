import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  TouchableWithoutFeedback
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuizStore } from "../store/useQuizStore";
import { useSafeAreaInsets } from "react-native-safe-area-context"; 
import { triggerHaptic } from '../utils/hapticHelper';

import {
  ArrowLeftIcon,
  FolderIcon,        
  BookOpenIcon,
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
  StarIcon as StarSolid,
  FolderPlusIcon
} from "react-native-heroicons/solid";

const ICON_MAP = {
  folder: FolderIcon, book: BookOpenIcon, briefcase: BriefcaseIcon,
  bookmark: BookmarkIcon, globe: GlobeAltIcon, map: MapIcon,
  beaker: BeakerIcon, rocket: RocketLaunchIcon, art: PaintBrushIcon
};

export default function AllCollectionsScreen() {
  const { theme, collections = [], editCollection, deleteCollection, updateCollectionIcon, createCollection, hapticsEnabled } = useQuizStore();
  const isDark = theme === "dark";
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [isFolderModalVisible, setIsFolderModalVisible] = useState(false);
  const [isFolderActionModalVisible, setIsFolderActionModalVisible] = useState(false);
  const [isIconPickerVisible, setIsIconPickerVisible] = useState(false); 
  const [folderNameInput, setFolderNameInput] = useState("");
  const [selectedFolder, setSelectedFolder] = useState(null);

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

  return (
    <View className={`flex-1 ${isDark ? 'bg-[#0f172a]' : 'bg-gray-50'}`} style={{ paddingTop: insets.top }}>
      
      {/* Header */}
      <View className={`flex-row items-center justify-between px-5 py-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2 rounded-full">
            <ArrowLeftIcon color={isDark ? "white" : "#1e3a8a"} size={24} />
          </TouchableOpacity>
          <Text className={`text-xl font-bold ml-2 ${isDark ? 'text-white' : 'text-blue-900'}`}>All Collections</Text>
        </View>
        <TouchableOpacity 
          onPress={() => { setSelectedFolder(null); setFolderNameInput(""); setIsFolderModalVisible(true); }}
          className={`p-2 rounded-full ${isDark ? 'bg-indigo-900/50' : 'bg-indigo-100'}`}
        >
          <FolderPlusIcon color={isDark ? "#818cf8" : "#4f46e5"} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {collections.length === 0 ? (
          <View className={`p-8 rounded-3xl border items-center mt-10 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <FolderIcon color={isDark ? "#4b5563" : "#9ca3af"} size={48} />
            <Text className={`mt-4 font-bold text-lg ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>No Folders Yet</Text>
            <Text className={`text-center mt-2 text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Create a collection to organize your quizzes!</Text>
          </View>
        ) : (
          collections.map((folder) => {
            const FolderDisplayIcon = folder.icon && ICON_MAP[folder.icon] ? ICON_MAP[folder.icon] : FolderIcon;
            return (
              <TouchableOpacity
                key={folder.id}
                className={`flex-row items-center p-4 rounded-3xl mb-3 border shadow-sm ${isDark ? "bg-gray-800" : "border-slate-200 bg-white"}`}
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
          })
        )}
      </ScrollView>

      {/* --- FOLDER MANAGEMENT MODALS --- */}
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
            <View className={`w-10/12 rounded-[32px] p-6 shadow-2xl  ${isDark ? "bg-gray-900" : "bg-white" }`}>
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

    </View>
  );
}