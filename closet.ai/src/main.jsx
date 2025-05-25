import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import TestComponent from './pages/firestoreTest.jsx'
import Header from './components/Header.jsx'
import GeminiChat from './components/geminiChat.jsx'
import SavedRecipes from './components/SavedRecipes.jsx'
import RecipeViewer from './components/RecipeViewer.jsx'
import { getCollection } from './services/firebase/firestore'

function App() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('ingredients'); // 'ingredients', 'recipes', 'savedRecipes', 'viewRecipe'
  const [selectedSavedRecipe, setSelectedSavedRecipe] = useState(null);
  
  // Fetch ingredients on mount
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        const fetchedIngredients = await getCollection("ingredients");
        setIngredients(fetchedIngredients);
      } catch (error) {
        console.error("Error fetching ingredients:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchIngredients();
  }, []);
  
  // Function to update ingredients
  const updateIngredients = async () => {
    try {
      setLoading(true);
      const fetchedIngredients = await getCollection("ingredients");
      setIngredients(fetchedIngredients);
    } catch (error) {
      console.error("Error fetching ingredients:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle recipe selection from SavedRecipes
  const handleSelectSavedRecipe = (recipe) => {
    setSelectedSavedRecipe(recipe);
    setActiveView('viewRecipe');
  };
  
  return (
    <>
      <Header />
      
      {/* Navigation tabs */}
      <div className="nav-tabs">
        <button 
          className={`tab ${activeView === 'ingredients' ? 'active' : ''}`}
          onClick={() => setActiveView('ingredients')}
        >
          My Ingredients
        </button>
        <button 
          className={`tab ${activeView === 'recipes' ? 'active' : ''}`}
          onClick={() => setActiveView('recipes')}
        >
          Generate Recipes
        </button>
        <button 
          className={`tab ${activeView === 'savedRecipes' ? 'active' : ''}`}
          onClick={() => setActiveView('savedRecipes')}
        >
          Saved Recipes
        </button>
      </div>

      {/* Conditional rendering based on active view */}
      {activeView === 'ingredients' && (
        <TestComponent 
          cachedIngredients={ingredients} 
          updateIngredients={updateIngredients} 
        />
      )}
      
      {activeView === 'recipes' && (
        <GeminiChat ingredients={ingredients} />
      )}
      
      {activeView === 'savedRecipes' && (
        <SavedRecipes onSelectRecipe={handleSelectSavedRecipe} />
      )}
      
      {activeView === 'viewRecipe' && selectedSavedRecipe && (
        <RecipeViewer 
          recipe={selectedSavedRecipe} 
          onBack={() => setActiveView('savedRecipes')} 
          onIngredientsUpdated={updateIngredients}
        />
      )}
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);