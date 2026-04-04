import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export const exportQuizFile = async (quizData) => {
  try {
    const filename = `${quizData.title.replace(/\s+/g, '_')}.json`;
    const fileUri = FileSystem.documentDirectory + filename;
    
    // Write JSON to local file system
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify({ version: "1.0", quiz: quizData }));
    
    // Open native sharing dialog
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    }
  } catch (error) {
    console.error("Export failed: ", error);
  }
};