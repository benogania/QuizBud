import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Define your two different API keys
const API_KEYS = [
  'AIzaSyBURb6WzynNjCtyiXon9uE1XfJu3u9Lr4w', // Account 1
  'AIzaSyAGjsjGvPln90hcBbvA6KVMf6CDAQ9RuN4',  // Account 2
  'AIzaSyCjda2M3VrsjRdxS9FB2caD0KAwiv2lWUo' // Account 3 
];

const callGeminiWithFallback = async (prompt, isJson = true, fileData = null) => {
  // The loop automatically adapts to however many keys are in the array!
  for (let i = 0; i < API_KEYS.length; i++) {
    const currentKey = API_KEYS[i];
    const genAI = new GoogleGenerativeAI(currentKey);
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash", // Using the 2026 flagship flash model
        generationConfig: isJson ? { responseMimeType: "application/json" } : {}
      });

      let promptParts = [prompt];

      // Handle file uploads if present
      if (fileData) {
        promptParts.push({
          inlineData: {
            data: fileData.base64,
            mimeType: fileData.mimeType
          }
        });
      }

      const result = await model.generateContent(promptParts);
      const text = result.response.text();
      
      return isJson ? JSON.parse(text) : text;

    } catch (error) {
      const isQuotaError = error.message?.includes("429") || error.status === 429 || error.message?.includes("quota");
      
      // If it's a quota error and we have another key left, try the next one
      if (isQuotaError && i < API_KEYS.length - 1) {
        console.log(`API Key ${i + 1} limit reached. Switching to API Key ${i + 2}...`);
        continue; 
      }

      // If it's the last key or not a quota error, throw the error
      console.error(`Gemini Error (Key ${i + 1}):`, error);
      throw new Error("All AI quotas are currently full. Please wait a minute.");
    }
  }
};

//THE STRICT QUIZ GENERATOR (Custom GPT)
export const generateQuizWithAI = (topic, numQuestions = 5, fileData = null) => {
  const prompt = `
    ACT AS AN EXPERT EXAM CREATOR.
    Create an educational quiz based on the provided file or the topic: "${topic}".
    Number of questions: ${numQuestions}.

    YOU MUST RETURN ONLY A JSON OBJECT WITH THIS EXACT STRUCTURE:
    {
      "title": "A catchy title for the quiz",
      "subject": "The academic subject",
      "emoji": "📚",
      "description": "A short 1-sentence description.",
      "questions": [
        {
          "id": "q1",
          "type": "multiple_choice",
          "question": "The question text here?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswerIndex": 0,
          "points": 1
        }
      ]
    }

    CRITICAL RULES:
    1. Every question MUST have 'type' set to exactly "multiple_choice".
    2. 'options' MUST be an array of exactly 4 string answers.
    3. 'correctAnswerIndex' MUST be a number between 0 and 3.
    4. Do not include markdown formatting. Return raw JSON.
  `;
  return callGeminiWithFallback(prompt, true, fileData);
};

// 2. THE CHAT ASSISTANT (With File Awareness)
export const askAIAssistant = (chatHistory, newMessage, fileData = null) => {
  const context = chatHistory.slice(-5).map(m => `${m.role}: ${m.text}`).join('\n');
  
  // If a file is attached, inject a special instruction!
  const fileInstruction = fileData 
    ? "\n\nCRITICAL INSTRUCTION: The user has uploaded a document. Analyze it to answer their question. THEN, enthusiastically suggest that you can turn this document into a custom practice quiz! Tell them to tap the 'Make Quiz' button at the top of the screen to generate it instantly."
    : "";

  const prompt = `
    You are QuizBud AI, an encouraging and highly knowledgeable study assistant.
    Context:\n${context}
    
    Student asks: ${newMessage}
    ${fileInstruction}
  `;
  
  return callGeminiWithFallback(prompt, false, fileData);
};
// ... existing keys and callGeminiWithFallback code ...

export const generateDailyChallenge = async () => {
  const prompt = `
    ACT AS A TRIVIA MASTER. 
    GENERATE A 5-QUESTION GENERAL KNOWLEDGE QUIZ.
    
    YOU MUST RETURN ONLY A JSON OBJECT WITH THIS EXACT STRUCTURE:
    {
      "title": "Daily Trivia: [Insert Topic]",
      "subject": "General Knowledge",
      "emoji": "🌟",
      "description": "Challenge your brain with today's 5 random questions!",
      "questions": [
        {
          "id": "q1",
          "type": "multiple_choice",
          "question": "The question text here?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswerIndex": 0,
          "points": 1
        }
      ]
    }
    
    RULES:
    1. Ensure there are exactly 5 questions.
    2. correctAnswerIndex must be a number from 0 to 3.
    3. Do not include any text outside of the JSON object.
  `;

  // We call the fallback wrapper you already have
  const result = await callGeminiWithFallback(prompt, true);
  return result;
};

export const generateStudyRecommendation = (stats) => {
  const prompt = `
    Analyze these student stats: ${JSON.stringify(stats)}.

    CRITICAL INSTRUCTION: You must provide extremely short, punchy responses. DO NOT write paragraphs. If you exceed the word limits, the mobile app UI will break.

    Return ONLY a JSON object exactly matching this structure and length constraints:
    {
      "title": "String (Max 8 words. E.g., 'You've unlocked deep focus this month.')",
      "message": "String (Max 2 short sentences, 25 words total. E.g., 'Your accuracy has reached an all-time high. Maintaining this pace will put you in the top 5% of learners.')",
      "recommendation": "String (Max 6 words. Very direct action. E.g., 'Keep reviewing your weak spots.')"
    }
  `;
  return callGeminiWithFallback(prompt, true);
};


// Add this export to the bottom of src/services/geminiService.js
export const generateWordArchitectQuiz = async (quizQuestions) => {
  const prompt = `
    ACT AS A GAME DESIGNER. 
    I am building a Hangman/Wordle style game. I have a list of multiple-choice questions, but the answers are too long (e.g., full sentences).
    
    Take this JSON array of questions and extract ONLY the core 1-to-2 word keyword from the correct answer.
    
    Original Data: ${JSON.stringify(quizQuestions)}
    
    RULES:
    1. Keep the original question text.
    2. The new "answer" MUST be 1 or 2 words maximum (Strictly under 15 characters). Letters only!
    3. Return ONLY a JSON object with this exact structure:
    {
      "questions": [
        {
          "question": "The text of the question?",
          "answer": "SHORTWORD"
        }
      ]
    }
  `;
  // Use your fallback wrapper!
  return callGeminiWithFallback(prompt, true);
};