import React, { useState } from 'react';
import { subtractRecipeIngredients } from '../services/firebase/firestore';
import './RecipeViewer.css';
import { convertRecipeToUserUnits } from '../utils/unitConversions';
import ConversionIcon from './ConversionIcon';

function RecipeViewer({ recipe, onBack, onIngredientsUpdated, ingredients = [] }) {
  const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0);
  const [showCompletionConfirm, setShowCompletionConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const goToNextInstruction = () => {
    if (recipe && recipe.instructions && 
        currentInstructionIndex < recipe.instructions.length - 1) {
      setCurrentInstructionIndex(currentInstructionIndex + 1);
    } else if (currentInstructionIndex === recipe.instructions.length - 1) {
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
    if (!recipe) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Subtract used ingredients from inventory
      await subtractRecipeIngredients(recipe.ingredients);
      
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
        <h2>{recipe.name}</h2>
        
        {recipe.adjustedFor && (
          <div className="adjustment-notice">
            <p><strong>Note:</strong> {recipe.adjustedFor}</p>
          </div>
        )}
        
        <div className="recipe-overview">
          <p className="recipe-description">{recipe.description}</p>
          
          <div className="recipe-meta">
            <div className="meta-item">
              <span className="meta-label">Prep Time:</span> {recipe.prepTime}
            </div>
            <div className="meta-item">
              <span className="meta-label">Cook Time:</span> {recipe.cookTime}
            </div>
            <div className="meta-item">
              <span className="meta-label">Total Time:</span> {recipe.totalTime}
            </div>
            <div className="meta-item">
              <span className="meta-label">Servings:</span> {recipe.servings}
            </div>
            <div className="meta-item">
              <span className="meta-label">Difficulty:</span> {recipe.difficulty}
            </div>
          </div>
          
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="recipe-tags">
              {recipe.tags.map((tag, index) => (
                <span key={index} className="tag">{tag}</span>
              ))}
            </div>
          )}
          
          <h3>Ingredients</h3>
            <ul className="ingredients-list detailed">
              {(() => {
                const smartIngredients = convertRecipeToUserUnits(recipe.ingredients, ingredients);
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
                  Step {recipe.instructions[currentInstructionIndex].stepNumber}
                </span>
                <span className="step-duration">
                  {recipe.instructions[currentInstructionIndex].duration} min
                </span>
              </div>
              
              <p className="instruction-text">
                {recipe.instructions[currentInstructionIndex].instruction}
              </p>
              
              {recipe.instructions[currentInstructionIndex].tip && (
                <div className="instruction-tip">
                  <span className="tip-label">Tip:</span> {recipe.instructions[currentInstructionIndex].tip}
                </div>
              )}
              
              {/* Optional instruction meta - only show if present */}
              {((recipe.instructions[currentInstructionIndex].ingredients && 
                recipe.instructions[currentInstructionIndex].ingredients.length > 0) ||
                (recipe.instructions[currentInstructionIndex].equipment && 
                recipe.instructions[currentInstructionIndex].equipment.length > 0)) && (
                <div className="instruction-meta">
                  {recipe.instructions[currentInstructionIndex].ingredients && 
                    recipe.instructions[currentInstructionIndex].ingredients.length > 0 && (
                    <div className="instruction-ingredients">
                      <span className="meta-label">Ingredients: </span>
                      <span className="meta-value">{recipe.instructions[currentInstructionIndex].ingredients.join(', ')}</span>
                    </div>
                  )}
                  
                  {recipe.instructions[currentInstructionIndex].equipment && 
                    recipe.instructions[currentInstructionIndex].equipment.length > 0 && (
                    <div className="instruction-equipment">
                      <span className="meta-label">Equipment: </span>
                      <span className="meta-value">{recipe.instructions[currentInstructionIndex].equipment.join(', ')}</span>
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
                  {currentInstructionIndex + 1} of {recipe.instructions.length}
                </span>
                
                <button 
                  onClick={goToNextInstruction} 
                  disabled={false}
                  className="nav-button next"
                >
                  {currentInstructionIndex === recipe.instructions.length - 1 ? 'Complete Recipe' : 'Next'}
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
                  {recipe.ingredients.map((ing, idx) => (
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