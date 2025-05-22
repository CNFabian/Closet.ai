import {
  GoogleGenAI,
} from "@google/genai";

const API_KEY = "AIzaSyCJ6kuk5xH5XN1MWToXk7KKBDTIrB9_Xjk";
const systemInstruction = `
You are a chef who specializes in creating recipes based on available ingredients and their quantities.
CRITICAL RULES:
1. NEVER suggest using more of any ingredient than is available in the pantry
2. Always check ingredient quantities before suggesting recipes
3. Adjust recipe servings to match available ingredient quantities
4. If there's not enough of a key ingredient, suggest substitutions or smaller portions

For every recipe that you generate keep the structure as follows.
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
      }
    ],
    "tags": ["quick", "vegetarian", "italian", etc.],
    "actualYield": "Actual servings based on available ingredients"
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
9. NEVER exceed available ingredient quantities

Return EXACTLY this structure with no extra text.`;

const genAI = new GoogleGenAI({apiKey: API_KEY});
const modelName = "gemini-2.0-flash-001";

// Helper function to format ingredients with quantities for prompts
const formatIngredientsWithQuantities = (ingredients) => {
  return ingredients.map(ing => {
    return `${ing.name}: ${ing.quantity} ${ing.unit}${ing.category ? ` (${ing.category})` : ''}`;
  }).join('\n');
};

// Create a reusable service
export const geminiService = {
  // Get recipe suggestions that respect available quantities
  async getRecipeSuggestions(ingredients, mealType, temperature = 0.7) {
    try {
      // Format ingredients with quantities
      const ingredientsText = formatIngredientsWithQuantities(ingredients);
      
      const prompt = `
        I have these ingredients in my kitchen with the following quantities:
        ${ingredientsText}
        
        Suggest 5 ${mealType} recipes I can make with these EXACT quantities. 
        
        CRITICAL REQUIREMENTS:
        - Do NOT suggest recipes that require more of any ingredient than I have available
        - Consider the quantities when suggesting recipes
        - If an ingredient quantity is low, suggest recipes that use smaller amounts
        - Adjust serving sizes based on available ingredient quantities
        
        IMPORTANT: I ONLY want the names of 5 recipes, numbered 1-5. 
        ONLY provide the recipe names, nothing else. 
        No introductions, no descriptions, just a simple numbered list of 5 feasible recipes.
      `;
      
      return await this.generateContent(prompt, temperature);
    } catch (error) {
      console.error('Error getting recipe suggestions:', error);
      throw error;
    }
  },
  
  // Get detailed recipe instructions with quantity validation
  async getRecipeDetails(recipe, ingredients, temperature = 0.2) {
    try {
      // Format ingredients with quantities
      const ingredientsText = formatIngredientsWithQuantities(ingredients);
      
      const customPrompt = `
        I have these ingredients in my kitchen with EXACT quantities:
        ${ingredientsText}
        
        Create a recipe for "${recipe}" using ONLY these ingredients with their available quantities.
        
        CRITICAL CONSTRAINTS:
        - NEVER use more of any ingredient than what's available
        - If the standard recipe calls for more than available, adjust the recipe size down
        - Clearly state actual servings based on ingredient limitations
        - Use realistic quantities that don't exceed what's in my pantry
        
        YOU MUST RESPOND WITH VALID JSON ONLY, with no text before or after. Do not include markdown code blocks.
        
        The JSON must follow this exact structure:
        {
          "recipe": {
            "name": "${recipe}",
            "description": "A brief description noting any quantity adjustments",
            "prepTime": "X minutes",
            "cookTime": "Y minutes", 
            "totalTime": "Z minutes",
            "servings": 4,
            "difficulty": "Easy/Medium/Hard",
            "ingredients": [
              {
                "name": "Ingredient name",
                "quantity": 1,
                "unit": "cup",
                "preparation": "chopped"
              }
            ],
            "instructions": [
              {
                "stepNumber": 1,
                "instruction": "Step instructions",
                "duration": 5,
                "tip": "Helpful tip",
                "ingredients": ["ingredient1", "ingredient2"],
                "equipment": ["tool1", "tool2"]
              }
            ],
            "tags": ["tag1", "tag2", "tag3"],
            "actualYield": "Actual servings based on available ingredients"
          }
        }
        
        IMPORTANT FORMATTING REQUIREMENTS:
        1. Each ingredient must be properly structured with separate name, quantity, unit, and preparation fields
        2. Do not use any markdown formatting
        3. The "name" field should only contain the ingredient name
        4. The "quantity" field should be a number that DOES NOT EXCEED available amounts
        5. The "unit" field should match or be convertible to available units
        6. Include "actualYield" field to show adjusted serving size
      `;
      
      console.log("Requesting quantity-aware recipe details for:", recipe);
      const result = await this.generateContent(customPrompt, temperature);
      
      console.log("Raw recipe details response:", result.text);
      
      try {
        // Clean up the response text
        let jsonString = result.text.trim();
        
        // Remove any markdown code block indicators if present
        if (jsonString.startsWith("```json")) {
          jsonString = jsonString.replace(/^```json\n/, "").replace(/\n```$/, "");
        } else if (jsonString.startsWith("```")) {
          jsonString = jsonString.replace(/^```\n/, "").replace(/\n```$/, "");
        }
        
        // Find the JSON object
        const firstBraceIndex = jsonString.indexOf('{');
        const lastBraceIndex = jsonString.lastIndexOf('}');
        
        if (firstBraceIndex !== -1 && lastBraceIndex > firstBraceIndex) {
          jsonString = jsonString.substring(firstBraceIndex, lastBraceIndex + 1);
        }
        
        // Parse the JSON
        const jsonResult = JSON.parse(jsonString);
        
        // Validate the structure
        if (!jsonResult.recipe) {
          throw new Error("JSON response is missing the 'recipe' object");
        }
        
        // Additional validation: check if recipe quantities don't exceed available
        if (jsonResult.recipe.ingredients) {
          const validation = this.validateRecipeQuantities(jsonResult.recipe.ingredients, ingredients);
          if (!validation.isValid) {
            console.warn("Recipe validation warnings:", validation.warnings);
            // Still return the recipe but log warnings
          }
        }
        
        return {
          json: jsonResult,
          text: result.text
        };
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        throw new Error('Failed to get recipe details in the correct format. Please try again.');
      }
    } catch (error) {
      console.error('Error getting recipe details:', error);
      throw error;
    }
  },
  
  // Validate that recipe doesn't exceed available quantities
  validateRecipeQuantities(recipeIngredients, availableIngredients) {
    const warnings = [];
    let isValid = true;
    
    for (const recipeIng of recipeIngredients) {
      const available = availableIngredients.find(ing => 
        ing.name.toLowerCase() === recipeIng.name.toLowerCase()
      );
      
      if (!available) {
        warnings.push(`${recipeIng.name} is not available in pantry`);
        isValid = false;
      } else {
        // Simple quantity check (you could enhance this with unit conversion)
        if (parseFloat(recipeIng.quantity) > parseFloat(available.quantity)) {
          warnings.push(`Recipe calls for ${recipeIng.quantity} ${recipeIng.unit} of ${recipeIng.name}, but only ${available.quantity} ${available.unit} available`);
          isValid = false;
        }
      }
    }
    
    return { isValid, warnings };
  },
  
  // Generate content directly using the Gemini API
  async generateContent(prompt, temperature = 0.7) {
    try {
      console.log("Sending prompt to Gemini with temperature:", temperature);
      
      const requestConfig = {
        model: modelName,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: temperature,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048,
        }
      };
      
      const response = await genAI.models.generateContent(requestConfig);
      console.log("Raw Gemini response:", response);
      
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