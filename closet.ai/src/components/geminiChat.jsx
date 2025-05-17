import React, { useState, useEffect } from 'react';
import { geminiService } from '../services/gemini/gemini';

// Steps in the recipe generation process
const STEPS = {
  SELECT_MEAL_TYPE: 0,
  RECIPE_SUGGESTIONS: 1,
  SELECT_RECIPE: 2,
  RECIPE_DETAILS: 3,
  RECIPE_INSTRUCTIONS: 4
};

function GeminiChat({ ingredients = [] }) {
  // State for the multi-step process
  const [currentStep, setCurrentStep] = useState(STEPS.SELECT_MEAL_TYPE);
  const [mealType, setMealType] = useState('');
  const [recipeOptions, setRecipeOptions] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState('');
  const [recipeData, setRecipeData] = useState(null);
  const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [rawResponse, setRawResponse] = useState('');  // For debugging

  // Parse recipe suggestions into an array of names
  const parseRecipeSuggestions = (text) => {
    if (!text) return [];
    
    const recipes = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      // Look for lines that start with a number followed by a dot or period
      const match = line.match(/^\s*(\d+)[\.\)]\s*(.+)/);
      if (match && match[2].trim()) {
        recipes.push(match[2].trim());
      }
    }
    
    return recipes;
  };

  // Step 1: Get recipe suggestions based on meal type
  const handleMealTypeSubmit = async (e) => {
    e.preventDefault();
    if (!mealType.trim()) {
      setError('Please enter a meal type');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const result = await geminiService.getRecipeSuggestions(ingredients, mealType, temperature);
      const parsedRecipes = parseRecipeSuggestions(result.text);
      
      // Make sure we got some recipes
      if (parsedRecipes.length === 0) {
        throw new Error('No recipe suggestions were found. Please try again.');
      }
      
      setRecipeOptions(parsedRecipes);
      setCurrentStep(STEPS.SELECT_RECIPE);
    } catch (error) {
      console.error('Error getting recipe suggestions:', error);
      setError(error.message || 'Failed to get recipe suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Get detailed recipe instructions for the selected recipe
  const handleRecipeSelect = async (recipe) => {
    setSelectedRecipe(recipe);
    setLoading(true);
    setError('');
    
    try {
      const result = await geminiService.getRecipeDetails(recipe, ingredients, temperature);
      
      // Store the raw response for debugging
      if (result.text) {
        setRawResponse(result.text);
      }
      
      // Check if we have parsed JSON
      if (result.json && result.json.recipe) {
        setRecipeData(result.json.recipe);
        setCurrentStep(STEPS.RECIPE_DETAILS);
        setCurrentInstructionIndex(0); // Reset to first instruction
      } else {
        // We didn't get valid JSON, show an error
        throw new Error('Failed to get recipe details in the correct format. Please try again.');
      }
    } catch (error) {
      console.error('Error getting recipe details:', error);
      setError(error.message || 'Failed to get recipe details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Navigation for step-by-step instructions
  const goToNextInstruction = () => {
    if (recipeData && recipeData.instructions && 
        currentInstructionIndex < recipeData.instructions.length - 1) {
      setCurrentInstructionIndex(currentInstructionIndex + 1);
    } else if (currentInstructionIndex === recipeData.instructions.length - 1) {
      // If we're at the last instruction, move to a completion screen
      setCurrentStep(STEPS.RECIPE_INSTRUCTIONS);
    }
  };

  const goToPreviousInstruction = () => {
    if (currentInstructionIndex > 0) {
      setCurrentInstructionIndex(currentInstructionIndex - 1);
    }
  };

  // Reset to start over
  const handleRestart = () => {
    setCurrentStep(STEPS.SELECT_MEAL_TYPE);
    setMealType('');
    setRecipeOptions([]);
    setSelectedRecipe('');
    setRecipeData(null);
    setCurrentInstructionIndex(0);
    setError('');
    setRawResponse('');
  };

  // Back button logic
  const handleBack = () => {
    if (currentStep === STEPS.SELECT_RECIPE) {
      setCurrentStep(STEPS.SELECT_MEAL_TYPE);
    } else if (currentStep === STEPS.RECIPE_DETAILS || currentStep === STEPS.RECIPE_INSTRUCTIONS) {
      setCurrentStep(STEPS.SELECT_RECIPE);
      setRecipeData(null);
    }
  };

  return (
    <div className="gemini-chat">
      <h1>Recipe Finder</h1>
      
      {/* Ingredients summary */}
      <div className="ingredients-summary">
        <h3>Available Ingredients: {ingredients ? ingredients.length : 0}</h3>
        {ingredients && ingredients.length > 0 ? (
          <div className="ingredients-list">
            {ingredients.map((ing, idx) => (
              <span key={`ing-${idx}`} className="ingredient-tag">
                {ing.name}
              </span>
            ))}
          </div>
        ) : (
          <p>Please add ingredients in the form above first</p>
        )}
      </div>
      
      {/* Temperature control */}
      <div className="temperature-control">
        <label>
          Creativity: {temperature.toFixed(1)}
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.1" 
            value={temperature} 
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
          />
        </label>
        <small>Low: Consistent results | High: Creative results</small>
      </div>
      
      {/* Error message */}
      {error && <div className="error-message">{error}</div>}
      
      {/* Step 1: Meal Type Selection */}
      {currentStep === STEPS.SELECT_MEAL_TYPE && (
        <div className="step meal-type-selection">
          <h2>What type of meal are you looking for?</h2>
          <form onSubmit={handleMealTypeSubmit}>
            <input
              type="text"
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
              placeholder="e.g., breakfast, dinner, dessert, pasta dish, etc."
              disabled={loading}
              required
            />
            <button type="submit" disabled={loading || ingredients.length === 0}>
              {loading ? 'Loading...' : 'Find Recipes'}
            </button>
          </form>
        </div>
      )}
      
      {/* Step 2: Recipe Selection */}
      {currentStep === STEPS.SELECT_RECIPE && (
        <div className="step recipe-selection">
          <h2>Choose a Recipe to Make</h2>
          <p>Based on your ingredients, here are some {mealType} ideas:</p>
          <div className="recipe-options">
            {recipeOptions.map((recipe, index) => (
              <button
                key={index}
                className="recipe-option"
                onClick={() => handleRecipeSelect(recipe)}
                disabled={loading}
              >
                {recipe}
              </button>
            ))}
          </div>
          <button className="back-button" onClick={handleBack} disabled={loading}>
            Back
          </button>
        </div>
      )}
      
      {/* Step 3: Recipe Overview */}
      {currentStep === STEPS.RECIPE_DETAILS && recipeData && (
        <div className="step recipe-details">
          <h2>{recipeData.name}</h2>
          
          <div className="recipe-overview">
            <p className="recipe-description">{recipeData.description}</p>
            
            <div className="recipe-meta">
              <div className="meta-item">
                <span className="meta-label">Prep Time:</span> {recipeData.prepTime}
              </div>
              <div className="meta-item">
                <span className="meta-label">Cook Time:</span> {recipeData.cookTime}
              </div>
              <div className="meta-item">
                <span className="meta-label">Total Time:</span> {recipeData.totalTime}
              </div>
              <div className="meta-item">
                <span className="meta-label">Servings:</span> {recipeData.servings}
              </div>
              <div className="meta-item">
                <span className="meta-label">Difficulty:</span> {recipeData.difficulty}
              </div>
            </div>
            
            {recipeData.tags && recipeData.tags.length > 0 && (
              <div className="recipe-tags">
                {recipeData.tags.map((tag, index) => (
                  <span key={index} className="tag">{tag}</span>
                ))}
              </div>
            )}
            
            <h3>Ingredients</h3>
            <ul className="ingredients-list detailed">
              {recipeData.ingredients.map((ingredient, index) => (
                <li key={index} className="ingredient-item">
                  <span className="ingredient-quantity">{ingredient.quantity} {ingredient.unit}</span>
                  <span className="ingredient-name">{ingredient.name}</span>
                  {ingredient.preparation && (
                    <span className="ingredient-prep">, {ingredient.preparation}</span>
                  )}
                </li>
              ))}
            </ul>
            
            <h3>Instructions</h3>
            <div className="step-by-step-container">
              <div className="instruction-card">
                <div className="instruction-header">
                  <span className="step-number">Step {recipeData.instructions[currentInstructionIndex].stepNumber}</span>
                  <span className="step-duration">{recipeData.instructions[currentInstructionIndex].duration} min</span>
                </div>
                
                <p className="instruction-text">
                  {recipeData.instructions[currentInstructionIndex].instruction}
                </p>
                
                {recipeData.instructions[currentInstructionIndex].tip && (
                  <div className="instruction-tip">
                    <span className="tip-label">Tip:</span> {recipeData.instructions[currentInstructionIndex].tip}
                  </div>
                )}
                
                <div className="instruction-meta">
                  {recipeData.instructions[currentInstructionIndex].ingredients && 
                   recipeData.instructions[currentInstructionIndex].ingredients.length > 0 && (
                    <div className="instruction-ingredients">
                      <span className="meta-label">Ingredients:</span>
                      <span className="meta-value">{recipeData.instructions[currentInstructionIndex].ingredients.join(', ')}</span>
                    </div>
                  )}
                  
                  {recipeData.instructions[currentInstructionIndex].equipment && 
                   recipeData.instructions[currentInstructionIndex].equipment.length > 0 && (
                    <div className="instruction-equipment">
                      <span className="meta-label">Equipment:</span>
                      <span className="meta-value">{recipeData.instructions[currentInstructionIndex].equipment.join(', ')}</span>
                    </div>
                  )}
                </div>
                
                <div className="step-navigation">
                  <button 
                    onClick={goToPreviousInstruction} 
                    disabled={currentInstructionIndex === 0}
                    className="nav-button prev"
                  >
                    Previous
                  </button>
                  
                  <span className="step-indicator">
                    {currentInstructionIndex + 1} of {recipeData.instructions.length}
                  </span>
                  
                  <button 
                    onClick={goToNextInstruction} 
                    disabled={currentInstructionIndex === recipeData.instructions.length - 1}
                    className="nav-button next"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="navigation-buttons">
            <button className="back-button" onClick={handleBack} disabled={loading}>
              Back to Recipes
            </button>
            <button className="restart-button" onClick={handleRestart} disabled={loading}>
              Start Over
            </button>
          </div>
        </div>
      )}
      
      {/* Step 4: Recipe Complete */}
      {currentStep === STEPS.RECIPE_INSTRUCTIONS && recipeData && (
        <div className="step recipe-complete">
          <h2>Recipe Complete!</h2>
          <p>You've finished all the steps for {recipeData.name}.</p>
          <p>Enjoy your meal!</p>
          
          <div className="navigation-buttons">
            <button className="back-button" onClick={() => setCurrentStep(STEPS.RECIPE_DETAILS)}>
              Review Recipe
            </button>
            <button className="restart-button" onClick={handleRestart}>
              Find Another Recipe
            </button>
          </div>
        </div>
      )}
      
      {/* Loading indicator */}
      {loading && <div className="loading-spinner">Loading...</div>}
      
      {/* Raw response for debugging - you can remove this in production */}
      {rawResponse && (
        <div className="debug-section" style={{display: 'none'}}>
          <h3>Raw Response (Debug)</h3>
          <pre>{rawResponse}</pre>
        </div>
      )}
    </div>
  );
}

export default GeminiChat;