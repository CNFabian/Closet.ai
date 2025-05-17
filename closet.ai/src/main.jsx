import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import TestComponent from './pages/firestoreTest.jsx'
import Header from './components/Header.jsx'
import GeminiChat from './components/geminiChat.jsx'
import { getCollection } from './services/firebase/firestore'

function App() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
  
  // Function to update ingredients (will be passed to TestComponent)
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
  
  return (
    <>
      <Header />
      <TestComponent 
        cachedIngredients={ingredients} 
        updateIngredients={updateIngredients} 
      />
      <GeminiChat ingredients={ingredients} />
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);