import React, { useState, useEffect } from 'react';
import { getSavedRecipes } from '../services/firebase/firestore';

function SavedRecipes({ onSelectRecipe }) {
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSavedRecipes = async () => {
      try {
        setLoading(true);
        const recipes = await getSavedRecipes();
        setSavedRecipes(recipes);
      } catch (error) {
        console.error('Error fetching saved recipes:', error);
        setError('Failed to load saved recipes');
      } finally {
        setLoading(false);
      }
    };

    fetchSavedRecipes();
  }, []);

  if (loading) {
    return <div className="loading-spinner">Loading saved recipes...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (savedRecipes.length === 0) {
    return <div className="no-saved-recipes">No saved recipes yet</div>;
  }

  return (
    <div className="saved-recipes">
      <h2>Saved Recipes</h2>
      <div className="recipe-grid">
        {savedRecipes.map((recipe) => (
          <div key={recipe.id} className="recipe-card" onClick={() => onSelectRecipe(recipe)}>
            <h3>{recipe.name}</h3>
            <div className="recipe-meta">
              <span>{recipe.difficulty}</span>
              <span>{recipe.totalTime}</span>
            </div>
            {recipe.tags && recipe.tags.length > 0 && (
              <div className="recipe-tags">
                {recipe.tags.slice(0, 3).map((tag, index) => (
                  <span key={index} className="tag">{tag}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SavedRecipes;