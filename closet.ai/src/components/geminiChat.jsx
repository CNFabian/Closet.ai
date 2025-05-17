import React, { useState, useEffect } from 'react';
import { geminiService } from '../services/gemini/gemini';
import { createRecipePrompt } from '../utils/prompTemplates';

function GeminiChat({ ingredients = [] }) {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipeType, setRecipeType] = useState('basicRecipeGenerator');

  // Update prompt when ingredients change
  useEffect(() => {
    if (ingredients.length > 0) {
      // Create a default prompt based on the ingredients
      try {
        const defaultPrompt = createRecipePrompt(ingredients, recipeType);
        setPrompt(defaultPrompt);
      } catch (error) {
        console.error("Error creating recipe prompt:", error);
        // Set a fallback prompt if there's an error
        setPrompt(`Generate recipes using these ingredients: ${ingredients.map(i => i.name).join(', ')}`);
      }
    }
  }, [ingredients, recipeType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setLoading(true);
    try {
      // Pass both the prompt and ingredients to the service
      const result = await geminiService.generateContent(prompt, ingredients);
      setResponse(result);
    } catch (error) {
      console.error('Error generating content:', error);
      setResponse('An error occurred while generating content.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecipeTypeChange = (e) => {
    const newType = e.target.value;
    setRecipeType(newType);
    
    // Update prompt with new recipe type
    if (ingredients.length > 0) {
      try {
        const newPrompt = createRecipePrompt(ingredients, newType);
        setPrompt(newPrompt);
      } catch (error) {
        console.error("Error creating recipe prompt:", error);
      }
    }
  };

  return (
    <div className="gemini-chat">
      <h1>Recipe Generator</h1>
      
      <div className="ingredients-summary">
        <h3>Available Ingredients: {ingredients.length}</h3>
        {ingredients.length > 0 ? (
          <p>Using {ingredients.length} ingredients from your pantry</p>
        ) : (
          <p>Please add ingredients in the form above first</p>
        )}
      </div>
      
      <div className="recipe-type-selector">
        <label htmlFor="recipeType">Recipe Type:</label>
        <select 
          id="recipeType" 
          value={recipeType} 
          onChange={handleRecipeTypeChange}
        >
          <option value="basicRecipeGenerator">Basic Recipes</option>
          <option value="quickMeals">Quick Meals (Under 30 min)</option>
          <option value="dietaryRestrictions">Dietary Restrictions</option>
          <option value="cuisineSpecific">Cuisine Specific</option>
          <option value="kidsFriendly">Kid-Friendly</option>
        </select>
      </div>
      
      <form onSubmit={handleSubmit}>

        <button type="submit" disabled={loading || ingredients.length === 0}>
          {loading ? 'Generating...' : 'Generate Recipes'}
        </button>
      </form>
      
      {response && (
        <div className="response">
          <h2>Your Recipes:</h2>
          <div className="recipe-content">
            {response.text ? (
              response.text.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              ))
            ) : (
              <p>{JSON.stringify(response)}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GeminiChat;