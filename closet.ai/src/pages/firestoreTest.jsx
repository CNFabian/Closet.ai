import { useState, useEffect } from 'react'
import './firestoreTest.css';
import { 
  addIngredient, 
  updateIngredient, 
  moveToTrash, 
  restoreFromTrash, 
  permanentlyDeleteIngredient, 
  getTrashIngredients, 
  cleanupOldTrashItems
} from '../services/firebase/firestore'

const getDaysUntilExpiration = (expirationDate) => {
  if (!expirationDate) return null;
  
  const expDate = expirationDate.toDate ? expirationDate.toDate() : new Date(expirationDate);
  const today = new Date();
  const diffTime = expDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

const getExpirationText = (expirationDate) => {
  const daysUntil = getDaysUntilExpiration(expirationDate);
  
  if (daysUntil === null) return null;
  
  if (daysUntil < 0) {
    const daysPast = Math.abs(daysUntil);
    return `Expired ${daysPast} day${daysPast === 1 ? '' : 's'} ago`;
  } else if (daysUntil === 0) {
    return "Expires today";
  } else if (daysUntil === 1) {
    return "Expires tomorrow";
  } else {
    return `${daysUntil} days until expiration`;
  }
};

const TestComponent = ({ cachedIngredients = [], updateIngredients }) => {
  const categories = [
    'Vegetables', 'Fruits', 'Meat', 'Dairy', 'Grains', 'Spices', 'Condiments', 
    'Canned Goods', 'Frozen', 'Beverages', 'Other'
  ];

  const unitsByCategory = {
    'Vegetables': ['lb', 'lbs', 'piece', 'pieces', 'bag', 'bunch', 'head', 'oz', 'container'],
    'Fruits': ['lb', 'lbs', 'piece', 'pieces', 'bag', 'container', 'pint', 'quart', 'oz'],
    'Meat': ['lb', 'lbs', 'oz', 'package', 'piece', 'pieces'],
    'Dairy': ['gallon', 'half gallon', 'quart', 'pint', 'cup', 'oz', 'lb', 'lbs', 'container', 'stick', 'sticks', 'dozen'],
    'Grains': ['lb', 'lbs', 'oz', 'bag', 'box', 'container'],
    'Spices': ['oz', 'container', 'jar', 'bottle', 'package'],
    'Condiments': ['bottle', 'jar', 'container', 'oz', 'packet', 'tube'],
    'Canned Goods': ['can', 'cans', 'jar', 'bottle', 'oz', 'lb', 'lbs'],
    'Frozen': ['bag', 'box', 'container', 'lb', 'lbs', 'oz', 'piece', 'pieces'],
    'Beverages': ['bottle', 'can', 'cans', 'case', 'gallon', 'half gallon', 'quart', 'pint', 'liter', '2 liter', 'oz', 'pack'],
    'Other': ['piece', 'pieces', 'package', 'box', 'bag', 'container', 'bottle', 'jar', 'lb', 'lbs', 'oz']
  };
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [displayMode, setDisplayMode] = useState('grid');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [originalEditData, setOriginalEditData] = useState({});
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [trashIngredients, setTrashIngredients] = useState([]);
  const [loadingTrash, setLoadingTrash] = useState(false);
  
  // Keep track of current category separately
  const [currentCategory, setCurrentCategory] = useState('Vegetables');
  
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: unitsByCategory['Vegetables'][0],
    category: 'Vegetables',
    hasExpirationDate: false,
    expirationDate: ''
  });

  // Effect to fetch trash when showing trash
  useEffect(() => {
    if (showTrash) {
      fetchTrashIngredients();
    }
  }, [showTrash]);

  // Effect to cleanup old trash items on component mount
  useEffect(() => {
    const cleanup = async () => {
      try {
        await cleanupOldTrashItems();
      } catch (error) {
        console.error('Error with automatic trash cleanup:', error);
      }
    };
    
    cleanup();
  }, []);

  const getAvailableUnits = (category) => {
    return unitsByCategory[category] || unitsByCategory['Other'];
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    const availableUnits = getAvailableUnits(newCategory);
    
    setCurrentCategory(newCategory);
    setFormData(prev => ({
      ...prev,
      category: newCategory,
      unit: availableUnits[0]
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
      
      // Reset form but keep the current category
      setFormData({
        name: '',
        quantity: '',
        unit: getAvailableUnits(currentCategory)[0],
        category: currentCategory,
        hasExpirationDate: false,
        expirationDate: ''
      });
    } catch (error) {
      console.error("Error adding ingredient: ", error);
      if (error.message === 'DUPLICATE_ACTIVE') {
        setMessage('An ingredient with this name already exists in your pantry. Please edit the existing ingredient or use a different name.');
      } else {
        setMessage('Error adding ingredient. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTrashIngredients = async () => {
    try {
      setLoadingTrash(true);
      console.log('Fetching trash ingredients...');
      const trashItems = await getTrashIngredients();
      console.log('Fetched trash items:', trashItems);
      setTrashIngredients(trashItems);
    } catch (error) {
      console.error('Error fetching trash ingredients:', error);
      // Don't show error message for index issues when there's no data
      if (!error.message.includes('index')) {
        setMessage('Error loading trash items');
      }
      // Set empty array so UI still works
      setTrashIngredients([]);
    } finally {
      setLoadingTrash(false);
    }
  };

  const handleRestoreFromTrash = async (ingredientId) => {
    try {
      setLoading(true);
      await restoreFromTrash(ingredientId);
      
      if (updateIngredients) {
        await updateIngredients();
      }
      await fetchTrashIngredients();
      
      setMessage('Ingredient restored from trash!');
    } catch (error) {
      console.error('Error restoring ingredient:', error);
      setMessage('Error restoring ingredient. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDelete = async (ingredientId) => {
    if (!confirm('Are you sure you want to permanently delete this ingredient? This cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      await permanentlyDeleteIngredient(ingredientId);
      await fetchTrashIngredients();
      
      setMessage('Ingredient permanently deleted!');
    } catch (error) {
      console.error('Error permanently deleting ingredient:', error);
      setMessage('Error deleting ingredient. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupTrash = async () => {
    try {
      setLoading(true);
      console.log('Cleaning up trash...');
      const deletedCount = await cleanupOldTrashItems();
      await fetchTrashIngredients();
      
      if (deletedCount > 0) {
        setMessage(`Cleaned up ${deletedCount} old items from trash`);
      } else {
        setMessage('No old items to clean up');
      }
    } catch (error) {
      console.error('Error cleaning up trash:', error);
      // Don't show error for index issues
      if (!error.message.includes('index')) {
        setMessage('Error cleaning up trash. Please try again.');
      } else {
        setMessage('No items to clean up');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTrashExpiredItems = async () => {
    const expiredItems = cachedIngredients.filter(ingredient => 
      ingredient.expirationDate && isExpired(ingredient.expirationDate.toDate ? ingredient.expirationDate.toDate() : ingredient.expirationDate)
    );

    if (expiredItems.length === 0) {
      setMessage('No expired items found');
      return;
    }

    if (!confirm(`Are you sure you want to move ${expiredItems.length} expired item${expiredItems.length === 1 ? '' : 's'} to trash?`)) {
      return;
    }

    try {
      setLoading(true);
      
      // Move each expired item to trash
      for (const item of expiredItems) {
        await moveToTrash(item.id);
      }
      
      // Refresh ingredients
      if (updateIngredients) {
        await updateIngredients();
      }
      
      setMessage(`Moved ${expiredItems.length} expired item${expiredItems.length === 1 ? '' : 's'} to trash`);
    } catch (error) {
      console.error('Error moving expired items to trash:', error);
      setMessage('Error moving expired items to trash. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Edit functionality
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
    setOriginalEditData(JSON.parse(JSON.stringify(editFormData)));
    setEditingId(ingredient.id);
  };

  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEditCategoryChange = (e) => {
    const newCategory = e.target.value;
    const availableUnits = getAvailableUnits(newCategory);
    
    setEditData(prev => ({
      ...prev,
      category: newCategory,
      unit: availableUnits[0]
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

  // Helper functions
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


  const hasExpiredItems = (ingredients) => {
    return ingredients.some(ingredient => 
      ingredient.expirationDate && isExpired(ingredient.expirationDate.toDate ? ingredient.expirationDate.toDate() : ingredient.expirationDate)
    );
  };

  const groupedIngredients = cachedIngredients.reduce((groups, ingredient) => {
    const category = ingredient.category || 'Other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(ingredient);
    return groups;
  }, {});

  // Render methods
  const renderEditForm = (ingredient) => (
    <div className="edit-form-overlay">
      <div className="edit-form">
        <h3>Edit {ingredient.name}</h3>
        
        <div className="form-group">
          <label htmlFor="edit-category">Category:</label>
          <select 
            id="edit-category"
            name="category"
            value={editData.category}
            onChange={handleEditCategoryChange}
          >
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

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
              {getAvailableUnits(editData.category).map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
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

  const renderGridView = () => (
    <div className="ingredients-grid">
      {cachedIngredients.map((ingredient) => {
        const expiring = ingredient.expirationDate && isExpiringSoon(ingredient.expirationDate.toDate ? ingredient.expirationDate.toDate() : ingredient.expirationDate);
        const expired = ingredient.expirationDate && isExpired(ingredient.expirationDate.toDate ? ingredient.expirationDate.toDate() : ingredient.expirationDate);
        const expirationText = getExpirationText(ingredient.expirationDate);
        
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
            {expirationText && (
              <div className={`ingredient-expiration ${expired ? 'expired' : expiring ? 'expiring' : ''}`}>
                <div className="expiration-countdown">
                  {expirationText}
                </div>
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

  const renderChipsView = () => (
    <div className="ingredients-list-compact">
      {cachedIngredients.map((ingredient) => {
        const expiring = ingredient.expirationDate && isExpiringSoon(ingredient.expirationDate.toDate ? ingredient.expirationDate.toDate() : ingredient.expirationDate);
        const expired = ingredient.expirationDate && isExpired(ingredient.expirationDate.toDate ? ingredient.expirationDate.toDate() : ingredient.expirationDate);
        const expirationText = getExpirationText(ingredient.expirationDate);
        
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
            {expirationText && (
              <span className="chip-expiration-text">
                {expirationText}
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

  const renderCategoryView = () => (
    <div className="ingredients-by-category">
      {Object.entries(groupedIngredients).map(([category, ingredients]) => (
        <div key={category} className="category-section">
          <div className="category-header">{category} ({ingredients.length})</div>
          <div className="category-items">
            {ingredients.map((ingredient) => {
              const expiring = ingredient.expirationDate && isExpiringSoon(ingredient.expirationDate.toDate ? ingredient.expirationDate.toDate() : ingredient.expirationDate);
              const expired = ingredient.expirationDate && isExpired(ingredient.expirationDate.toDate ? ingredient.expirationDate.toDate() : ingredient.expirationDate);
              const expirationText = getExpirationText(ingredient.expirationDate);
              
              return (
                <div 
                  key={ingredient.id} 
                  className={`ingredient-chip ${expired ? 'expired' : expiring ? 'expiring-soon' : ''}`}
                >
                  <span className="chip-name">{ingredient.name}</span>
                  <span className="chip-quantity">{ingredient.quantity} {ingredient.unit}</span>
                  {expirationText && (
                    <span className="chip-expiration-text">
                      {expirationText}
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
      <h1 className="title">Add Ingredients to Your Pantry</h1>
      
      <form onSubmit={handleSubmit} className="ingredient-form">
        <div className="form-group">
          <label htmlFor="category">Category:</label>
          <select 
            id="category"
            name="category"
            value={formData.category}
            onChange={handleCategoryChange}
          >
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

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
              {getAvailableUnits(formData.category).map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
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
      
     <div className="cached-ingredients">
      {/* Trash toggle button */}
      <div className="pantry-controls">
        <button 
          onClick={() => setShowTrash(!showTrash)}
          disabled={loading}
          className={`show-trash-button ${showTrash ? 'hide' : 'show'}`}
        >
          {showTrash ? 'Hide Trash' : 'Show Trash'}
        </button>
        
        {/* Conditionally show Trash Expired Items button */}
        {!showTrash && hasExpiredItems(cachedIngredients) && (
          <button 
            onClick={handleTrashExpiredItems}
            disabled={loading}
            className="trash-expired-button"
          >
            Trash Expired Items
          </button>
        )}
        
        {showTrash && (
          <button 
            onClick={handleCleanupTrash}
            disabled={loading}
            className="clean-trash-button"
          >
            Clean Trash
          </button>
        )}
        
        <div className="view-selector-container">
          <label className="view-selector-label">View:</label>
          <select 
            value={displayMode} 
            onChange={(e) => setDisplayMode(e.target.value)}
            disabled={editingId !== null}
            className="view-selector-dropdown"
          >
            <option value="grid">Grid View</option>
            <option value="chips">Compact Chips</option>
            <option value="category">By Category</option>
          </select>
        </div>
      </div>

          {/* Conditional rendering for active ingredients or trash */}
          {showTrash ? (
            <div className="trash-section">
              <h3>Trash ({trashIngredients.length} items)</h3>
              {loadingTrash ? (
                <p className="trash-loading">Loading trash items...</p>
              ) : trashIngredients.length > 0 ? (
                <div className="trash-items">
                  {trashIngredients.map((ingredient) => (
                    <div key={ingredient.id} className="trash-item">
                      <div className="trash-item-info">
                        <div className="trash-item-name">{ingredient.name}</div>
                        <div className="trash-item-details">
                          {ingredient.quantity} {ingredient.unit} • {ingredient.category}
                        </div>
                        <div className="trash-item-date">
                          Trashed: {ingredient.trashedAt?.toDate ? 
                            ingredient.trashedAt.toDate().toLocaleString() : 
                            new Date(ingredient.trashedAt).toLocaleString()
                          }
                        </div>
                      </div>
                      <div className="trash-item-actions">
                        <button
                          onClick={() => handleRestoreFromTrash(ingredient.id)}
                          disabled={loading}
                          className="trash-restore-button"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(ingredient.id)}
                          disabled={loading}
                          className="trash-delete-button"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="trash-empty">
                  No items in trash
                </p>
              )}
            </div>
          ) : (
            <>
              {cachedIngredients.length > 0 ? (
                <>
                  {displayMode === 'grid' && renderGridView()}
                  {displayMode === 'chips' && renderChipsView()}
                  {displayMode === 'category' && renderCategoryView()}
                </>
              ) : (
                <p>No ingredients in your pantry yet.</p>
              )}
            </>
          )}
        </div>

      {editingId && renderEditForm(cachedIngredients.find(ing => ing.id === editingId))}

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