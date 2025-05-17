import { useState } from 'react'
import '../styles/test.css'
import {db} from '../services/firebase/config'
import {addDocument,
        getCollection} from '../services/firebase/firestore'
import { collection } from 'firebase/firestore';

const TestComponent = () => {
  const [count, setCount] = useState(0);
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
    try {
      setLoading(true);
      addDocument(collectionName, input.value);
      
    } catch (error){
      console.error("Error adding document: ", error);
      setMessage('Error adding ingredient. Please try again.');
    } finally {
      setLoading(false);
      setMessage('');
      input.value = ''; // Clear the input
    }
    
  };

  const saveIngredients = async () => {
    try {
      const ingredients = getCollection(collectionName)
      console.log(ingredients)
    } catch (error) {
      console.error(error)
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

      <button
        onClick={saveIngredients}
        >
          Save
        </button>
      
      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default TestComponent;