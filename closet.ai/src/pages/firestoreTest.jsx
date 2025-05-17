import { useState } from 'react'
import '../styles/test.css'
import {db} from '../services/firebase/config'
import {addDocument} from '../services/firebase/firestore'

const TestComponent = ({ cachedIngredients = [], updateIngredients }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  console.log("All env vars:", import.meta.env);
  console.log("API Key:", import.meta.env.VITE_GEMINI_API_KEY);
  const collectionName = "ingredients"

  const handleClick = async () => {
    const input = document.getElementById('ingredient-input');
    const ingredientValue = input.value.trim();
    
    if (!ingredientValue) {
      setMessage('Please enter an ingredient');
      return;
    }
    setLoading(true);
    setMessage('');
   
    try {
      await addDocument(collectionName, input.value);
      // Call the updateIngredients function to refresh the ingredients
      if (updateIngredients) {
        await updateIngredients();
      }
      setMessage('Ingredient added successfully!');
    } catch (error){
      console.error("Error adding document: ", error);
      setMessage('Error adding ingredient. Please try again.');
    } finally {
      setLoading(false);
      input.value = ''; // Clear the input
    }
  };
  
  return (
    <div className="box">
      <h1 className="title">
        Enter Your Ingredients Here:
      </h1>
      <input 
        className="inputField" 
        id='ingredient-input' 
        placeholder='Fruit, Orange, ...'
      />

      <button 
        onClick={handleClick} 
        disabled={loading}
      >
        {loading ? 'Submitting...' : 'Submit'}
      </button>
      
      {message && <p className="message">{message}</p>}
      
      {/* Display cached ingredients */}
      <div className="cached-ingredients">
        <h2>Your Ingredients:</h2>
        {cachedIngredients.length > 0 ? (
          <ul>
            {cachedIngredients.map((ingredient, index) => (
              <li key={`ingredient-${ingredient.id || index}`}>
                {ingredient.name}
                {ingredient.createdAt && ingredient.createdAt.toDate ? (
                  <span className="timestamp">
                    {" "}(added: {new Date(ingredient.createdAt.toDate()).toLocaleString()})
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p>No ingredients found.</p>
        )}
      </div>
    </div>
  );
};

export default TestComponent;