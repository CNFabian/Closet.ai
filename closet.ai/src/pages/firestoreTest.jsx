import { useState } from 'react'
import '../styles/test.css'
import {db} from '../services/firebase/config'
import {collection,
        addDoc,
        Timestamp} from 'firebase/firestore'

const TestComponent = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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
      // Add a new document to the "ingredients" collection
      const docRef = await addDoc(collection(db, "ingredients"), {
        name: ingredientValue,
        createdAt: Timestamp.now()
      });
      
      console.log("Document written with ID: ", docRef.id);
      setMessage('Ingredient added successfully!');
      input.value = ''; // Clear the input
    } catch (error) {
      console.error("Error adding document: ", error);
      setMessage('Error adding ingredient. Please try again.');
    } finally {
      setLoading(false);
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