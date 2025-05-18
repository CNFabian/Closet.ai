import React, { useState } from 'react';

function RecipeViewer({ recipe, onBack }) {
  const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0);

  const goToNextInstruction = () => {
    if (recipe && recipe.instructions && 
        currentInstructionIndex < recipe.instructions.length - 1) {
      setCurrentInstructionIndex(currentInstructionIndex + 1);
    }
  };

  const goToPreviousInstruction = () => {
    if (currentInstructionIndex > 0) {
      setCurrentInstructionIndex(currentInstructionIndex - 1);
    }
  };

  if (!recipe) {
    return null;
  }

  return (
    <div className="step recipe-details">
      <h2>{recipe.name}</h2>
      
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
          {recipe.ingredients.map((ingredient, index) => (
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
              <span className="step-number">Step {recipe.instructions[currentInstructionIndex].stepNumber}</span>
              <span className="step-duration">{recipe.instructions[currentInstructionIndex].duration} min</span>
            </div>
            
            <p className="instruction-text">
              {recipe.instructions[currentInstructionIndex].instruction}
            </p>
            
            {recipe.instructions[currentInstructionIndex].tip && (
              <div className="instruction-tip">
                <span className="tip-label">Tip:</span> {recipe.instructions[currentInstructionIndex].tip}
              </div>
            )}
            
            <div className="instruction-meta">
              {recipe.instructions[currentInstructionIndex].ingredients && 
                recipe.instructions[currentInstructionIndex].ingredients.length > 0 && (
                <div className="instruction-ingredients">
                  <span className="meta-label">Ingredients:</span>
                  <span className="meta-value">{recipe.instructions[currentInstructionIndex].ingredients.join(', ')}</span>
                </div>
              )}
              
              {recipe.instructions[currentInstructionIndex].equipment && 
                recipe.instructions[currentInstructionIndex].equipment.length > 0 && (
                <div className="instruction-equipment">
                  <span className="meta-label">Equipment:</span>
                  <span className="meta-value">{recipe.instructions[currentInstructionIndex].equipment.join(', ')}</span>
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
                {currentInstructionIndex + 1} of {recipe.instructions.length}
              </span>
              
              <button 
                onClick={goToNextInstruction} 
                disabled={currentInstructionIndex === recipe.instructions.length - 1}
                className="nav-button next"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <button className="back-button" onClick={onBack}>
        Back to Saved Recipes
      </button>
    </div>
  );
}

export default RecipeViewer;