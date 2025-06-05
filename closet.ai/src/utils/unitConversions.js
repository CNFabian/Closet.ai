// Comprehensive unit conversion system
export const unitConversions = {
  // Volume conversions (all to cups as base unit)
  volume: {
    'cup': 1,
    'cups': 1,
    'tablespoon': 1/16,
    'tablespoons': 1/16,
    'tbsp': 1/16,
    'teaspoon': 1/48,
    'teaspoons': 1/48,
    'tsp': 1/48,
    'fluid ounce': 1/8,
    'fluid ounces': 1/8,
    'fl oz': 1/8,
    'pint': 2,
    'pints': 2,
    'quart': 4,
    'quarts': 4,
    'gallon': 16,
    'gallons': 16,
    'liter': 4.227,
    'liters': 4.227,
    'ml': 0.004227,
    'milliliter': 0.004227,
    'milliliters': 0.004227
  },
  
  // Weight conversions (all to ounces as base unit)
  weight: {
    'oz': 1,
    'ounce': 1,
    'ounces': 1,
    'lb': 16,
    'lbs': 16,
    'pound': 16,
    'pounds': 16,
    'gram': 0.035274,
    'grams': 0.035274,
    'g': 0.035274,
    'kg': 35.274,
    'kilogram': 35.274,
    'kilograms': 35.274
  },
  
  // Count-based units (no conversion needed)
  count: {
    'piece': 1,
    'pieces': 1,
    'item': 1,
    'items': 1,
    'whole': 1,
    'each': 1,
    'dozen': 12,
    'pair': 2,
    'pairs': 2
  },
  
  // Package/container units (approximate conversions)
  container: {
    'package': 1,
    'packages': 1,
    'bag': 1,
    'bags': 1,
    'box': 1,
    'boxes': 1,
    'can': 1,
    'cans': 1,
    'jar': 1,
    'jars': 1,
    'bottle': 1,
    'bottles': 1,
    'container': 1,
    'containers': 1,
    'stick': 1,
    'sticks': 1,
    'bunch': 1,
    'bunches': 1,
    'head': 1,
    'heads': 1
  }
};

// Ingredient-specific conversions (cups to weight for common ingredients)
export const ingredientDensities = {
  // Grains and cereals
  'rice': { cupsToOz: 6.5, type: 'weight' },
  'white rice': { cupsToOz: 6.5, type: 'weight' },
  'brown rice': { cupsToOz: 6.8, type: 'weight' },
  'flour': { cupsToOz: 4.25, type: 'weight' },
  'all purpose flour': { cupsToOz: 4.25, type: 'weight' },
  'wheat flour': { cupsToOz: 4.25, type: 'weight' },
  'bread flour': { cupsToOz: 4.25, type: 'weight' },
  'sugar': { cupsToOz: 7, type: 'weight' },
  'brown sugar': { cupsToOz: 7.5, type: 'weight' },
  'oats': { cupsToOz: 2.7, type: 'weight' },
  'quinoa': { cupsToOz: 6, type: 'weight' },
  'pasta': { cupsToOz: 3.5, type: 'weight' },
  
  // Liquids
  'milk': { cupsToOz: 8.6, type: 'weight' },
  'water': { cupsToOz: 8.35, type: 'weight' },
  'oil': { cupsToOz: 7.7, type: 'weight' },
  'olive oil': { cupsToOz: 7.7, type: 'weight' },
  'vegetable oil': { cupsToOz: 7.7, type: 'weight' },
  'butter': { cupsToOz: 8, type: 'weight' },
  
  // Beans and legumes
  'beans': { cupsToOz: 6.5, type: 'weight' },
  'black beans': { cupsToOz: 6.5, type: 'weight' },
  'kidney beans': { cupsToOz: 6.5, type: 'weight' },
  'lentils': { cupsToOz: 7, type: 'weight' },
  'chickpeas': { cupsToOz: 6, type: 'weight' },
  
  // Nuts and seeds
  'almonds': { cupsToOz: 5, type: 'weight' },
  'walnuts': { cupsToOz: 4, type: 'weight' },
  'pecans': { cupsToOz: 3.5, type: 'weight' },
  'peanuts': { cupsToOz: 5, type: 'weight' },
  'sunflower seeds': { cupsToOz: 5, type: 'weight' },
  
  // Vegetables (chopped)
  'onions': { cupsToOz: 4, type: 'weight' },
  'onion': { cupsToOz: 4, type: 'weight' },
  'carrots': { cupsToOz: 4.5, type: 'weight' },
  'carrot': { cupsToOz: 4.5, type: 'weight' },
  'celery': { cupsToOz: 4, type: 'weight' },
  'tomatoes': { cupsToOz: 5.5, type: 'weight' },
  'tomato': { cupsToOz: 5.5, type: 'weight' },
  'potatoes': { cupsToOz: 5, type: 'weight' },
  'potato': { cupsToOz: 5, type: 'weight' },
  
  // Cheese
  'cheese': { cupsToOz: 4, type: 'weight' },
  'cheddar cheese': { cupsToOz: 4, type: 'weight' },
  'mozzarella cheese': { cupsToOz: 4, type: 'weight' },
  'parmesan cheese': { cupsToOz: 3.5, type: 'weight' }
};

// Determine the unit type for a given unit
export const getUnitType = (unit) => {
  const normalizedUnit = unit.toLowerCase().trim();
  
  if (unitConversions.volume[normalizedUnit]) return 'volume';
  if (unitConversions.weight[normalizedUnit]) return 'weight';
  if (unitConversions.count[normalizedUnit]) return 'count';
  if (unitConversions.container[normalizedUnit]) return 'container';
  
  return 'unknown';
};

// Convert between units of the same type
export const convertWithinType = (quantity, fromUnit, toUnit, type) => {
  const normalizedFrom = fromUnit.toLowerCase().trim();
  const normalizedTo = toUnit.toLowerCase().trim();
  
  if (normalizedFrom === normalizedTo) return quantity;
  
  const conversions = unitConversions[type];
  if (!conversions || !conversions[normalizedFrom] || !conversions[normalizedTo]) {
    return null; // Cannot convert
  }
  
  // Convert to base unit, then to target unit
  const baseQuantity = quantity * conversions[normalizedFrom];
  return baseQuantity / conversions[normalizedTo];
};

// Convert between different unit types using ingredient densities
export const convertBetweenTypes = (quantity, fromUnit, toUnit, ingredientName) => {
  const fromType = getUnitType(fromUnit);
  const toType = getUnitType(toUnit);
  
  if (fromType === toType) {
    return convertWithinType(quantity, fromUnit, toUnit, fromType);
  }
  
  const normalizedIngredient = ingredientName.toLowerCase().trim();
  const density = ingredientDensities[normalizedIngredient];
  
  if (!density) {
    return null; // Cannot convert between types without density data
  }
  
  // Convert volume to weight
  if (fromType === 'volume' && toType === 'weight') {
    // First convert to cups
    const cups = convertWithinType(quantity, fromUnit, 'cup', 'volume');
    if (cups === null) return null;
    
    // Convert cups to ounces using density
    const ounces = cups * density.cupsToOz;
    
    // Convert ounces to target weight unit
    return convertWithinType(ounces, 'oz', toUnit, 'weight');
  }
  
  // Convert weight to volume
  if (fromType === 'weight' && toType === 'volume') {
    // First convert to ounces
    const ounces = convertWithinType(quantity, fromUnit, 'oz', 'weight');
    if (ounces === null) return null;
    
    // Convert ounces to cups using density
    const cups = ounces / density.cupsToOz;
    
    // Convert cups to target volume unit
    return convertWithinType(cups, 'cup', toUnit, 'volume');
  }
  
  return null; // Cannot convert other type combinations
};

// Main conversion function
export const convertUnits = (quantity, fromUnit, toUnit, ingredientName = '') => {
  if (!quantity || !fromUnit || !toUnit) return null;
  
  // Try within-type conversion first
  const fromType = getUnitType(fromUnit);
  const toType = getUnitType(toUnit);
  
  if (fromType === toType && fromType !== 'unknown') {
    return convertWithinType(quantity, fromUnit, toUnit, fromType);
  }
  
  // Try between-type conversion if ingredient name is provided
  if (ingredientName && (fromType === 'volume' || fromType === 'weight') && 
      (toType === 'volume' || toType === 'weight')) {
    return convertBetweenTypes(quantity, fromUnit, toUnit, ingredientName);
  }
  
  return null; // Cannot convert
};

// Helper function to format converted quantities nicely
export const formatConvertedQuantity = (quantity) => {
  if (quantity === null || quantity === undefined) return null;
  
  // Round to reasonable precision
  if (quantity >= 10) {
    return Math.round(quantity * 10) / 10; // 1 decimal place
  } else if (quantity >= 1) {
    return Math.round(quantity * 100) / 100; // 2 decimal places
  } else {
    return Math.round(quantity * 1000) / 1000; // 3 decimal places
  }
};

// Validation function to check if conversion is possible
export const canConvert = (fromUnit, toUnit, ingredientName = '') => {
  return convertUnits(1, fromUnit, toUnit, ingredientName) !== null;
};

export const convertRecipeToUserUnits = (recipeIngredients, userIngredients) => {
  return recipeIngredients.map(recipeIng => {
    // Find matching ingredient in user's pantry
    const userIngredient = userIngredients.find(userIng => 
      userIng.name.toLowerCase() === recipeIng.name.toLowerCase()
    );
    
    if (!userIngredient) {
      // User doesn't have this ingredient, return original
      return {
        ...recipeIng,
        displayQuantity: recipeIng.quantity,
        displayUnit: recipeIng.unit,
        isConverted: false,
        hasConversion: false,
        originalQuantity: recipeIng.quantity,
        originalUnit: recipeIng.unit
      };
    }
    
    // Check if units are the same
    if (userIngredient.unit === recipeIng.unit) {
      return {
        ...recipeIng,
        displayQuantity: recipeIng.quantity,
        displayUnit: recipeIng.unit,
        isConverted: false,
        hasConversion: false,
        originalQuantity: recipeIng.quantity,
        originalUnit: recipeIng.unit,
        userHasAmount: userIngredient.quantity
      };
    }
    
    // Try to convert to user's unit
    const convertedQuantity = convertUnits(
      recipeIng.quantity,
      recipeIng.unit,
      userIngredient.unit,
      recipeIng.name
    );
    
    if (convertedQuantity !== null) {
      return {
        ...recipeIng,
        displayQuantity: formatConvertedQuantity(convertedQuantity),
        displayUnit: userIngredient.unit,
        isConverted: true,
        hasConversion: true,
        originalQuantity: recipeIng.quantity,
        originalUnit: recipeIng.unit,
        userHasAmount: userIngredient.quantity
      };
    } else {
      // Conversion not possible, but mark that conversion could be helpful
      return {
        ...recipeIng,
        displayQuantity: recipeIng.quantity,
        displayUnit: recipeIng.unit,
        isConverted: false,
        hasConversion: true, // We know user has it in different units
        originalQuantity: recipeIng.quantity,
        originalUnit: recipeIng.unit,
        userHasAmount: userIngredient.quantity,
        userUnit: userIngredient.unit
      };
    }
  });
};

// Get all possible conversions for an ingredient
export const getAllConversionsForIngredient = (quantity, unit, ingredientName) => {
  const conversions = [];
  const unitType = getUnitType(unit);
  
  // Try converting to other units of the same type
  const relevantUnits = {
    volume: ['cup', 'tablespoon', 'teaspoon', 'pint', 'quart', 'liter'],
    weight: ['oz', 'lb', 'gram', 'kg'],
    count: ['piece', 'dozen']
  };
  
  if (unitType !== 'unknown' && relevantUnits[unitType]) {
    relevantUnits[unitType].forEach(targetUnit => {
      if (targetUnit !== unit.toLowerCase()) {
        const converted = convertWithinType(quantity, unit, targetUnit, unitType);
        if (converted !== null) {
          conversions.push({
            quantity: formatConvertedQuantity(converted),
            unit: targetUnit,
            type: 'same-type'
          });
        }
      }
    });
  }
  
  // Try converting between volume and weight if ingredient name is provided
  if (ingredientName) {
    const otherType = unitType === 'volume' ? 'weight' : 'volume';
    const otherUnits = unitType === 'volume' ? ['oz', 'lb'] : ['cup', 'tablespoon'];
    
    otherUnits.forEach(targetUnit => {
      const converted = convertBetweenTypes(quantity, unit, targetUnit, ingredientName);
      if (converted !== null) {
        conversions.push({
          quantity: formatConvertedQuantity(converted),
          unit: targetUnit,
          type: 'cross-type'
        });
      }
    });
  }
  
  return conversions;
};

// Preferred display units for different ingredient types in recipes
export const getPreferredRecipeUnit = (ingredientName, currentUnit) => {
  const normalizedName = ingredientName.toLowerCase();
  const currentType = getUnitType(currentUnit);
  
  // Define preferred recipe units for common ingredients
  const preferredUnits = {
    // Grains - prefer volume in recipes
    'rice': 'cup',
    'white rice': 'cup',
    'brown rice': 'cup',
    'flour': 'cup',
    'all purpose flour': 'cup',
    'wheat flour': 'cup',
    'bread flour': 'cup',
    'oats': 'cup',
    'quinoa': 'cup',
    'pasta': 'cup',
    
    // Sugar - prefer volume in recipes
    'sugar': 'cup',
    'brown sugar': 'cup',
    
    // Liquids - keep as volume
    'milk': 'cup',
    'water': 'cup',
    'oil': 'cup',
    'olive oil': 'tablespoon',
    'vegetable oil': 'tablespoon',
    
    // Butter - prefer weight or volume depending on current
    'butter': currentType === 'weight' ? 'oz' : 'cup',
    
    // Beans and legumes - prefer volume
    'beans': 'cup',
    'black beans': 'cup',
    'kidney beans': 'cup',
    'lentils': 'cup',
    'chickpeas': 'cup',
    
    // Nuts - prefer volume for small amounts
    'almonds': 'cup',
    'walnuts': 'cup',
    'pecans': 'cup',
    'peanuts': 'cup',
    
    // Vegetables - prefer volume for chopped
    'onions': 'cup',
    'onion': 'cup',
    'carrots': 'cup',
    'carrot': 'cup',
    'celery': 'cup',
    'tomatoes': 'cup',
    'tomato': 'cup',
    'potatoes': 'cup',
    'potato': 'cup',
    
    // Cheese - prefer volume for grated
    'cheese': 'cup',
    'cheddar cheese': 'cup',
    'mozzarella cheese': 'cup',
    'parmesan cheese': 'cup'
  };
  
  // Check if we have a preferred unit for this ingredient
  const preferred = preferredUnits[normalizedName];
  if (preferred) {
    return preferred;
  }
  
  // Default preferences based on current unit type
  if (currentType === 'weight') {
    // For weight units, prefer ounces for small amounts, pounds for large
    return 'oz';
  } else if (currentType === 'volume') {
    // For volume units, prefer cups
    return 'cup';
  }
  
  // Return current unit if no preference found
  return currentUnit;
};

// Convert ingredient to preferred recipe display unit
export const convertToRecipeDisplay = (ingredient, userIngredients) => {
  const userIngredient = userIngredients.find(userIng => 
    userIng.name.toLowerCase() === ingredient.name.toLowerCase()
  );
  
  if (!userIngredient) {
    // User doesn't have this ingredient, return as-is
    return {
      ...ingredient,
      displayQuantity: ingredient.quantity,
      displayUnit: ingredient.unit,
      isConverted: false,
      hasConversion: false,
      originalQuantity: ingredient.quantity,
      originalUnit: ingredient.unit
    };
  }
  
  // Get preferred recipe display unit
  const preferredUnit = getPreferredRecipeUnit(ingredient.name, userIngredient.unit);
  
  // If the ingredient is already in preferred unit, no conversion needed
  if (ingredient.unit === preferredUnit) {
    return {
      ...ingredient,
      displayQuantity: ingredient.quantity,
      displayUnit: ingredient.unit,
      isConverted: false,
      hasConversion: true,
      originalQuantity: ingredient.quantity,
      originalUnit: ingredient.unit,
      userHasAmount: userIngredient.quantity,
      userUnit: userIngredient.unit
    };
  }
  
  // Try to convert to preferred unit for display
  const convertedToPreferred = convertUnits(
    ingredient.quantity,
    ingredient.unit,
    preferredUnit,
    ingredient.name
  );
  
  if (convertedToPreferred !== null) {
    return {
      ...ingredient,
      displayQuantity: formatConvertedQuantity(convertedToPreferred),
      displayUnit: preferredUnit,
      isConverted: true,
      hasConversion: true,
      originalQuantity: ingredient.quantity,
      originalUnit: ingredient.unit,
      userHasAmount: userIngredient.quantity,
      userUnit: userIngredient.unit,
      recipeDisplayConversion: true
    };
  }
  
  // If conversion to preferred unit fails, try converting to user's unit
  const convertedToUser = convertUnits(
    ingredient.quantity,
    ingredient.unit,
    userIngredient.unit,
    ingredient.name
  );
  
  if (convertedToUser !== null) {
    return {
      ...ingredient,
      displayQuantity: formatConvertedQuantity(convertedToUser),
      displayUnit: userIngredient.unit,
      isConverted: true,
      hasConversion: true,
      originalQuantity: ingredient.quantity,
      originalUnit: ingredient.unit,
      userHasAmount: userIngredient.quantity,
      userUnit: userIngredient.unit
    };
  }
  
  // No conversion possible
  return {
    ...ingredient,
    displayQuantity: ingredient.quantity,
    displayUnit: ingredient.unit,
    isConverted: false,
    hasConversion: true,
    originalQuantity: ingredient.quantity,
    originalUnit: ingredient.unit,
    userHasAmount: userIngredient.quantity,
    userUnit: userIngredient.unit
  };
};

// Scale recipe ingredients and instructions based on serving size
export const scaleRecipe = (recipe, newServings) => {
  const originalServings = recipe.servings || 4;
  const scaleFactor = newServings / originalServings;
  
  // Scale ingredients
  const scaledIngredients = recipe.ingredients.map(ingredient => ({
    ...ingredient,
    quantity: formatConvertedQuantity(ingredient.quantity * scaleFactor)
  }));
  
  // Scale instruction durations (with some logic to prevent unrealistic times)
  const scaledInstructions = recipe.instructions.map(instruction => {
    let scaledDuration = instruction.duration;
    
    // Only scale prep-related durations, not cooking times
    const prepKeywords = ['mix', 'chop', 'dice', 'combine', 'whisk', 'stir', 'blend'];
    const isPrep = prepKeywords.some(keyword => 
      instruction.instruction.toLowerCase().includes(keyword)
    );
    
    if (isPrep && scaleFactor > 1) {
      // Increase prep time for larger batches, but cap the increase
      scaledDuration = Math.ceil(instruction.duration * Math.min(scaleFactor, 2));
    }
    
    return {
      ...instruction,
      duration: scaledDuration
    };
  });
  
  return {
    ...recipe,
    servings: newServings,
    ingredients: scaledIngredients,
    instructions: scaledInstructions,
    scaledFrom: originalServings,
    isScaled: newServings !== originalServings
  };
};