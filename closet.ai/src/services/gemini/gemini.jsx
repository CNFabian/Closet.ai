import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";

const API_KEY = "AIzaSyCJ6kuk5xH5XN1MWToXk7KKBDTIrB9_Xjk";
const systemInstruction = `
I have these ingredients in my kitchen.
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

// Cache settings
let activeCache = null;

function updateCache(cache) {
  // use to extend cache lifetime if needed
  activeCache = cache;
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

  // Create a cache with system instructions for ingredients
  async createIngredientsCache(ingredientsList) {
    try {
      // Format ingredients into a string
      const ingredientsText = ingredientsList
        .map(ingredient => ingredient.name)
        .join(", ");
      
      // Create a custom system instruction with the ingredients
      const customInstruction = systemInstruction.replace(
        "I have these ingredients in my kitchen.", 
        `I have these ingredients in my kitchen: ${ingredientsText}.`
      );
      
      // Create the cache with the user's ingredients
      const cache = await genAI.caches.create({
        model: modelName,
        config: {
          systemInstruction: customInstruction
        }
      });
      
      // Store the active cache
      updateCache(cache);
      
      return cache;
    } catch (error) {
      console.error('Error creating cache:', error);
      throw error;
    }
  },
  
  // Get recipe suggestions based on ingredients
  async getRecipeSuggestions(ingredients, mealType, temperature = 0.7) {
    try {
      // Create or use an existing cache with the ingredients
      if (!activeCache) {
        await this.createIngredientsCache(ingredients);
      }
      
      const prompt = `
        Suggest 5 ${mealType} recipes I can make with these ingredients.
        
        IMPORTANT: I ONLY want the names of 5 recipes, numbered 1-5. 
        ONLY provide the recipe names, nothing else. 
        No introductions, no descriptions, just a simple numbered list of 5 recipes.
      `;
      
      return await this.generateContent(prompt, temperature);
    } catch (error) {
      console.error('Error getting recipe suggestions:', error);
      throw error;
    }
  },
  
  // Get detailed recipe instructions in JSON format
  async getRecipeDetails(recipe, ingredients, temperature = 0.5) {
    try {
      // Create or update cache if needed
      if (!activeCache) {
        await this.createIngredientsCache(ingredients);
      }
      
      const prompt = `
        I want to make "${recipe}".
        
        IMPORTANT: Your response must be valid JSON that strictly follows the exact structure I provided. 
        The response should contain only the JSON with no additional text before or after.
        
        Remember to:
        1. Break down complex steps into separate, simpler steps
        2. Each step should focus on ONE primary action
        3. Maximum 2-3 sentences per step
        4. Include estimated duration in minutes for each step
        5. List ONLY the specific ingredients and equipment needed for each step
        6. Add helpful tips that might not be obvious to beginners
        7. Number steps sequentially, never skip numbers
        8. Explicitly mention temperatures, timing and technique details
        
        Only include ingredients from my available ingredients or basic pantry staples.
      `;
      
      const result = await this.generateContent(prompt, temperature);
      
      // Attempt to parse the result as JSON
      try {
        // Clean up the response to extract only the JSON part
        let jsonString = result.text.trim();
        
        // Remove any markdown code block indicators if present
        if (jsonString.startsWith("```json")) {
          jsonString = jsonString.replace(/^```json\n/, "").replace(/\n```$/, "");
        } else if (jsonString.startsWith("```")) {
          jsonString = jsonString.replace(/^```\n/, "").replace(/\n```$/, "");
        }
        
        // Parse the JSON
        const jsonResult = JSON.parse(jsonString);
        
        // Return both the parsed JSON and original text (for debugging)
        return {
          json: jsonResult,
          text: result.text
        };
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        console.log('Raw response that failed to parse:', result.text);
        
        // Return the text response if parsing fails
        return result;
      }
    } catch (error) {
      console.error('Error getting recipe details:', error);
      throw error;
    }
  },
  
  // Generate content using cache when available
  async generateContent(prompt, temperature = 0.7) {
    try {
      console.log("Sending prompt to Gemini with temperature:", temperature);
      
      let requestConfig = {
        model: modelName,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: temperature,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048,
        }
      };
      
      // Use cache if available
      if (activeCache) {
        requestConfig.config = {
          cachedContent: activeCache.name
        };
        console.log("Using cached content:", activeCache.name);
      }
      
      const response = await genAI.models.generateContent(requestConfig);
      console.log("Raw Gemini response:", response);
      
      // Extract text based on the actual response structure
      if (response && response.candidates && response.candidates.length > 0 &&
          response.candidates[0].content && response.candidates[0].content.parts) {
        const textParts = response.candidates[0].content.parts
          .filter(part => part.text)
          .map(part => part.text);
        
        const responseText = textParts.join('\n');
        console.log("Extracted text:", responseText);
        return { text: responseText };
      } else {
        console.error("Response structure doesn't match expected format:", response);
        throw new Error("Unexpected response format from Gemini API");
      }
    } catch (error) {
      console.error('Detailed error generating content:', error);
      throw error;
    }
  }
};