import React, { useState, useEffect } from 'react';
import { getAllConversionsForIngredient, convertUnits, formatConvertedQuantity } from '../utils/unitConversions';
import './InlineConversionDropdown.css';

const InlineConversionDropdown = ({ 
  quantity, 
  unit, 
  ingredientName,
  originalQuantity = null,
  originalUnit = null
}) => {
  const [selectedUnit, setSelectedUnit] = useState(unit);
  const [displayQuantity, setDisplayQuantity] = useState(quantity);
  const [availableConversions, setAvailableConversions] = useState([]);

  useEffect(() => {
    // Get all possible conversions for this ingredient
    const baseQuantity = originalQuantity || quantity;
    const baseUnit = originalUnit || unit;
    
    const conversions = getAllConversionsForIngredient(baseQuantity, baseUnit, ingredientName);
    
    // Add the original unit as an option
    const allOptions = [
      { quantity: baseQuantity, unit: baseUnit, type: 'original' },
      ...conversions
    ];
    
    // Remove duplicates based on unit
    const uniqueOptions = allOptions.filter((option, index, self) => 
      index === self.findIndex(o => o.unit.toLowerCase() === option.unit.toLowerCase())
    );
    
    setAvailableConversions(uniqueOptions);
  }, [quantity, unit, ingredientName, originalQuantity, originalUnit]);

  const handleUnitChange = (e) => {
    const newUnit = e.target.value;
    setSelectedUnit(newUnit);
    
    // Convert the quantity to the new unit
    const baseQuantity = originalQuantity || quantity;
    const baseUnit = originalUnit || unit;
    
    if (newUnit === baseUnit) {
      setDisplayQuantity(baseQuantity);
    } else {
      const converted = convertUnits(baseQuantity, baseUnit, newUnit, ingredientName);
      if (converted !== null) {
        setDisplayQuantity(formatConvertedQuantity(converted));
      } else {
        // Fallback to finding it in our conversions array
        const found = availableConversions.find(conv => conv.unit === newUnit);
        if (found) {
          setDisplayQuantity(found.quantity);
        }
      }
    }
  };

  // If no conversions available, show original format
  if (availableConversions.length <= 1) {
    return (
      <span className="ingredient-quantity">
        {quantity} {unit}
      </span>
    );
  }

  return (
    <span className="ingredient-quantity-with-conversion">
      <span className="quantity-display">{displayQuantity}</span>
      <select 
        value={selectedUnit} 
        onChange={handleUnitChange}
        className="unit-conversion-dropdown"
        title="Select unit conversion"
      >
        {availableConversions.map((option, index) => (
          <option key={index} value={option.unit}>
            {option.unit}
          </option>
        ))}
      </select>
      {selectedUnit !== (originalUnit || unit) && (
        <span className="conversion-indicator" title={`Originally ${originalQuantity || quantity} ${originalUnit || unit}`}>
          ✓
        </span>
      )}
    </span>
  );
};

export default InlineConversionDropdown;