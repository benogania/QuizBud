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
      aiTone: 'Standard',
      setAiTone: (tone) => set({ aiTone: tone }),

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



    }),
    {
      name: "quizbud-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
