import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { sendPromptToClaude } from '../services/claude/claude';
import { createRecipePrompt, recipePromptTemplates } from '../utils/promptTemplates';

const RecipeGenerator = ({ userId }) => {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [recipes, setRecipes] = useState(null);
  const [promptType, setPromptType] = useState('basicRecipeGenerator');
  const [customVariables, setCustomVariables] = useState({});
  
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        // Create a query to get this user's ingredients
        const q = query(
          collection(db, 'ingredients'), 
          where('userId', '==', userId)
        );
        
        const querySnapshot = await getDocs(q);
        const ingredientsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setIngredients(ingredientsList);
      } catch (error) {
        console.error('Error fetching ingredients:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchIngredients();
  }, [userId]);
  
  const handleGenerateRecipes = async () => {
    if (ingredients.length === 0) {
      alert('No ingredients available to generate recipes');
      return;
    }
    
    setGenerating(true);
    
    try {
      // Create the prompt using our template
      const prompt = createRecipePrompt(ingredients, promptType, customVariables);
      
      // Send to Claude API
      const claudeResponse = await sendPromptToClaude(prompt);
      
      // Update the UI with the generated recipes
      setRecipes(claudeResponse);
    } catch (error) {
      console.error('Error generating recipes:', error);
      alert('Failed to generate recipes. Please try again.');
    } finally {
      setGenerating(false);
    }
  };
  
  const handlePromptTypeChange = (e) => {
    setPromptType(e.target.value);
    
    // Reset custom variables when changing prompt type
    setCustomVariables({});
  };
  
  const handleCustomVariableChange = (key, value) => {
    setCustomVariables(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  return (
    <div className="recipe-generator">
      <h2>Recipe Generator</h2>
      
      {loading ? (
        <p>Loading your ingredients...</p>
      ) : (
        <>
          <div className="ingredients-summary">
            <h3>Available Ingredients ({ingredients.length})</h3>
            <p>You have {ingredients.length} ingredients available in your pantry.</p>
          </div>
          
          <div className="generator-controls">
            <div className="prompt-selection">
              <label htmlFor="promptType">Recipe Type:</label>
              <select 
                id="promptType" 
                value={promptType} 
                onChange={handlePromptTypeChange}
              >
                {Object.keys(recipePromptTemplates).map(key => (
                  <option key={key} value={key}>
                    {key.replace(/([A-Z])/g, ' $1')
                      .replace(/^./, str => str.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Dynamic fields based on prompt type */}
            {promptType === 'dietaryRestrictions' && (
              <div className="custom-variable">
                <label htmlFor="dietType">Diet Type:</label>
                <select 
                  id="dietType"
                  value={customVariables.dietType || ''}
                  onChange={(e) => handleCustomVariableChange('dietType', e.target.value)}
                >
                  <option value="">Select Diet Type</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="gluten-free">Gluten-Free</option>
                  <option value="keto">Keto</option>
                  <option value="paleo">Paleo</option>
                  <option value="low-carb">Low-Carb</option>
                </select>
              </div>
            )}
            
            {promptType === 'ingredientMaximizer' && (
              <div className="custom-variable">
                <label htmlFor="targetIngredient">Target Ingredient:</label>
                <select 
                  id="targetIngredient"
                  value={customVariables.targetIngredient || ''}
                  onChange={(e) => handleCustomVariableChange('targetIngredient', e.target.value)}
                >
                  <option value="">Select Ingredient</option>
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.name}>
                      {ing.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {promptType === 'cuisineSpecific' && (
              <div className="custom-variable">
                <label htmlFor="cuisineType">Cuisine:</label>
                <select 
                  id="cuisineType"
                  value={customVariables.cuisineType || ''}
                  onChange={(e) => handleCustomVariableChange('cuisineType', e.target.value)}
                >
                  <option value="">Select Cuisine</option>
                  <option value="Italian">Italian</option>
                  <option value="Mexican">Mexican</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Indian">Indian</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Thai">Thai</option>
                  <option value="Mediterranean">Mediterranean</option>
                  <option value="French">French</option>
                </select>
              </div>
            )}
            
            <button 
              onClick={handleGenerateRecipes} 
              disabled={generating || ingredients.length === 0}
            >
              {generating ? 'Generating...' : 'Generate Recipes'}
            </button>
          </div>
          
          {recipes && (
            <div className="generated-recipes">
              <h3>Generated Recipes</h3>
              <div className="recipes-content">
                {recipes.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RecipeGenerator;