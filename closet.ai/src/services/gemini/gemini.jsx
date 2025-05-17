import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";

const ingredientNames = [];


const API_KEY = "AIzaSyCJ6kuk5xH5XN1MWToXk7KKBDTIrB9_Xjk";
const systemInstruction = `
I have these ingredients in my kitchen: ${ingredientNames}.
Reference these ingredients whenever you are asked to make a recipe. For every recipe that you generate keep the structure as follows.
IMPORTANT: Respond with ONLY valid JSON referencing the exact structure specified below without any introduction or explanation text before or after:
{
  "recipe": {
    "name": "Recipe title",
    "description": "Brief description of the dish",
    "prepTime": "time in minutes or hours and minutes",
    "cookTime": "time in minutes or hours and minutes",
    "totalTime":"time in minutes or hours and minutes",
    "servings": 4,
    "difficulty": "Easy/Medium/Hard",
    "ingredients": [
      {
        "name": "Ingredient name",
        "quantity": 1.5,
        "unit": "cups/tbsp/etc",
        "preparation": "diced/minced/etc (optional)"
      }
    ],
    "instructions": [
      {
        "stepNumber": 1,
        "instruction": "Full instruction text for step 1",
        "duration": 5,
        "tip": "Optional helpful tip for this step",
        "ingredients": ["ingredient1", "ingredient2"],
        "equipment": ["equipment1", "equipment2"]
      },
      {
        "stepNumber": 2,
        "instruction": "Full instruction text for step 2",
        "duration": 8,
        "tip": "Optional helpful tip for this step",
        "ingredients": ["ingredient1", "ingredient3"],
        "equipment": ["equipment3"]
      }
    ],
    "tags": ["quick", "vegetarian", "italian", etc.]
  }
}

IMPORTANT INSTRUCTION GUIDELINES:
1. Break down complex steps into separate, simpler steps
2. Each step should focus on ONE primary action
3. Maximum 2-3 sentences per step
4. Include estimated duration in minutes for each step
5. List ONLY the specific ingredients and equipment needed for each step
6. Add helpful tips that might not be obvious to beginners
7. Number steps sequentially, never skip numbers
8. Explicitly mention temperatures, timing and technique details

Return EXACTLY this structure with no extra text.`;


const genAI = new GoogleGenAI({apiKey: API_KEY});
const modelName = "gemini-2.0-flash-001";

function updateCache(cache) {
  // use to extend cache lifetime
}

// Create a reusable service
export const geminiService = {
  
  // File upload method
  async uploadFile(filePath, mimeType = "text/plain") {
    try {
      const doc = await genAI.files.upload({
        file: filePath,
        config: { mimeType: mimeType },
      });
      console.log("Uploaded file name:", doc.name);
      return doc;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  },

  async createCache(systemInstruction) {
    const cache = await genAI.caches.create({
      model: modelName,
      config: {
        contents: createUserContent(createPartFromUri(doc.uri, doc.mimeType)),
        systemInstruction: systemInstruction
      }
    })
  },
  
  // For text-only generation
  async generateContent(prompt) {
    try {
      const response = await genAI.models.generateContent({ 
        model: modelName,
        contents: prompt
      });
      return response;
    } catch (error) {
      console.error('Error generating content:', error);
      throw error;
    }
  }
};