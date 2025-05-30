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
import { auth } from './config';

// Helper function to get current user ID
const getCurrentUserId = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.uid;
};

// Update ingredient with all fields (user-specific)
export const updateIngredient = async (ingredientId, ingredientData) => {
  try {
    const userId = getCurrentUserId();
    const docRef = doc(db, 'ingredients', ingredientId);
    
    // First check if the ingredient belongs to the current user
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().userId !== userId) {
      throw new Error('Ingredient not found or access denied');
    }
    
    // Prepare the update data
    const updateData = {
      name: ingredientData.name,
      quantity: parseFloat(ingredientData.quantity) || 0,
      unit: ingredientData.unit || '',
      category: ingredientData.category || 'Other',
      updatedAt: Timestamp.now(),
      userId: userId // Ensure userId is maintained
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

// Save a recipe to the savedRecipes collection (user-specific)
export const saveRecipe = async (recipeData) => {
  try {
    const userId = getCurrentUserId();
    
    const docRef = await addDoc(collection(db, 'savedRecipes'), {
      ...recipeData,
      userId: userId,
      savedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving recipe:', error);
    throw error;
  }
};

// Get saved recipes (user-specific)
export const getSavedRecipes = async () => {
  try {
    const userId = getCurrentUserId();
    
    const querySnapshot = await getDocs(
      query(
        collection(db, 'savedRecipes'), 
        where('userId', '==', userId),
        orderBy('savedAt', 'desc')
      )
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

// Add ingredient with quantity tracking (user-specific)
export const addIngredient = async (ingredientData) => {
  try {
    const userId = getCurrentUserId();
    
    const docRef = await addDoc(collection(db, 'ingredients'), {
      name: ingredientData.name,
      quantity: parseFloat(ingredientData.quantity) || 0,
      unit: ingredientData.unit || '',
      category: ingredientData.category || 'Other',
      expirationDate: ingredientData.expirationDate || null,
      userId: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding ingredient:', error);
    throw error;
  }
};

// Update ingredient quantity (user-specific)
export const updateIngredientQuantity = async (ingredientId, newQuantity) => {
  try {
    const userId = getCurrentUserId();
    const docRef = doc(db, 'ingredients', ingredientId);
    
    // First check if the ingredient belongs to the current user
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().userId !== userId) {
      throw new Error('Ingredient not found or access denied');
    }
    
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

// Delete ingredient (user-specific)
export const deleteIngredient = async (ingredientId) => {
  try {
    const userId = getCurrentUserId();
    const docRef = doc(db, 'ingredients', ingredientId);
    
    // First check if the ingredient belongs to the current user
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().userId !== userId) {
      throw new Error('Ingredient not found or access denied');
    }
    
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    throw error;
  }
};

// Subtract ingredients used in recipe (batch operation for consistency) - user-specific
export const subtractRecipeIngredients = async (usedIngredients) => {
  try {
    const userId = getCurrentUserId();
    const batch = writeBatch(db);
    
    // Get current user's ingredient quantities
    const ingredientsSnapshot = await getDocs(
      query(
        collection(db, 'ingredients'),
        where('userId', '==', userId)
      )
    );
    
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

// Check if recipe can be made with available ingredients (user-specific)
export const validateRecipeIngredients = async (recipeIngredients) => {
  try {
    const userId = getCurrentUserId();
    
    const ingredientsSnapshot = await getDocs(
      query(
        collection(db, 'ingredients'),
        where('userId', '==', userId)
      )
    );
    
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

// Get all ingredients with quantities (user-specific)
export const getIngredientsWithQuantities = async () => {
  try {
    const userId = getCurrentUserId();
    
    const querySnapshot = await getDocs(
      query(
        collection(db, 'ingredients'),
        where('userId', '==', userId)
      )
    );
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting ingredients:', error);
    throw error;
  }
};

// Updated legacy support functions with user authorization
export const addDocument = async (collectionName, data) => {
  try {
    const userId = getCurrentUserId();
    
    const docRef = await addDoc(collection(db, collectionName), {
      name: data,
      userId: userId,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const getDocument = async (collectionName, docId) => {
  try {
    const userId = getCurrentUserId();
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      // Check if document belongs to current user
      if (data.userId !== userId) {
        throw new Error('Access denied');
      }
      return { id: docSnap.id, ...data };
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
};

// Updated getCollection to be user-specific
export const getCollection = async (collectionName, userIdOverride = null) => {
  const array = [];
  try {
    const userId = userIdOverride || getCurrentUserId();
    
    const querySnapshot = await getDocs(
      query(
        collection(db, collectionName),
        where('userId', '==', userId)
      )
    );
    
    querySnapshot.forEach((doc) => {
      array.push({ id: doc.id, ...doc.data() });
    });
  } catch (error) {
    throw error;
  } finally {
    return array;
  }
};

// Updated queryDocuments to be user-specific
export const queryDocuments = async (collectionName, conditions = [], sortBy = null, limitTo = null) => {
  try {
    const userId = getCurrentUserId();
    
    let q = collection(db, collectionName);
    
    // Always add user filter first
    q = query(q, where('userId', '==', userId));
    
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
    const userId = getCurrentUserId();
    const docRef = doc(db, collectionName, docId);
    
    // First check if the document belongs to the current user
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().userId !== userId) {
      throw new Error('Document not found or access denied');
    }
    
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
    const userId = getCurrentUserId();
    const docRef = doc(db, collectionName, docId);
    
    // First check if the document belongs to the current user
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().userId !== userId) {
      throw new Error('Document not found or access denied');
    }
    
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    throw error;
  }
};