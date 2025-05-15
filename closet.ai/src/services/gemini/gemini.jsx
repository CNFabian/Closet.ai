import { GoogleGenAI } from '@google/genai';

// Initialize the API
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenAI(API_KEY);

// Create a reusable service
export const geminiService = {
  // For text-only generation
    async generateContent(prompt) {
        const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        });
    }
};