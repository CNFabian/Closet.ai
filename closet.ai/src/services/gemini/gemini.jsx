import {
  GoogleGenAI,
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
  
  // Get recipe suggestions based on ingredients
  async getRecipeSuggestions(ingredients, mealType, temperature = 0.7) {
    try {
      // Format ingredients into a string
      const ingredientsText = ingredients
        .map(ingredient => ingredient.name)
        .join(", ");
      
      // Create custom instruction with the ingredients
      const customInstruction = `
        I have these ingredients in my kitchen: ${ingredientsText}.
        Suggest 5 ${mealType} recipes I can make with these ingredients.
        
        IMPORTANT: I ONLY want the names of 5 recipes, numbered 1-5. 
        ONLY provide the recipe names, nothing else. 
        No introductions, no descriptions, just a simple numbered list of 5 recipes.
      `;
      
      return await this.generateContent(customInstruction, temperature);
    } catch (error) {
      console.error('Error getting recipe suggestions:', error);
      throw error;
    }
  },
  
  // Get detailed recipe instructions in JSON format
  async getRecipeDetails(recipe, ingredients, temperature = 0.5) {
    try {
      // Format ingredients into a string
      const ingredientsText = ingredients
        .map(ingredient => ingredient.name)
        .join(", ");
        
      // Use a much lower temperature for JSON generation to ensure formatting consistency
      const jsonTemperature = 0.2;
      
      // Create a very explicit prompt to get proper JSON format
     const customPrompt = `
        I have these ingredients in my kitchen: ${ingredientsText}.
        
        I want you to create a recipe for "${recipe}" using only these ingredients plus common pantry staples.
        
        YOU MUST RESPOND WITH VALID JSON ONLY, with no text before or after. Do not include markdown code blocks.
        
        The JSON must follow this exact structure:
        {
          "recipe": {
            "name": "${recipe}",
            "description": "A brief description",
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
            "tags": ["tag1", "tag2", "tag3"]
          }
        }
        
        IMPORTANT FORMATTING REQUIREMENTS:
        1. Each ingredient must be properly structured as an object with separate name, quantity, unit, and preparation fields
        2. Do not use any markdown formatting like bold or italic
        3. The "name" field should only contain the ingredient name without any quantities or units
        4. The "quantity" field should be a number (like 1, 0.5, 2)
        5. The "unit" field should only contain the unit of measurement (like "cup", "tablespoon", "teaspoon")
      `;
      
      // Get the recipe details with a low temperature for consistent JSON formatting
      console.log("Requesting recipe details for:", recipe);
      const result = await this.generateContent(customPrompt, jsonTemperature);
      
      // Log the raw response for debugging
      console.log("Raw recipe details response:", result.text);
      
      // Try to parse the JSON response
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
        
        // Check the structure
        if (!jsonResult.recipe) {
          throw new Error("JSON response is missing the 'recipe' object");
        }
        
        return {
          json: jsonResult,
          text: result.text
        };
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        
        // If JSON parsing failed, try again with an even stricter prompt
        console.log("First parsing attempt failed, trying again with stricter formatting...");
        
        const fallbackPrompt = `
          I need a valid JSON object for a recipe called "${recipe}" using these ingredients: ${ingredientsText}.
          EXTREMELY IMPORTANT: Return ONLY valid JSON with no other text.
          The response must be ONLY the JSON object below with NO markdown code blocks or other text:
          
          {
            "recipe": {
              "name": "${recipe}",
              "description": "A brief description",
              "prepTime": "X minutes",
              "cookTime": "Y minutes",
              "totalTime": "Z minutes",
              "servings": 4,
              "difficulty": "Easy/Medium/Hard",
              "ingredients": [
                {"name": "Ingredient1", "quantity": 1, "unit": "unit", "preparation": ""}
              ],
              "instructions": [
                {"stepNumber": 1, "instruction": "Step 1", "duration": 5, "tip": "", "ingredients": ["Ingredient1"], "equipment": []}
              ],
              "tags": ["quick"]
            }
          }
        `;
        
        // Try one more time with minimal temperature
        const retryResult = await this.generateContent(fallbackPrompt, 0.1);
        console.log("Retry response:", retryResult.text);
        
        try {
          // Clean up and find the JSON object in the retry response
          let retryJsonString = retryResult.text.trim();
          
          // Remove markdown blocks
          if (retryJsonString.includes("```")) {
            retryJsonString = retryJsonString.replace(/```json/g, "").replace(/```/g, "").trim();
          }
          
          // Get just the JSON part
          const firstBrace = retryJsonString.indexOf('{');
          const lastBrace = retryJsonString.lastIndexOf('}');
          
          if (firstBrace !== -1 && lastBrace > firstBrace) {
            retryJsonString = retryJsonString.substring(firstBrace, lastBrace + 1);
          }
          
          // Parse and verify
          const retryJson = JSON.parse(retryJsonString);
          
          if (!retryJson.recipe) {
            throw new Error("Retry response is missing the 'recipe' object");
          }
          
          return {
            json: retryJson,
            text: retryResult.text
          };
        } catch (retryError) {
          console.error("JSON parsing failed on retry:", retryError);
          throw new Error("Failed to get recipe details in the correct format. Please try again.");
        }
      }
    } catch (error) {
      console.error('Error getting recipe details:', error);
      throw error;
    }
  },
  
  // Generate content directly using the Gemini API
  async generateContent(prompt, temperature = 0.7) {
  try {
    console.log("Sending prompt to Gemini with temperature:", temperature);
    
    // Create request configuration
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
    
    // Use the correct API method
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