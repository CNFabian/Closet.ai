import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/Auth/PrivateRoute'
import Login from './components/Auth/Login'
import Register from './components/Auth/Register'
import Header from './components/Header'
import TestComponent from './pages/firestoreTest.jsx'
import GeminiChat from './components/geminiChat.jsx'
import SavedRecipes from './components/savedRecipes.jsx'
import RecipeViewer from './components/RecipeViewer.jsx'
import { getCollection } from './services/firebase/firestore'
import { useAuth } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import History from './components/History.jsx'
import './styles/base.css'      // Global utilities and base styles
import './index.css'           // Tailwind and minimal overrides

function MainApp() {
  const { currentUser, isAuthenticated } = useAuth()
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('ingredients');
  const [selectedSavedRecipe, setSelectedSavedRecipe] = useState(null);
  
  // Fetch user's ingredients when user changes or on mount
  useEffect(() => {
    if (currentUser) {
      fetchUserIngredients();
    } else {
      setIngredients([]);
      setLoading(false);
    }
  }, [currentUser]);
  
  const fetchUserIngredients = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const fetchedIngredients = await getCollection("ingredients", currentUser.uid);
      setIngredients(fetchedIngredients);
    } catch (error) {
      console.error("Error fetching ingredients:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to update ingredients
  const updateIngredients = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      const fetchedIngredients = await getCollection("ingredients", currentUser.uid);
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

  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }
  
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
        <button 
          className={`tab ${activeView === 'history' ? 'active' : ''}`}
          onClick={() => setActiveView('history')}
        >
          Activity History
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
        <GeminiChat 
          ingredients={ingredients} 
          onIngredientsUpdated={updateIngredients}
        />
      )}
      
    {activeView === 'savedRecipes' && (
      <SavedRecipes 
        onSelectRecipe={handleSelectSavedRecipe}
        ingredients={ingredients}
      />
    )}

    {activeView === 'viewRecipe' && selectedSavedRecipe && (
      <RecipeViewer 
        recipe={selectedSavedRecipe} 
        onBack={() => setActiveView('savedRecipes')} 
        onIngredientsUpdated={updateIngredients}
        ingredients={ingredients}
      />
    )}

      {activeView === 'history' && (
        <History />
      )}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={
            <PrivateRoute>
              <MainApp />
            </PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);