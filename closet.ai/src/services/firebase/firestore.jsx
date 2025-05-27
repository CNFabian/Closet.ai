import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';

// Update ingredient with all fields
export const updateIngredient = async (ingredientId, ingredientData) => {
  try {
    const docRef = doc(db, 'ingredients', ingredientId);
    
    // Prepare the update data
    const updateData = {
      name: ingredientData.name,
      quantity: parseFloat(ingredientData.quantity) || 0,
      unit: ingredientData.unit || '',
      category: ingredientData.category || 'Other',
      updatedAt: Timestamp.now()
    };

    // Only add expiration date if it exists, otherwise remove it
    if (ingredientData.expirationDate) {
      updateData.expirationDate = ingredientData.expirationDate instanceof Date 
        ? Timestamp.fromDate(ingredientData.expirationDate)
        : Timestamp.fromDate(new Date(ingredientData.expirationDate));
    } else {
      // If no expiration date, explicitly remove it
      updateData.expirationDate = null;
    }

    await updateDoc(docRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating ingredient:', error);
    throw error;
  }
};

// Save a recipe to the savedRecipes collection
export const saveRecipe = async (recipeData) => {
  try {
    const docRef = await addDoc(collection(db, 'savedRecipes'), {
      ...recipeData,
      savedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving recipe:', error);
    throw error;
  }
};

// Get saved recipes
export const getSavedRecipes = async () => {
  try {
    const querySnapshot = await getDocs(
      query(collection(db, 'savedRecipes'), orderBy('savedAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting saved recipes:', error);
    throw error;
  }
};

// Add ingredient with quantity tracking
export const addIngredient = async (ingredientData) => {
  try {
    const docRef = await addDoc(collection(db, 'ingredients'), {
      name: ingredientData.name,
      quantity: parseFloat(ingredientData.quantity) || 0,
      unit: ingredientData.unit || '',
      category: ingredientData.category || 'Other',
      expirationDate: ingredientData.expirationDate || null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding ingredient:', error);
    throw error;
  }
};

// Update ingredient quantity
export const updateIngredientQuantity = async (ingredientId, newQuantity) => {
  try {
    const docRef = doc(db, 'ingredients', ingredientId);
    await updateDoc(docRef, {
      quantity: parseFloat(newQuantity),
      updatedAt: Timestamp.now()
    });
    return true;
  } catch (error) {
    console.error('Error updating ingredient quantity:', error);
    throw error;
  }
};

// Subtract ingredients used in recipe (batch operation for consistency)
export const subtractRecipeIngredients = async (usedIngredients) => {
  try {
    const batch = writeBatch(db);
    
    // Get current ingredient quantities
    const ingredientsSnapshot = await getDocs(collection(db, 'ingredients'));
    const currentIngredients = {};
    
    ingredientsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      currentIngredients[data.name.toLowerCase()] = {
        id: doc.id,
        quantity: data.quantity,
        unit: data.unit,
        ...data
      };
    });
    
    // Process each used ingredient
    for (const usedIngredient of usedIngredients) {
      const ingredientKey = usedIngredient.name.toLowerCase();
      const currentIngredient = currentIngredients[ingredientKey];
      
      if (currentIngredient) {
        // Convert quantities to same unit if needed (simplified conversion)
        let quantityToSubtract = usedIngredient.quantity;
        
        // Basic unit conversion (you may want to expand this)
        if (currentIngredient.unit !== usedIngredient.unit) {
          quantityToSubtract = convertUnits(
            usedIngredient.quantity, 
            usedIngredient.unit, 
            currentIngredient.unit
          );
        }
        
        const newQuantity = Math.max(0, currentIngredient.quantity - quantityToSubtract);
        
        const docRef = doc(db, 'ingredients', currentIngredient.id);
        batch.update(docRef, {
          quantity: newQuantity,
          updatedAt: Timestamp.now()
        });
      }
    }
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error subtracting recipe ingredients:', error);
    throw error;
  }
};

// Basic unit conversion function (expand as needed)
const convertUnits = (quantity, fromUnit, toUnit) => {
  const conversions = {
    // Volume conversions (simplified)
    'cup_to_tablespoon': 16,
    'tablespoon_to_teaspoon': 3,
    'cup_to_teaspoon': 48,
    // Add more conversions as needed
  };
  
  const conversionKey = `${fromUnit}_to_${toUnit}`;
  const reverseKey = `${toUnit}_to_${fromUnit}`;
  
  if (conversions[conversionKey]) {
    return quantity * conversions[conversionKey];
  } else if (conversions[reverseKey]) {
    return quantity / conversions[reverseKey];
  }
  
  // If no conversion available, return original quantity
  return quantity;
};

// Check if recipe can be made with available ingredients
export const validateRecipeIngredients = async (recipeIngredients) => {
  try {
    const ingredientsSnapshot = await getDocs(collection(db, 'ingredients'));
    const availableIngredients = {};
    
    ingredientsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      availableIngredients[data.name.toLowerCase()] = {
        quantity: data.quantity,
        unit: data.unit,
        ...data
      };
    });
    
    const validation = {
      canMake: true,
      missingIngredients: [],
      insufficientIngredients: []
    };
    
    for (const ingredient of recipeIngredients) {
      const ingredientKey = ingredient.name.toLowerCase();
      const available = availableIngredients[ingredientKey];
      
      if (!available) {
        validation.canMake = false;
        validation.missingIngredients.push(ingredient);
      } else {
        // Check if we have enough quantity
        let requiredQuantity = ingredient.quantity;
        
        // Convert units if different
        if (available.unit !== ingredient.unit) {
          requiredQuantity = convertUnits(
            ingredient.quantity, 
            ingredient.unit, 
            available.unit
          );
        }
        
        if (available.quantity < requiredQuantity) {
          validation.canMake = false;
          validation.insufficientIngredients.push({
            ...ingredient,
            available: available.quantity,
            required: requiredQuantity,
            unit: available.unit
          });
        }
      }
    }
    
    return validation;
  } catch (error) {
    console.error('Error validating recipe ingredients:', error);
    throw error;
  }
};

// Get all ingredients with quantities
export const getIngredientsWithQuantities = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'ingredients'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting ingredients:', error);
    throw error;
  }
};

// Legacy support - keeping existing functions
export const addDocument = async (collectionName, data) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      name: data,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const getDocument = async (collectionName, docId) => {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
};

export const getCollection = async (collectionName) => {
  const array = [];
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    querySnapshot.forEach((doc) => {
      array.push({ id: doc.id, ...doc.data() });
    });
  } catch (error) {
    throw error;
  } finally {
    return array;
  }
};

export const queryDocuments = async (collectionName, conditions = [], sortBy = null, limitTo = null) => {
  try {
    let q = collection(db, collectionName);
    
    if (conditions.length > 0) {
      conditions.forEach(condition => {
        q = query(q, where(condition.field, condition.operator, condition.value));
      });
    }
    
    if (sortBy) {
      q = query(q, orderBy(sortBy.field, sortBy.direction || 'asc'));
    }
    
    if (limitTo) {
      q = query(q, limit(limitTo));
    }
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

export const updateDocument = async (collectionName, docId, data) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
    return true;
  } catch (error) {
    throw error;
  }
};

export const deleteDocument = async (collectionName, docId) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    throw error;
  }
};