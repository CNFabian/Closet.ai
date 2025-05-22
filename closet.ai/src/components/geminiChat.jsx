import React, { useState, useEffect } from 'react';
import { geminiService } from '../services/gemini/gemini';
import { saveRecipe, validateRecipeIngredients, subtractRecipeIngredients } from '../services/firebase/firestore';

const STEPS = {
  SELECT_MEAL_TYPE: 0,
  RECIPE_SUGGESTIONS: 1,
  SELECT_RECIPE: 2,
  RECIPE_VALIDATION: 3,
  RECIPE_DETAILS: 4,
  RECIPE_COMPLETION: 5
};

function GeminiChat({ ingredients = [] }) {
  // State for the multi-step process
  const [currentStep, setCurrentStep] = useState(STEPS.SELECT_MEAL_TYPE);
  const [mealType, setMealType] = useState('');
  const [recipeOptions, setRecipeOptions] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState('');
  const [recipeData, setRecipeData] = useState(null);
  const [recipeValidation, setRecipeValidation] = useState(null);
  const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [showCompletionConfirm, setShowCompletionConfirm] = useState(false);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Calculate recipe progress
  const getRecipeProgress = () => {
    if (!recipeData || !recipeData.instructions) return 0;
    return Math.round((completedSteps.size / recipeData.instructions.length) * 100);
  };

  // Handle saving recipes
  const handleSaveRecipe = async () => {
    if (!recipeData) return;
    
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const recipeToSave = {
        name: recipeData.name,
        description: recipeData.description,
        prepTime: recipeData.prepTime,
        cookTime: recipeData.cookTime,
        totalTime: recipeData.totalTime,
        servings: recipeData.servings,
        difficulty: recipeData.difficulty,
        ingredients: recipeData.ingredients,
        instructions: recipeData.instructions,
        tags: recipeData.tags || [],
        adjustedFor: recipeData.adjustedFor || null
      };
      
      await saveRecipe(recipeToSave);
      setSaveMessage('Recipe saved successfully!');
    } catch (error) {
      console.error('Error saving recipe:', error);
      setSaveMessage('Failed to save recipe. Please try again.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  // Parse recipe suggestions
  const parseRecipeSuggestions = (text) => {
    if (!text) return [];
    
    const recipes = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^\s*(\d+)[\.\)]\s*(.+)/);
      if (match && match[2].trim()) {
        recipes.push(match[2].trim());
      }
    }
    
    return recipes;
  };

  // Step 1: Get recipe suggestions
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

  // Step 2: Validate and get recipe details
  const handleRecipeSelect = async (recipe) => {
    setSelectedRecipe(recipe);
    setLoading(true);
    setError('');
    
    try {
      // First validate that we can make this recipe with available ingredients
      setCurrentStep(STEPS.RECIPE_VALIDATION);
      
      const result = await geminiService.getRecipeDetails(recipe, ingredients, temperature);
      
      if (result.json && result.json.recipe) {
        // Validate the recipe against available ingredients
        const validation = await validateRecipeIngredients(result.json.recipe.ingredients);
        setRecipeValidation(validation);
        
        if (validation.canMake) {
          setRecipeData(result.json.recipe);
          setCurrentStep(STEPS.RECIPE_DETAILS);
          setCurrentInstructionIndex(0);
          setCompletedSteps(new Set());
        } else {
          // Show validation issues but still allow user to proceed if they want
          setRecipeData(result.json.recipe);
          setCurrentStep(STEPS.RECIPE_VALIDATION);
        }
      } else {
        throw new Error('Failed to get recipe details in the correct format. Please try again.');
      }
    } catch (error) {
      console.error('Error getting recipe details:', error);
      setError(error.message || 'Failed to get recipe details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Proceed with recipe despite validation issues
  const proceedWithRecipe = () => {
    setCurrentStep(STEPS.RECIPE_DETAILS);
    setCurrentInstructionIndex(0);
    setCompletedSteps(new Set());
  };

  // Mark step as complete
  const markStepComplete = () => {
    const newCompleted = new Set(completedSteps);
    newCompleted.add(currentInstructionIndex);
    setCompletedSteps(newCompleted);
    
    // If all steps are completed, show completion confirmation
    if (newCompleted.size === recipeData.instructions.length) {
      setShowCompletionConfirm(true);
    }
  };

  // Navigation for instructions
  const goToNextInstruction = () => {
    if (recipeData && recipeData.instructions && 
        currentInstructionIndex < recipeData.instructions.length - 1) {
      setCurrentInstructionIndex(currentInstructionIndex + 1);
    }
  };

  const goToPreviousInstruction = () => {
    if (currentInstructionIndex > 0) {
      setCurrentInstructionIndex(currentInstructionIndex - 1);
    }
  };

  // Complete recipe and update inventory
  const handleCompleteRecipe = async () => {
    if (!recipeData) return;
    
    setLoading(true);
    
    try {
      // Subtract used ingredients from inventory
      await subtractRecipeIngredients(recipeData.ingredients);
      
      setCurrentStep(STEPS.RECIPE_COMPLETION);
      setShowCompletionConfirm(false);
      
      // You might want to refresh ingredients in parent component
      // if (onIngredientsUpdated) onIngredientsUpdated();
      
    } catch (error) {
      console.error('Error updating inventory:', error);
      setError('Failed to update inventory. Please check your ingredient quantities manually.');
    } finally {
      setLoading(false);
    }
  };

  // Reset everything
  const handleRestart = () => {
    setCurrentStep(STEPS.SELECT_MEAL_TYPE);
    setMealType('');
    setRecipeOptions([]);
    setSelectedRecipe('');
    setRecipeData(null);
    setRecipeValidation(null);
    setCurrentInstructionIndex(0);
    setCompletedSteps(new Set());
    setShowCompletionConfirm(false);
    setError('');
  };

  // Back button logic
  const handleBack = () => {
    if (currentStep === STEPS.SELECT_RECIPE) {
      setCurrentStep(STEPS.SELECT_MEAL_TYPE);
    } else if (currentStep === STEPS.RECIPE_VALIDATION || 
               currentStep === STEPS.RECIPE_DETAILS || 
               currentStep === STEPS.RECIPE_COMPLETION) {
      setCurrentStep(STEPS.SELECT_RECIPE);
      setRecipeData(null);
      setRecipeValidation(null);
      setCompletedSteps(new Set());
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
                {ing.name} ({ing.quantity} {ing.unit})
              </span>
            ))}
          </div>
        ) : (
          <p>Please add ingredients with quantities first</p>
        )}
      </div>
      
      {/* Progress indicator for recipe */}
      {currentStep >= STEPS.RECIPE_DETAILS && recipeData && (
        <div className="recipe-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${getRecipeProgress()}%` }}
            ></div>
          </div>
          <div className="progress-text">
            Recipe Progress: {completedSteps.size} of {recipeData.instructions.length} steps completed
          </div>
        </div>
      )}
      
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
          <p>Based on your available ingredients, here are some {mealType} ideas:</p>
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
      
      {/* Step 3: Recipe Validation */}
      {currentStep === STEPS.RECIPE_VALIDATION && recipeValidation && (
        <div className="step recipe-validation">
          <h2>Recipe Validation: {selectedRecipe}</h2>
          
          <div className={`recipe-validation ${recipeValidation.canMake ? 'can-make' : 'cannot-make'}`}>
            {recipeValidation.canMake ? (
              <div>
                <h3>✅ You can make this recipe!</h3>
                <p>All required ingredients are available in sufficient quantities.</p>
              </div>
            ) : (
              <div>
                <h3>⚠️ Recipe Adjustments Needed</h3>
                <p>There are some issues with ingredient availability:</p>
                
                <div className="validation-issues">
                  {recipeValidation.missingIngredients.length > 0 && (
                    <div>
                      <h4>Missing Ingredients:</h4>
                      <ul>
                        {recipeValidation.missingIngredients.map((ing, idx) => (
                          <li key={idx}>{ing.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {recipeValidation.insufficientIngredients.length > 0 && (
                    <div>
                      <h4>Insufficient Quantities:</h4>
                      <ul>
                        {recipeValidation.insufficientIngredients.map((ing, idx) => (
                          <li key={idx}>
                            {ing.name}: need {ing.required} {ing.unit}, have {ing.available} {ing.unit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="navigation-buttons">
            <button className="back-button" onClick={handleBack}>
              Choose Different Recipe
            </button>
            {recipeValidation.canMake ? (
              <button className="confirm-button" onClick={proceedWithRecipe}>
                Start Cooking!
              </button>
            ) : (
              <button className="confirm-button" onClick={proceedWithRecipe}>
                Proceed Anyway
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Step 4: Recipe Details and Instructions */}
      {currentStep === STEPS.RECIPE_DETAILS && recipeData && (
        <div className="step recipe-details">
          <h2>{recipeData.name}</h2>
          
          {recipeData.adjustedFor && (
            <div className="adjustment-notice">
              <p><strong>Note:</strong> {recipeData.adjustedFor}</p>
            </div>
          )}
          
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
            
            <h3>Ingredients</h3>
            <ul className="ingredients-list detailed">
              {recipeData.ingredients.map((ingredient, index) => (
                <li key={index} className="ingredient-item">
                  <span className="ingredient-quantity">
                    {ingredient.quantity} {ingredient.unit}
                  </span>
                  {' '}
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
                  <span className="step-number">
                    Step {recipeData.instructions[currentInstructionIndex].stepNumber}
                    {completedSteps.has(currentInstructionIndex) && ' ✅'}
                  </span>
                  <span className="step-duration">
                    {recipeData.instructions[currentInstructionIndex].duration} min
                  </span>
                </div>
                
                <p className="instruction-text">
                  {recipeData.instructions[currentInstructionIndex].instruction}
                </p>
                
                {recipeData.instructions[currentInstructionIndex].tip && (
                  <div className="instruction-tip">
                    <span className="tip-label">Tip:</span> {recipeData.instructions[currentInstructionIndex].tip}
                  </div>
                )}
                
                <div className="step-actions">
                  <button 
                    onClick={markStepComplete}
                    disabled={completedSteps.has(currentInstructionIndex)}
                    className="complete-step-button"
                  >
                    {completedSteps.has(currentInstructionIndex) ? 'Step Completed ✅' : 'Mark as Complete'}
                  </button>
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
            <button 
              className="save-button" 
              onClick={handleSaveRecipe} 
              disabled={isSaving || loading}
            >
              {isSaving ? 'Saving...' : 'Save Recipe'}
            </button>
            <button className="restart-button" onClick={handleRestart} disabled={loading}>
              Start Over
            </button>
          </div>

          {saveMessage && (
            <div className={`save-message ${saveMessage.includes('Failed') ? 'error' : 'success'}`}>
              {saveMessage}
            </div>
          )}
        </div>
      )}
      
      {/* Recipe Completion Confirmation */}
      {showCompletionConfirm && (
        <div className="recipe-completion">
          <h3>Complete Recipe and Update Inventory?</h3>
          <p>You've completed all steps! This will subtract the used ingredients from your pantry.</p>
          
          <div className="ingredients-used">
            <h4>Ingredients to be subtracted:</h4>
            <ul>
              {recipeData.ingredients.map((ing, idx) => (
                <li key={idx}>
                  {ing.quantity} {ing.unit} {ing.name}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="completion-buttons">
            <button 
              className="cancel-button" 
              onClick={() => setShowCompletionConfirm(false)}
            >
              Cancel
            </button>
            <button 
              className="confirm-button" 
              onClick={handleCompleteRecipe}
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Complete Recipe'}
            </button>
          </div>
        </div>
      )}
      
      {/* Step 5: Recipe Completed */}
      {currentStep === STEPS.RECIPE_COMPLETION && (
        <div className="step recipe-complete">
          <h2>🎉 Recipe Complete!</h2>
          <p>Congratulations! You've successfully made {recipeData?.name}.</p>
          <p>Your ingredient inventory has been updated to reflect what you used.</p>
          
          <div className="navigation-buttons">
            <button className="restart-button" onClick={handleRestart}>
              Make Another Recipe
            </button>
          </div>
        </div>
      )}
      
      {/* Loading indicator */}
      {loading && <div className="loading-spinner">Loading...</div>}
    </div>
  );
}

export default GeminiChat;