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
    category: 'Other',
    hasExpirationDate: false,
    expirationDate: ''
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
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Get today's date in YYYY-MM-DD format for the min attribute
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Check if expiration date is soon (within 7 days)
  const isExpiringSoon = (expirationDate) => {
    if (!expirationDate) return false;
    const expDate = new Date(expirationDate);
    const today = new Date();
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  };

  // Check if expired
  const isExpired = (expirationDate) => {
    if (!expirationDate) return false;
    const expDate = new Date(expirationDate);
    const today = new Date();
    return expDate < today;
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

    // Validate expiration date if enabled
    if (formData.hasExpirationDate && !formData.expirationDate) {
      setMessage('Please enter an expiration date or disable the expiration date option');
      return;
    }

    setLoading(true);
    setMessage('');
   
    try {
      const ingredientData = {
        name: formData.name.trim(),
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        category: formData.category
      };

      // Only add expiration date if the toggle is enabled
      if (formData.hasExpirationDate && formData.expirationDate) {
        ingredientData.expirationDate = new Date(formData.expirationDate);
      }

      await addIngredient(ingredientData);

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
        category: 'Other',
        hasExpirationDate: false,
        expirationDate: ''
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

        {/* Expiration Date Toggle */}
        <div className="form-group">
          <div className="toggle-container">
            <label htmlFor="hasExpirationDate" className="toggle-label">
              <input
                type="checkbox"
                id="hasExpirationDate"
                name="hasExpirationDate"
                checked={formData.hasExpirationDate}
                onChange={handleInputChange}
                className="toggle-checkbox"
              />
              <span className="toggle-switch"></span>
              Add Expiration Date
            </label>
          </div>
        </div>

        {/* Expiration Date Input - Only show when toggle is enabled */}
        {formData.hasExpirationDate && (
          <div className="form-group expiration-date-group">
            <label htmlFor="expirationDate">Expiration Date:</label>
            <input 
              type="date"
              id="expirationDate"
              name="expirationDate"
              value={formData.expirationDate}
              onChange={handleInputChange}
              min={getTodayDate()}
              required={formData.hasExpirationDate}
            />
            <small className="date-help-text">
              Choose when this ingredient will expire
            </small>
          </div>
        )}

        <button 
          type="submit"
          disabled={loading}
          className="submit-button"
        >
          {loading ? 'Adding...' : 'Add Ingredient'}
        </button>
      </form>
      
      {message && <p className="message">{message}</p>}
      
      {/* Display cached ingredients with quantities and expiration dates */}
      <div className="cached-ingredients">
        <h2>Your Pantry Inventory:</h2>
        {cachedIngredients.length > 0 ? (
          <div className="ingredients-grid">
            {cachedIngredients.map((ingredient) => {
              const expiring = ingredient.expirationDate && isExpiringSoon(ingredient.expirationDate.toDate ? ingredient.expirationDate.toDate() : ingredient.expirationDate);
              const expired = ingredient.expirationDate && isExpired(ingredient.expirationDate.toDate ? ingredient.expirationDate.toDate() : ingredient.expirationDate);
              
              return (
                <div 
                  key={ingredient.id} 
                  className={`ingredient-card ${expired ? 'expired' : expiring ? 'expiring-soon' : ''}`}
                >
                  <div className="ingredient-name">{ingredient.name}</div>
                  <div className="ingredient-quantity">
                    {ingredient.quantity} {ingredient.unit}
                  </div>
                  {ingredient.category && (
                    <div className="ingredient-category">{ingredient.category}</div>
                  )}
                  {ingredient.expirationDate && (
                    <div className={`ingredient-expiration ${expired ? 'expired' : expiring ? 'expiring' : ''}`}>
                      Expires: {ingredient.expirationDate.toDate ? 
                        ingredient.expirationDate.toDate().toLocaleDateString() : 
                        new Date(ingredient.expirationDate).toLocaleDateString()}
                      {expired && <span className="status-text"> (EXPIRED)</span>}
                      {expiring && !expired && <span className="status-text"> (EXPIRES SOON)</span>}
                    </div>
                  )}
                  {ingredient.createdAt && ingredient.createdAt.toDate && (
                    <div className="ingredient-date">
                      Added: {new Date(ingredient.createdAt.toDate()).toLocaleDateString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p>No ingredients in your pantry yet.</p>
        )}
      </div>
    </div>
  );
};

export default TestComponent;