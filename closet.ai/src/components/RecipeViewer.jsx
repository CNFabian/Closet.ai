import React, { useState } from 'react';
import { subtractRecipeIngredients } from '../services/firebase/firestore';
import './RecipeViewer.css';
import { convertToRecipeDisplay, scaleRecipe  } from '../utils/unitConversions';
import ConversionIcon from './ConversionIcon';

function RecipeViewer({ recipe, onBack, onIngredientsUpdated, ingredients = [] }) {
  const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0);
  const [showCompletionConfirm, setShowCompletionConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scaledRecipe, setScaledRecipe] = useState(recipe);

  const goToNextInstruction = () => {
    if (scaledRecipe && scaledRecipe.instructions && 
        currentInstructionIndex < scaledRecipe.instructions.length - 1) {
      setCurrentInstructionIndex(currentInstructionIndex + 1);
    } else if (currentInstructionIndex === scaledRecipe.instructions.length - 1) {
      // We're on the last step, show completion confirmation
      setShowCompletionConfirm(true);
    }
  };

  const goToPreviousInstruction = () => {
    if (currentInstructionIndex > 0) {
      setCurrentInstructionIndex(currentInstructionIndex - 1);
    }
  };

  const handleCompleteRecipe = async () => {
    if (!scaledRecipe) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Subtract used ingredients from inventory using scaled amounts
      await subtractRecipeIngredients(scaledRecipe.ingredients);
      
      setShowCompletionConfirm(false);
      
      // Notify parent component to refresh ingredients if callback provided
      if (onIngredientsUpdated) {
        onIngredientsUpdated();
      }
      
      // Show success message and optionally go back
      alert('Recipe completed! Your ingredient inventory has been updated.');
      
    } catch (error) {
      console.error('Error updating inventory:', error);
      setError('Failed to update inventory. Please check your ingredient quantities manually.');
      // Still close the modal even if there's an error
      setShowCompletionConfirm(false);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="recipe-viewer-container">
      <div className="step recipe-details">
        <h2>{scaledRecipe.name}</h2>
        
        {/* Serving Size Adjustment */}
        <div className="serving-size-controls">
          <label htmlFor="servings-input">
            Adjust serving size: 
            <input 
              type="number" 
              id="servings-input"
              min="1" 
              max="20" 
              value={scaledRecipe.servings} 
              onChange={(e) => {
                const newServings = parseInt(e.target.value) || 1;
                const newScaledRecipe = scaleRecipe(recipe, newServings);
                setScaledRecipe(newScaledRecipe);
              }}
            />
            {scaledRecipe.isScaled && (
              <span className="scale-indicator">
                (scaled from {scaledRecipe.scaledFrom} servings)
              </span>
            )}
          </label>
        </div>
        
        {scaledRecipe.adjustedFor && (
          <div className="adjustment-notice">
            <p><strong>Note:</strong> {scaledRecipe.adjustedFor}</p>
          </div>
        )}
        
        <div className="recipe-overview">
          <p className="recipe-description">{scaledRecipe.description}</p>
          
          <div className="recipe-meta">
            <div className="meta-item">
              <span className="meta-label">Prep Time:</span> {scaledRecipe.prepTime}
            </div>
            <div className="meta-item">
              <span className="meta-label">Cook Time:</span> {scaledRecipe.cookTime}
            </div>
            <div className="meta-item">
              <span className="meta-label">Total Time:</span> {scaledRecipe.totalTime}
            </div>
            <div className="meta-item">
              <span className="meta-label">Servings:</span> {scaledRecipe.servings}
            </div>
            <div className="meta-item">
              <span className="meta-label">Difficulty:</span> {scaledRecipe.difficulty}
            </div>
          </div>
          
          {scaledRecipe.tags && scaledRecipe.tags.length > 0 && (
            <div className="recipe-tags">
              {scaledRecipe.tags.map((tag, index) => (
                <span key={index} className="tag">{tag}</span>
              ))}
            </div>
          )}
          
          <h3>Ingredients</h3>
            <ul className="ingredients-list detailed">
              {(() => {
                const smartIngredients = scaledRecipe.ingredients.map(ing => convertToRecipeDisplay(ing, ingredients));
                return smartIngredients.map((ingredient, index) => (
                  <li key={index} className="ingredient-item">
                    <span className="ingredient-quantity">
                      {ingredient.displayQuantity} {ingredient.displayUnit}
                      {ingredient.isConverted && (
                        <span className="conversion-indicator" title={`Originally ${ingredient.originalQuantity} ${ingredient.originalUnit}`}>
                          ✓
                        </span>
                      )}
                    </span>
                    {' '}
                    <span className="ingredient-name">{ingredient.name}</span>
                    {ingredient.preparation && (
                      <span className="ingredient-prep">, {ingredient.preparation}</span>
                    )}
                    {(ingredient.hasConversion || ingredient.isConverted) && (
                      <ConversionIcon
                        quantity={ingredient.displayQuantity}
                        unit={ingredient.displayUnit}
                        ingredientName={ingredient.name}
                        isConverted={ingredient.isConverted}
                        originalQuantity={ingredient.originalQuantity}
                        originalUnit={ingredient.originalUnit}
                        userHasAmount={ingredient.userHasAmount}
                        userUnit={ingredient.isConverted ? ingredient.displayUnit : ingredient.userUnit}
                      />
                    )}
                  </li>
                ));
              })()}
            </ul>
          
          <h3>Instructions</h3>
          <div className="step-by-step-container">
            <div className="instruction-card">
              <div className="instruction-header">
                <span className="step-number">
                  Step {scaledRecipe.instructions[currentInstructionIndex].stepNumber}
                </span>
                <span className="step-duration">
                  {scaledRecipe.instructions[currentInstructionIndex].duration} min
                </span>
              </div>
              
              <p className="instruction-text">
                {scaledRecipe.instructions[currentInstructionIndex].instruction}
              </p>
              
              {scaledRecipe.instructions[currentInstructionIndex].tip && (
                <div className="instruction-tip">
                  <span className="tip-label">Tip:</span> {scaledRecipe.instructions[currentInstructionIndex].tip}
                </div>
              )}
              
              {/* Optional instruction meta - only show if present */}
              {((scaledRecipe.instructions[currentInstructionIndex].ingredients && 
                scaledRecipe.instructions[currentInstructionIndex].ingredients.length > 0) ||
                (scaledRecipe.instructions[currentInstructionIndex].equipment && 
                scaledRecipe.instructions[currentInstructionIndex].equipment.length > 0)) && (
                <div className="instruction-meta">
                  {scaledRecipe.instructions[currentInstructionIndex].ingredients && 
                    scaledRecipe.instructions[currentInstructionIndex].ingredients.length > 0 && (
                    <div className="instruction-ingredients">
                      <span className="meta-label">Ingredients: </span>
                      <span className="meta-value">{scaledRecipe.instructions[currentInstructionIndex].ingredients.join(', ')}</span>
                    </div>
                  )}
                  
                  {scaledRecipe.instructions[currentInstructionIndex].equipment && 
                    scaledRecipe.instructions[currentInstructionIndex].equipment.length > 0 && (
                    <div className="instruction-equipment">
                      <span className="meta-label">Equipment: </span>
                      <span className="meta-value">{scaledRecipe.instructions[currentInstructionIndex].equipment.join(', ')}</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="step-navigation">
                <button 
                  onClick={goToPreviousInstruction} 
                  disabled={currentInstructionIndex === 0}
                  className="nav-button prev"
                >
                  Previous
                </button>
                
                <span className="step-indicator">
                  {currentInstructionIndex + 1} of {scaledRecipe.instructions.length}
                </span>
                
                <button 
                  onClick={goToNextInstruction} 
                  disabled={false}
                  className="nav-button next"
                >
                  {currentInstructionIndex === scaledRecipe.instructions.length - 1 ? 'Complete Recipe' : 'Next'}
                </button>
              </div>
            </div>
          </div>
          </div>
        
        <div className="navigation-buttons">
          <button className="back-button" onClick={onBack}>
            Back to Saved Recipes
          </button>
          {/* You can add additional buttons here like in geminiChat */}
        </div>
        
        {/* Recipe Completion Confirmation - same as geminiChat but simplified */}
        {showCompletionConfirm && (
          <div className="recipe-completion-overlay">
            <div className="recipe-completion">
              <h3>Complete Recipe and Update Inventory?</h3>
              <p>You've completed all steps! This will subtract the used ingredients from your pantry.</p>
              
            <div className="ingredients-used">
              <h4>Ingredients to be subtracted:</h4>
              <ul>
                {scaledRecipe.ingredients.map((ing, idx) => (
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
          </div>
        )}
      </div>
    </div>
  );
}

export default RecipeViewer;