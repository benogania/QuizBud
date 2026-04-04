import { Audio } from 'expo-av';

export const playSound = async (type, isEnabled) => {
  // If the user turned off sound in Settings, do nothing!
  if (!isEnabled) return;

  try {
    let soundAsset;

    // Point these to the actual files in your assets folder
    if (type === 'correct') {
      soundAsset = require('../../assets/sounds/correct.mp3');
    } else if (type === 'wrong') {
      soundAsset = require('../../assets/sounds/wrong.mp3');
    }
 
    
    if (!soundAsset) return;

    const { sound } = await Audio.Sound.createAsync(soundAsset);
    await sound.playAsync();

    // Clean up memory after the sound finishes playing
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (error) {
    console.log("Error playing sound:", error);
  }
};