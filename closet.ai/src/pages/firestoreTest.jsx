import { useState } from 'react'
import '../styles/test.css'
import { addIngredient } from '../services/firebase/firestore'

const TestComponent = ({ cachedIngredients = [], updateIngredients }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: 'piece',
    category: 'Other'
  });

  const units = [
    'piece', 'pieces', 'cup', 'cups', 'tablespoon', 'tbsp', 'teaspoon', 'tsp',
    'gram', 'g', 'kg', 'oz', 'lb', 'liter', 'ml', 'pint', 'quart'
  ];

  const categories = [
    'Vegetables', 'Fruits', 'Meat', 'Dairy', 'Grains', 'Spices', 'Condiments', 
    'Canned Goods', 'Frozen', 'Beverages', 'Other'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setMessage('Please enter an ingredient name');
      return;
    }

    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      setMessage('Please enter a valid quantity');
      return;
    }

    setLoading(true);
    setMessage('');
   
    try {
      await addIngredient({
        name: formData.name.trim(),
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        category: formData.category
      });

      // Call the updateIngredients function to refresh the ingredients
      if (updateIngredients) {
        await updateIngredients();
      }

      setMessage('Ingredient added successfully!');
      
      // Reset form
      setFormData({
        name: '',
        quantity: '',
        unit: 'piece',
        category: 'Other'
      });
    } catch (error) {
      console.error("Error adding ingredient: ", error);
      setMessage('Error adding ingredient. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="box">
      <h1 className="title">
        Add Ingredients to Your Pantry
      </h1>
      
      <form onSubmit={handleSubmit} className="ingredient-form">
        <div className="form-group">
          <label htmlFor="name">Ingredient Name:</label>
          <input 
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g., Tomatoes, Rice, Chicken..."
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="quantity">Quantity:</label>
            <input 
              type="number"
              id="quantity"
              name="quantity"
              value={formData.quantity}
              onChange={handleInputChange}
              placeholder="e.g., 2"
              min="0.1"
              step="0.1"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="unit">Unit:</label>
            <select 
              id="unit"
              name="unit"
              value={formData.unit}
              onChange={handleInputChange}
            >
              {units.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="category">Category:</label>
          <select 
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
          >
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="submit-button"
        >
          {loading ? 'Adding...' : 'Add Ingredient'}
        </button>
      </form>
      
      {message && <p className="message">{message}</p>}
      
      {/* Display cached ingredients with quantities */}
      <div className="cached-ingredients">
        <h2>Your Pantry Inventory:</h2>
        {cachedIngredients.length > 0 ? (
          <div className="ingredients-grid">
            {cachedIngredients.map((ingredient) => (
              <div key={ingredient.id} className="ingredient-card">
                <div className="ingredient-name">{ingredient.name}</div>
                <div className="ingredient-quantity">
                  {ingredient.quantity} {ingredient.unit}
                </div>
                {ingredient.category && (
                  <div className="ingredient-category">{ingredient.category}</div>
                )}
                {ingredient.createdAt && ingredient.createdAt.toDate && (
                  <div className="ingredient-date">
                    Added: {new Date(ingredient.createdAt.toDate()).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p>No ingredients in your pantry yet.</p>
        )}
      </div>
    </div>
  );
};

export default TestComponent;