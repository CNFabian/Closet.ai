import React, { useState } from 'react';
import { getAllConversionsForIngredient } from '../utils/unitConversions';
import './ConversionIcon.css';

const ConversionIcon = ({ 
  quantity, 
  unit, 
  ingredientName, 
  isConverted = false,
  originalQuantity = null,
  originalUnit = null,
  userHasAmount = null,
  userUnit = null
}) => {
  const [showModal, setShowModal] = useState(false);
  const [conversions, setConversions] = useState([]);

  const handleClick = () => {
    // Get all possible conversions
    const allConversions = getAllConversionsForIngredient(
      originalQuantity || quantity, 
      originalUnit || unit, 
      ingredientName
    );
    setConversions(allConversions);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
  };

  // Don't show icon if no conversions are possible
  if (!originalQuantity && !originalUnit && conversions.length === 0) {
    return null;
  }

  return (
    <>
      <button 
        className="conversion-icon"
        onClick={handleClick}
        title="Show unit conversions"
        type="button"
      >
        🔄
      </button>

      {showModal && (
        <div className="conversion-modal-overlay" onClick={handleClose}>
          <div className="conversion-modal" onClick={e => e.stopPropagation()}>
            <div className="conversion-header">
              <h3>Unit Conversions for {ingredientName}</h3>
              <button className="close-button" onClick={handleClose}>×</button>
            </div>
            
            <div className="conversion-content">
              <div className="original-requirement">
                <h4>Recipe calls for:</h4>
                <p className="conversion-amount">
                  {originalQuantity || quantity} {originalUnit || unit}
                </p>
              </div>

              {isConverted && (
                <div className="converted-display">
                  <h4>Converted to your pantry units:</h4>
                  <p className="conversion-amount converted">
                    {quantity} {unit}
                  </p>
                </div>
              )}

              {userHasAmount && (
                <div className="user-inventory">
                  <h4>You have:</h4>
                  <p className="conversion-amount inventory">
                    {userHasAmount} {userUnit || unit}
                  </p>
                  {userHasAmount < quantity && (
                    <p className="warning">⚠️ You may not have enough</p>
                  )}
                </div>
              )}

              {conversions.length > 0 && (
                <div className="other-conversions">
                  <h4>Other conversions:</h4>
                  <div className="conversions-grid">
                    {conversions.map((conv, idx) => (
                      <div key={idx} className="conversion-item">
                        {conv.quantity} {conv.unit}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isConverted && userUnit && userUnit !== unit && (
                <div className="conversion-note">
                  <p>💡 You have this ingredient in {userUnit}, but automatic conversion isn't available. Use the conversions above as a reference.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ConversionIcon;