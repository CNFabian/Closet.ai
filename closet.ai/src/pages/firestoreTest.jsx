import { useState } from 'react'
import '../styles/test.css'
import { addIngredient, updateIngredient } from '../services/firebase/firestore'

const TestComponent = ({ cachedIngredients = [], updateIngredients }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [displayMode, setDisplayMode] = useState('grid'); // 'grid', 'chips', 'category'
  
  // Edit mode states
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [originalEditData, setOriginalEditData] = useState({});
  const [showSavePrompt, setShowSavePrompt] = useState(false);

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

  // Edit mode functions
  const startEditing = (ingredient) => {
    const expirationDate = ingredient.expirationDate ? 
      (ingredient.expirationDate.toDate ? ingredient.expirationDate.toDate() : new Date(ingredient.expirationDate)) 
      : null;
    
    const editFormData = {
      name: ingredient.name,
      quantity: ingredient.quantity.toString(),
      unit: ingredient.unit,
      category: ingredient.category || 'Other',
      hasExpirationDate: !!expirationDate,
      expirationDate: expirationDate ? expirationDate.toISOString().split('T')[0] : ''
    };

    setEditData(editFormData);
    setOriginalEditData(JSON.parse(JSON.stringify(editFormData))); // Deep copy for comparison
    setEditingId(ingredient.id);
  };

  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const hasChanges = () => {
    return JSON.stringify(editData) !== JSON.stringify(originalEditData);
  };

  const cancelEdit = () => {
    if (hasChanges()) {
      setShowSavePrompt(true);
    } else {
      setEditingId(null);
      setEditData({});
      setOriginalEditData({});
    }
  };

  const discardChanges = () => {
    setEditingId(null);
    setEditData({});
    setOriginalEditData({});
    setShowSavePrompt(false);
  };

  const saveChanges = async () => {
    if (!editData.name.trim()) {
      setMessage('Please enter an ingredient name');
      return;
    }

    if (!editData.quantity || parseFloat(editData.quantity) <= 0) {
      setMessage('Please enter a valid quantity');
      return;
    }

    if (editData.hasExpirationDate && !editData.expirationDate) {
      setMessage('Please enter an expiration date or disable the expiration date option');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const updateData = {
        name: editData.name.trim(),
        quantity: parseFloat(editData.quantity),
        unit: editData.unit,
        category: editData.category
      };

      if (editData.hasExpirationDate && editData.expirationDate) {
        updateData.expirationDate = new Date(editData.expirationDate);
      } else {
        updateData.expirationDate = null;
      }

      await updateIngredient(editingId, updateData);

      if (updateIngredients) {
        await updateIngredients();
      }

      setMessage('Ingredient updated successfully!');
      setEditingId(null);
      setEditData({});
      setOriginalEditData({});
      setShowSavePrompt(false);
    } catch (error) {
      console.error("Error updating ingredient: ", error);
      setMessage('Error updating ingredient. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const isExpiringSoon = (expirationDate) => {
    if (!expirationDate) return false;
    const expDate = new Date(expirationDate);
    const today = new Date();
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  };

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

      if (formData.hasExpirationDate && formData.expirationDate) {
        ingredientData.expirationDate = new Date(formData.expirationDate);
      }

      await addIngredient(ingredientData);

      if (updateIngredients) {
        await updateIngredients();
      }

      setMessage('Ingredient added successfully!');
      
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

  // Group ingredients by category
  const groupedIngredients = cachedIngredients.reduce((groups, ingredient) => {
    const category = ingredient.category || 'Other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(ingredient);
    return groups;
  }, {});

  // Render edit form for an ingredient
  const renderEditForm = (ingredient) => (
    <div className="edit-form-overlay">
      <div className="edit-form">
        <h3>Edit {ingredient.name}</h3>
        
        <div className="form-group">
          <label htmlFor="edit-name">Ingredient Name:</label>
          <input 
            type="text"
            id="edit-name"
            name="name"
            value={editData.name}
            onChange={handleEditInputChange}
            placeholder="e.g., Tomatoes, Rice, Chicken..."
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="edit-quantity">Quantity:</label>
            <input 
              type="number"
              id="edit-quantity"
              name="quantity"
              value={editData.quantity}
              onChange={handleEditInputChange}
              placeholder="e.g., 2"
              min="0.1"
              step="0.1"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-unit">Unit:</label>
            <select 
              id="edit-unit"
              name="unit"
              value={editData.unit}
              onChange={handleEditInputChange}
            >
              {units.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="edit-category">Category:</label>
          <select 
            id="edit-category"
            name="category"
            value={editData.category}
            onChange={handleEditInputChange}
          >
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <div className="toggle-container">
            <label htmlFor="edit-hasExpirationDate" className="toggle-label">
              <input
                type="checkbox"
                id="edit-hasExpirationDate"
                name="hasExpirationDate"
                checked={editData.hasExpirationDate}
                onChange={handleEditInputChange}
                className="toggle-checkbox"
              />
              <span className="toggle-switch"></span>
              Add Expiration Date
            </label>
          </div>
        </div>

        {editData.hasExpirationDate && (
          <div className="form-group expiration-date-group">
            <label htmlFor="edit-expirationDate">Expiration Date:</label>
            <input 
              type="date"
              id="edit-expirationDate"
              name="expirationDate"
              value={editData.expirationDate}
              onChange={handleEditInputChange}
              min={getTodayDate()}
              required={editData.hasExpirationDate}
            />
            <small className="date-help-text">
              Choose when this ingredient will expire
            </small>
          </div>
        )}

        <div className="edit-form-buttons">
          <button 
            type="button"
            onClick={cancelEdit}
            className="cancel-button"
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={saveChanges}
            disabled={loading || !hasChanges()}
            className="save-button"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );

  // Render ingredients in grid format
  const renderGridView = () => (
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
            <button 
              className="edit-ingredient-button"
              onClick={() => startEditing(ingredient)}
              disabled={editingId !== null}
            >
              ✏️ Edit
            </button>
          </div>
        );
      })}
    </div>
  );

  // Render ingredients as chips
  const renderChipsView = () => (
    <div className="ingredients-list-compact">
      {cachedIngredients.map((ingredient) => {
        const expiring = ingredient.expirationDate && isExpiringSoon(ingredient.expirationDate.toDate ? ingredient.expirationDate.toDate() : ingredient.expirationDate);
        const expired = ingredient.expirationDate && isExpired(ingredient.expirationDate.toDate ? ingredient.expirationDate.toDate() : ingredient.expirationDate);
        
        return (
          <div 
            key={ingredient.id} 
            className={`ingredient-chip ${expired ? 'expired' : expiring ? 'expiring-soon' : ''}`}
          >
            <span className="chip-name">{ingredient.name}</span>
            <span className="chip-quantity">{ingredient.quantity} {ingredient.unit}</span>
            {ingredient.category && ingredient.category !== 'Other' && (
              <span className="chip-category">{ingredient.category}</span>
            )}
            {(expired || expiring) && (
              <span className="expiration-indicator">
                {expired ? '⚠️' : '⏰'}
              </span>
            )}
            <button 
              className="chip-edit-button"
              onClick={() => startEditing(ingredient)}
              disabled={editingId !== null}
              title="Edit ingredient"
            >
              ✏️
            </button>
          </div>
        );
      })}
    </div>
  );

  // Render ingredients grouped by category
  const renderCategoryView = () => (
    <div className="ingredients-by-category">
      {Object.entries(groupedIngredients).map(([category, ingredients]) => (
        <div key={category} className="category-section">
          <div className="category-header">{category} ({ingredients.length})</div>
          <div className="category-items">
            {ingredients.map((ingredient) => {
              const expiring = ingredient.expirationDate && isExpiringSoon(ingredient.expirationDate.toDate ? ingredient.expirationDate.toDate() : ingredient.expirationDate);
              const expired = ingredient.expirationDate && isExpired(ingredient.expirationDate.toDate ? ingredient.expirationDate.toDate() : ingredient.expirationDate);
              
              return (
                <div 
                  key={ingredient.id} 
                  className={`ingredient-chip ${expired ? 'expired' : expiring ? 'expiring-soon' : ''}`}
                >
                  <span className="chip-name">{ingredient.name}</span>
                  <span className="chip-quantity">{ingredient.quantity} {ingredient.unit}</span>
                  {(expired || expiring) && (
                    <span className="expiration-indicator">
                      {expired ? '⚠️' : '⏰'}
                    </span>
                  )}
                  <button 
                    className="chip-edit-button"
                    onClick={() => startEditing(ingredient)}
                    disabled={editingId !== null}
                    title="Edit ingredient"
                  >
                    ✏️
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
  
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
          disabled={loading || editingId !== null}
          className="submit-button"
        >
          {loading ? 'Adding...' : 'Add Ingredient'}
        </button>
      </form>
      
      {message && <p className="message">{message}</p>}
      
      {/* Display cached ingredients with view options */}
      <div className="cached-ingredients">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Your Pantry Inventory ({cachedIngredients.length} items):</h2>
          
          {/* Display mode selector */}
          <div className="display-mode-selector">
            <label style={{ marginRight: '10px', fontSize: '14px', color: '#666' }}>View:</label>
            <select 
              value={displayMode} 
              onChange={(e) => setDisplayMode(e.target.value)}
              disabled={editingId !== null}
              style={{ 
                padding: '5px 10px', 
                borderRadius: '4px', 
                border: '1px solid #ddd',
                fontSize: '14px'
              }}
            >
              <option value="grid">Grid View</option>
              <option value="chips">Compact Chips</option>
              <option value="category">By Category</option>
            </select>
          </div>
        </div>
        
        {cachedIngredients.length > 0 ? (
          <>
            {displayMode === 'grid' && renderGridView()}
            {displayMode === 'chips' && renderChipsView()}
            {displayMode === 'category' && renderCategoryView()}
          </>
        ) : (
          <p>No ingredients in your pantry yet.</p>
        )}
      </div>

      {/* Edit form overlay */}
      {editingId && (
        renderEditForm(cachedIngredients.find(ing => ing.id === editingId))
      )}

      {/* Save confirmation prompt */}
      {showSavePrompt && (
        <div className="save-prompt-overlay">
          <div className="save-prompt">
            <h3>Save Changes?</h3>
            <p>You have unsaved changes. Do you want to save them before closing?</p>
            <div className="save-prompt-buttons">
              <button 
                onClick={discardChanges}
                className="discard-button"
              >
                Discard Changes
              </button>
              <button 
                onClick={saveChanges}
                className="save-button"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestComponent;