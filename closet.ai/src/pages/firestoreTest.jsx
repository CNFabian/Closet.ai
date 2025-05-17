import { useState } from 'react'
import '../styles/test.css'
import {db} from '../services/firebase/config'
import {addDocument} from '../services/firebase/firestore'


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
    setLoading(true);
    setMessage('');
   
    try {
      addDocument(collectionName, input.value);
      
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
    </div>
  );
};

export default TestComponent;