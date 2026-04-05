import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useQuizStore = create(
  persist(
    (set) => ({
      // --- STATE ---
      quizzes: [],
      quizHistory: [],
      dailyChallenge: null,
      lastDailyFetch: null,
      soundEffects: true,
      hapticsEnabled: true,
      // Add these two lines to your state:

      // --- ADD THESE FOR NOTIFICATIONS ---
      remindersEnabled: false,
      setRemindersEnabled: (enabled) => set({ remindersEnabled: enabled }),
      reminderTime: { hour: 20, minute: 0 }, // Default is 8:00 PM
      setReminderTime: (time) => set({ reminderTime: time }),

      aiTone: "Standard",
      setAiTone: (tone) => set({ aiTone: tone }),

      spellingData: [],
      setSpellingData: (data) => set({ spellingData: data }),

      // Add these to your Zustand store state
      grammarPracticeData: [],
      setGrammarPracticeData: (data) => set({ grammarPracticeData: data }),

      // Add these to your Zustand store state
      speakingScenarios: [],
      setSpeakingScenarios: (data) => set({ speakingScenarios: data }),

      clearHistory: () => set({ quizHistory: [] }),

      setDailyChallenge: (quiz) =>
        set({
          dailyChallenge: quiz,
          lastDailyFetch: new Date().toDateString(),
        }),
      setAiStatsInsight: (insight) =>
        set({
          aiStatsInsight: insight,
          lastStatsFetch: new Date().toDateString(),
        }),

      toggleSoundEffects: () =>
        set((state) => ({ soundEffects: !state.soundEffects })),

      toggleHaptics: () =>
        set((state) => ({ hapticsEnabled: !state.hapticsEnabled })),

      theme: "dark",

      // Bulletproof theme setter
      setTheme: (newTheme) => set({ theme: newTheme }),

      // Add this right next to your existing state variables (like quizzes: [])
      collections: [], // Array to hold: { id: string, name: string, quizIds: array }

      // Add these new functions to create, edit, and delete collections
      createCollection: (name) =>
        set((state) => ({
          collections: [
            ...state.collections,
            {
              id: `col-${Date.now()}`,
              name,
              quizIds: [],
            },
          ],
        })),

      editCollection: (id, newName) =>
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === id ? { ...c, name: newName } : c,
          ),
        })),

      // Add this inside your Zustand store:
      updateCollectionIcon: (id, iconName) =>
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === id ? { ...c, icon: iconName } : c,
          ),
        })),

      deleteCollection: (id) =>
        set((state) => ({
          collections: state.collections.filter((c) => c.id !== id),
          // Optional: You might want to remove this collection's ID from quizzes here too later
        })),

      // Add these inside your Zustand store:

      addQuizzesToCollection: (collectionId, quizIdsArray) =>
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId
              ? {
                  ...c,
                  quizIds: [
                    ...new Set([...(c.quizIds || []), ...quizIdsArray]),
                  ],
                }
              : c,
          ),
        })),

      removeQuizzesFromCollection: (collectionId, quizIdsArray) =>
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId
              ? {
                  ...c,
                  quizIds: (c.quizIds || []).filter(
                    (id) => !quizIdsArray.includes(id),
                  ),
                }
              : c,
          ),
        })),

      deleteMultipleQuizzes: (quizIdsArray) =>
        set((state) => ({
          quizzes: state.quizzes.filter((item) => {
            const qId = item.quiz ? item.quiz.id : item.id;
            return !quizIdsArray.includes(qId);
          }),
          // Also strip them out of any collections they were in
          collections: state.collections.map((c) => ({
            ...c,
            quizIds: (c.quizIds || []).filter(
              (id) => !quizIdsArray.includes(id),
            ),
          })),
        })),

      // --- QUIZ ACTIONS ---
      addQuiz: (newQuiz) =>
        set((state) => ({
          quizzes: [newQuiz, ...state.quizzes],
        })),

      addQuizHistory: (result) =>
        set((state) => ({
          quizHistory: [result, ...state.quizHistory],
        })),

      deleteQuiz: (quizId) =>
        set((state) => ({
          quizzes: state.quizzes.filter((item) => {
            const currentId = item.quiz ? item.quiz.id : item.id;
            return currentId !== quizId;
          }),
        })),

      //The Modified update quiz
      updateQuiz: (id, updatedQuizData) =>
        set((state) => ({
          quizzes: state.quizzes.map((item) => {
            const qId = item.quiz ? item.quiz.id : item.id;
            if (qId === id) {
              // Safely merges the data whether it is nested inside "quiz" or flat
              return item.quiz
                ? { ...item, quiz: { ...item.quiz, ...updatedQuizData } }
                : { ...item, ...updatedQuizData };
            }
            return item;
          }),
        })),

      // 1. Add this to merge backed-up quizzes into your app
      importQuizzes: (importedQuizzes) =>
        set((state) => {
          // Merges imported quizzes with existing ones, preventing duplicates by ID
          const existingIds = state.quizzes.map((q) => q.id);
          const newQuizzes = importedQuizzes.filter(
            (q) => !existingIds.includes(q.id),
          );
          return { quizzes: [...state.quizzes, ...newQuizzes] };
        }),

      // 2. Make sure clearHistory looks exactly like this to wipe all activity
      // Wipes only the stats/history, keeps the created quizzes
      clearHistory: () =>
        set({
          quizHistory: [], // 🚨 FIXED: Changed from 'history' to 'quizHistory'
          aiStatsInsight: null, // Reset the AI text
          lastStatsFetch: null, // Reset the fetch timer
          stats: {
            totalScore: 0,
            quizzesTaken: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
          },
        }),

      // Wipes EVERYTHING (Quizzes, Stats, AI Data)
      // Wipes EVERYTHING (Quizzes, Folders, Stats, AI Data)
      factoryReset: () =>
        set({
          quizzes: [],
          collections: [], // 🚨 ADD THIS LINE (or 'collections: []' depending on what you named it)
          quizHistory: [],
          spellingData: [],
          grammarPracticeData: [],
          speakingScenarios: [],
          aiStatsInsight: null,
          lastStatsFetch: null,
          stats: {
            totalScore: 0,
            quizzesTaken: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
          },
        }),
    }),
    {
      name: "quizbud-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
