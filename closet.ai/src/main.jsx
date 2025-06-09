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
import { 
  getCollection, 
  cleanupOldTrashItems, 
  cleanupOldHistoryEntries,
  cleanupOldNotifications,
  checkExpiringIngredients 
} from './services/firebase/firestore'
import { useAuth } from './context/AuthContext'
import { auth } from './services/firebase/config'
import ErrorBoundary from './components/ErrorBoundary'
import History from './components/History.jsx'
import './styles/base.css'
import './index.css'

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

  // Effect to cleanup old trash items periodically
  useEffect(() => {
    if (currentUser) {
      const cleanupTrash = async () => {
        try {
          await cleanupOldTrashItems();
        } catch (error) {
          console.error('Error with automatic trash cleanup:', error);
        }
      };
      
      // Cleanup on mount
      cleanupTrash();
      
      // Set up periodic cleanup (every hour)
      const interval = setInterval(cleanupTrash, 60 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      const cleanupOldData = async () => {
        try {
          // Only run cleanup functions if user is still authenticated
          if (auth.currentUser) {
            await cleanupOldTrashItems();
            await cleanupOldHistoryEntries();
            await cleanupOldNotifications();
            
            // Check for expiring ingredients and create notifications
            await checkExpiringIngredients();
          }
        } catch (error) {
          // Only log error if user is still authenticated (not a logout scenario)
          if (auth.currentUser) {
            console.error('Error with automatic cleanup:', error);
          }
        }
      };
      
      // Cleanup only on mount (when user logs in)
      cleanupOldData();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      // Check for expiring ingredients every hour
      const expirationInterval = setInterval(async () => {
        try {
          await checkExpiringIngredients();
        } catch (error) {
          console.error('Error with periodic expiration check:', error);
        }
      }, 60 * 60 * 1000); // Every hour
      
      return () => clearInterval(expirationInterval);
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
          <span className="tab-icon">🥬</span>
          <span className="tab-text">Pantry</span>
        </button>
        <button 
          className={`tab ${activeView === 'recipes' ? 'active' : ''}`}
          onClick={() => setActiveView('recipes')}
        >
          <span className="tab-icon">🤖</span>
          <span className="tab-text">Generate</span>
        </button>
        <button 
          className={`tab ${activeView === 'savedRecipes' ? 'active' : ''}`}
          onClick={() => setActiveView('savedRecipes')}
        >
          <span className="tab-icon">💾</span>
          <span className="tab-text">Saved</span>
        </button>
        <button 
          className={`tab ${activeView === 'history' ? 'active' : ''}`}
          onClick={() => setActiveView('history')}
        >
          <span className="tab-icon">📝</span>
          <span className="tab-text">History</span>
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