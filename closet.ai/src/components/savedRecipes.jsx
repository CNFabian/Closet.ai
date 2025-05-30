import React, { useState, useEffect } from 'react';
import { getSavedRecipes } from '../services/firebase/firestore';
import { useAuth } from '../context/AuthContext';

function SavedRecipes({ onSelectRecipe }) {
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
    <div className="saved-recipes">
      <h2>My Saved Recipes ({savedRecipes.length})</h2>
      <div className="recipe-grid">
        {savedRecipes.map((recipe) => (
          <div key={recipe.id} className="recipe-card" onClick={() => onSelectRecipe(recipe)}>
            <h3>{recipe.name}</h3>
            <p className="recipe-description">{recipe.description}</p>
            <div className="recipe-meta">
              <span className="difficulty">{recipe.difficulty}</span>
              <span className="time">{recipe.totalTime}</span>
              <span className="servings">{recipe.servings} servings</span>
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
          </div>
        ))}
      </div>
    </div>
  );
}

export default SavedRecipes;