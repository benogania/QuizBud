import * as Haptics from 'expo-haptics';

export const triggerHaptic = (isEnabled, style = 'light') => {
  if (!isEnabled) return;

  try {
    // Now it doesn't matter if you type 'MEDIUM', 'medium', or 'Medium'!
    switch (style.toLowerCase()) {
      case 'heavy':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'light':
      default:
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
    }
  } catch (error) {
    console.log("Haptics error: ", error);
  }
};