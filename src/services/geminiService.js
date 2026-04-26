import { GoogleGenerativeAI } from "@google/generative-ai";
import { useQuizStore } from "../store/useQuizStore"; // 🚨 NEW: Import the store directly

const callGeminiWithFallback = async (prompt, isJson = true, fileData = null) => {
  // 🚨 NEW: Pull the keys directly from the user's settings!
  const API_KEYS = useQuizStore.getState().geminiApiKeys || [];

  if (API_KEYS.length === 0) {
    throw new Error("No API Keys found! Please go to Settings and add your Gemini API Key.");
  }

  // The loop automatically adapts to however many keys the user added!
  for (let i = 0; i < API_KEYS.length; i++) {
    const currentKey = API_KEYS[i];
    const genAI = new GoogleGenerativeAI(currentKey);
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash", // Using the flagship flash model
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
      throw new Error("All AI quotas are currently full, or your key is invalid. Please wait a minute or add another key.");
    }
  }
};

// THE STRICT QUIZ GENERATOR (Custom GPT)
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

// THE CHAT ASSISTANT (With File Awareness)
export const askAIAssistant = (chatHistory, newMessage, fileData = null) => {
  const context = chatHistory.slice(-5).map(m => `${m.role}: ${m.text}`).join('\n');
  
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

export const generateDailyChallenge = async (pastQuestions = []) => {
  // Tell Gemini to strictly avoid recent questions if we have them
  const avoidPrompt = pastQuestions.length > 0 
    ? `\nCRITICAL: DO NOT repeat any of these exact questions or highly similar topics:\n${pastQuestions.map((q, i) => `${i+1}. ${q}`).join('\n')}` 
    : '';

  const prompt = `
    ACT AS A TRIVIA MASTER. 
    GENERATE A 10-QUESTION GENERAL KNOWLEDGE QUIZ.
    ${avoidPrompt}
    
    YOU MUST RETURN ONLY A JSON OBJECT WITH THIS EXACT STRUCTURE:
    {
      "title": "Daily Trivia: General Knowledge",
      "subject": "General Knowledge",
      "emoji": "🌟",
      "description": "Challenge your brain with today's 10 fresh questions!",
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
    1. Ensure there are exactly 10 questions.
    2. correctAnswerIndex must be a number from 0 to 3.
    3. Do not include any text outside of the JSON object.
  `;

  return await callGeminiWithFallback(prompt, true);
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
  return callGeminiWithFallback(prompt, true);
};

export const generateSpellingWords = async () => {
  const prompt = `
    ACT AS AN ENGLISH LINGUISTICS PROFESSOR.
    Generate a list of 15 challenging but useful spelling and vocabulary words for a high school or college level.

    YOU MUST RETURN ONLY A RAW JSON ARRAY OF OBJECTS WITH THIS EXACT STRUCTURE:
    [
      {
        "word": "The spelling word",
        "definition": "A brief definition",
        "sentence": "An example sentence using the word, but replace the actual word with '______'"
      }
    ]
  `;
  return callGeminiWithFallback(prompt, true);
};

export const improveGrammar = async (userText) => {
  const prompt = `
    ACT AS AN EXPERT ENGLISH GRAMMAR COACH AND NATIVE SPEAKER.
    The user wants to improve their grammar, spelling, and natural speaking flow.
    Review this text: "${userText}"

    YOU MUST RETURN ONLY A RAW JSON OBJECT WITH THIS EXACT STRUCTURE:
    {
      "correctedText": "The fully corrected, highly natural-sounding version of the text.",
      "improvements": [
        "A short bullet point explaining a specific grammar rule you fixed (e.g., 'Changed X to Y because...').",
        "A short bullet point explaining a vocabulary enhancement."
      ]
    }
  `;
  return callGeminiWithFallback(prompt, true);
};

export const generateGrammarPractice = async () => {
  const prompt = `
    ACT AS AN ENGLISH LINGUISTICS PROFESSOR.
    Generate a list of 20 challenging fill-in-the-blank English grammar questions suitable for high school or college level. 
    Focus on a diverse mix of OVERALL grammar skills. You must include a variety of topics such as:
    - Subject-verb agreement
    - Advanced verb tenses (e.g., past perfect continuous)
    - Prepositions and phrasal verbs
    - Conditional clauses (If I had known...)
    - Relative pronouns and modifiers

    YOU MUST RETURN ONLY A RAW JSON ARRAY OF OBJECTS WITH THIS EXACT STRUCTURE:
    [
      {
        "sentenceWithBlank": "Neither the manager nor the employees ______ aware of the new policy before the meeting.",
        "options": ["was", "were", "is", "are"],
        "correctAnswer": "were",
        "explanation": "When using 'neither/nor', the verb must agree with the subject closest to it. Since 'employees' is plural, 'were' is the correct past-tense plural verb."
      }
    ]
  `;
  return callGeminiWithFallback(prompt, true);
};

export const generateSpeakingScenarios = async () => {
  const prompt = `
    ACT AS AN ENGLISH CONVERSATION COACH.
    Generate 5 everyday, real-life scenarios for a student to practice spoken English. 

    YOU MUST RETURN ONLY A RAW JSON ARRAY OF OBJECTS WITH THIS EXACT STRUCTURE:
    [
      {
        "id": "unique-id",
        "title": "At the Coffee Shop",
        "scenario": "You want to order a medium iced latte with oat milk, but you need to ask if oat milk costs extra."
      }
    ]
  `;
  return callGeminiWithFallback(prompt, true);
};

export const evaluateSpeakingResponse = async (scenario, userResponse) => {
  const prompt = `
    ACT AS A NATIVE ENGLISH SPEAKING COACH.
    Scenario: "${scenario}"
    Student's spoken response: "${userResponse}"

    Evaluate this for everyday SPOKEN English (not formal textbook writing).
    
    YOU MUST RETURN ONLY A RAW JSON OBJECT WITH THIS EXACT STRUCTURE:
    {
      "feedback": "Brief, encouraging feedback explaining what they did well and what sounded slightly unnatural.",
      "nativeAlternative": "Exactly what a native speaker would actually say (use contractions, natural flow, casual phrasing).",
      "pronunciationTip": "A short tip on how to pronounce it naturally (e.g., 'link the words 'want to' into 'wanna'')."
    }
  `;
  return callGeminiWithFallback(prompt, true);
};