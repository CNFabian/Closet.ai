import React, { useState, useEffect } from 'react';
import { getSavedRecipes } from '../services/firebase/firestore';
import { useAuth } from '../context/AuthContext';
import './savedRecipes.css';
import { convertRecipeToUserUnits, scaleRecipe } from '../utils/unitConversions';
import ConversionIcon from './ConversionIcon';
import { geminiService } from '../services/gemini/gemini';

function SavedRecipes({ onSelectRecipe, ingredients = [] }) {
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchSavedRecipes = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const recipes = await getSavedRecipes();
        setSavedRecipes(recipes);
        setError('');
      } catch (error) {
        console.error('Error fetching saved recipes:', error);
        if (error.message === 'User not authenticated') {
          setError('Please log in to view your saved recipes');
        } else {
          setError('Failed to load saved recipes');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSavedRecipes();
  }, [currentUser]);

  if (loading) {
    return <div className="loading-spinner">Loading saved recipes...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!currentUser) {
    return <div className="error-message">Please log in to view your saved recipes</div>;
  }

  if (savedRecipes.length === 0) {
    return (
      <div className="no-saved-recipes">
        <h2>No Saved Recipes Yet</h2>
        <p>Generate some recipes and save them to see them here!</p>
      </div>
    );
  }

  return (
    <div className="saved-recipes-container">
      <div className="saved-recipes">
        <h2>My Saved Recipes ({savedRecipes.length})</h2>
        <div className="recipe-grid">
          {savedRecipes.map((recipe) => (
            <SavedRecipeCard 
              key={recipe.id} 
              recipe={recipe} 
              onSelectRecipe={onSelectRecipe}
              ingredients={ingredients}
            />
          ))}
        </div>
      </div>
    </div>
  );

  function SavedRecipeCard({ recipe, onSelectRecipe, ingredients }) {
    const [adjustedServings, setAdjustedServings] = useState(recipe.servings || 4);
    const [isAdjusting, setIsAdjusting] = useState(false);
    const [adjustmentError, setAdjustmentError] = useState('');

    const handleSelectRecipe = async () => {
      if (adjustedServings !== recipe.servings) {
        // Need to use AI to adjust recipe for new serving size
        setIsAdjusting(true);
        setAdjustmentError('');
        
        try {
          const adjustedRecipe = await geminiService.adjustRecipeServings(recipe, adjustedServings);
          onSelectRecipe(adjustedRecipe);
        } catch (error) {
          console.error('Error adjusting recipe:', error);
          setAdjustmentError('Failed to adjust recipe. Using simple scaling instead.');
          
          // Fallback to simple scaling if AI adjustment fails
          const scaledRecipe = scaleRecipe(recipe, adjustedServings);
          onSelectRecipe(scaledRecipe);
        } finally {
          setIsAdjusting(false);
        }
      } else {
        // Use original recipe
        onSelectRecipe(recipe);
      }
    };

    return (
      <div className="recipe-card">
        <div className="recipe-card-content" onClick={handleSelectRecipe}>
          <h3>{recipe.name}</h3>
          <p className="recipe-description">{recipe.description}</p>
          <div className="recipe-meta">
            <span className="difficulty">{recipe.difficulty}</span>
            <span className="time">{recipe.totalTime}</span>
            <span className="servings">{adjustedServings} servings</span>
          </div>
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="recipe-tags">
              {recipe.tags.slice(0, 3).map((tag, index) => (
                <span key={index} className="tag">{tag}</span>
              ))}
              {recipe.tags.length > 3 && (
                <span className="tag more">+{recipe.tags.length - 3} more</span>
              )}
            </div>
          )}
          {recipe.savedAt && (
            <div className="saved-date">
              Saved {recipe.savedAt.toDate ? 
                recipe.savedAt.toDate().toLocaleDateString() : 
                new Date(recipe.savedAt).toLocaleDateString()}
            </div>
          )}
          
          {/* Show loading state when adjusting */}
          {isAdjusting && (
            <div className="adjusting-indicator">
              Adjusting recipe for {adjustedServings} servings...
            </div>
          )}
          
          {/* Show error if adjustment failed */}
          {adjustmentError && (
            <div className="adjustment-error">
              {adjustmentError}
            </div>
          )}
        </div>
        
        {/* Serving size adjustment */}
        <div className="serving-adjustment" onClick={e => e.stopPropagation()}>
          <label htmlFor={`servings-${recipe.id}`}>
            Servings: <span className="servings-display">{adjustedServings}</span>
          </label>
          <input
            type="range"
            id={`servings-${recipe.id}`}
            min="1"
            max="12"
            value={adjustedServings}
            onChange={(e) => setAdjustedServings(parseInt(e.target.value))}
            className="servings-slider small"
            disabled={isAdjusting}
          />
          <div className="slider-range small">
            <span>1</span>
            <span>12</span>
          </div>
          {adjustedServings !== recipe.servings && (
            <div className="adjustment-note">
              Will be AI-adjusted from {recipe.servings} servings
            </div>
          )}
        </div>
      </div>
    );
  }

}

export default SavedRecipes;