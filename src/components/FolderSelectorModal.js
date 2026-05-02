import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Dimensions } from 'react-native';
import { XMarkIcon } from 'react-native-heroicons/solid';
import { FolderIcon } from 'react-native-heroicons/outline';

const { height } = Dimensions.get('window');

export default function FolderSelectorModal({
  visible,
  onClose,
  actionType,
  collections,
  currentFolderId,
  onSelectFolder,
  isDark
}) {
  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
        
        {/* 🚨 THE FIX: Added maxHeight so the ScrollView actually scrolls! */}
        <View 
          style={{ maxHeight: height * 0.85 }} 
          className={`w-full rounded-t-[32px] p-6 shadow-2xl min-h-[50%] ${isDark ? "bg-[#1e1b4b]" : "bg-white"}`}
        >
          <View className="flex-row justify-between items-center mb-6">
            <Text className={`text-xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>
              {actionType === 'copy' ? 'Copy to Folder' : 'Move to Folder'}
            </Text>
            <TouchableOpacity className={`p-2 rounded-full ${isDark ? 'bg-indigo-900/50' : 'bg-gray-100'}`} onPress={onClose}>
              <XMarkIcon color={isDark ? "white" : "black"} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
            {collections.filter(c => c.id !== currentFolderId).map(folder => (
              <TouchableOpacity
                key={folder.id}
                className={`flex-row items-center p-4 rounded-2xl mb-3 border ${isDark ? "bg-indigo-900/30 border-indigo-900" : "bg-gray-50 border-gray-200"}`}
                onPress={() => onSelectFolder(folder.id)}
              >
                <View className={`p-2 rounded-xl mr-4 ${isDark ? "bg-indigo-900/50" : "bg-indigo-100"}`}>
                  <FolderIcon color={isDark ? "#a5b4fc" : "#4f46e5"} size={24} />
                </View>
                <Text className={`font-bold text-base flex-1 ${isDark ? "text-white" : "text-gray-900"}`}>{folder.name}</Text>
                <Text className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{folder.quizIds?.length || 0} items</Text>
              </TouchableOpacity>
            ))}
            
            {collections.filter(c => c.id !== currentFolderId).length === 0 && (
              <Text className={`text-center mt-4 italic ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                You don't have any other folders to move/copy to.
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}