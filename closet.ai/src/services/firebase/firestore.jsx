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
import { convertUnits, formatConvertedQuantity } from '../../utils/unitConversions';

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
    
    // First get the old data for history tracking
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().userId !== userId) {
      throw new Error('Ingredient not found or access denied');
    }
    
    const oldData = docSnap.data();
    
    // Prepare the update data
    const updateData = {
      name: ingredientData.name,
      quantity: parseFloat(ingredientData.quantity) || 0,
      unit: ingredientData.unit || '',
      category: ingredientData.category || 'Other',
      updatedAt: Timestamp.now(),
      userId: userId
    };

    if (ingredientData.expirationDate) {
      updateData.expirationDate = ingredientData.expirationDate instanceof Date 
        ? Timestamp.fromDate(ingredientData.expirationDate)
        : Timestamp.fromDate(new Date(ingredientData.expirationDate));
    } else {
      updateData.expirationDate = null;
    }

    await updateDoc(docRef, updateData);

    // Add history entry
    const changes = [];
    if (oldData.name !== ingredientData.name) {
      changes.push(`name: ${oldData.name} → ${ingredientData.name}`);
    }
    if (oldData.quantity !== parseFloat(ingredientData.quantity)) {
      changes.push(`quantity: ${oldData.quantity} → ${parseFloat(ingredientData.quantity)}`);
    }
    if (oldData.unit !== ingredientData.unit) {
      changes.push(`unit: ${oldData.unit} → ${ingredientData.unit}`);
    }

    if (changes.length > 0) {
      await addHistoryEntry({
        type: 'ingredient_updated',
        action: 'Updated ingredient',
        details: {
          ingredientName: ingredientData.name,
          oldData: {
            name: oldData.name,
            quantity: oldData.quantity,
            unit: oldData.unit
          },
          newData: {
            name: ingredientData.name,
            quantity: parseFloat(ingredientData.quantity),
            unit: ingredientData.unit
          },
          changes: changes
        },
        description: `Updated ${ingredientData.name}: ${changes.join(', ')}`
      });
    }

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

    // Add history entry
    await addHistoryEntry({
      type: 'recipe_saved',
      action: 'Saved recipe',
      details: {
        recipeName: recipeData.name,
        difficulty: recipeData.difficulty,
        servings: recipeData.servings,
        totalTime: recipeData.totalTime,
        ingredientCount: recipeData.ingredients ? recipeData.ingredients.length : 0
      },
      description: `Saved recipe: ${recipeData.name}`
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

    // Add history entry
    await addHistoryEntry({
      type: 'ingredient_added',
      action: 'Added ingredient',
      details: {
        ingredientName: ingredientData.name,
        quantity: parseFloat(ingredientData.quantity) || 0,
        unit: ingredientData.unit || '',
        category: ingredientData.category || 'Other'
      },
      description: `Added ${ingredientData.quantity} ${ingredientData.unit} of ${ingredientData.name}`
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
        name: data.name,
        ...data
      };
    });
    
    const conversionResults = [];
    
    // Process each used ingredient with proper conversion
    for (const usedIngredient of usedIngredients) {
      const ingredientKey = usedIngredient.name.toLowerCase();
      const currentIngredient = currentIngredients[ingredientKey];
      
      if (currentIngredient) {
        let quantityToSubtract = usedIngredient.quantity;
        let conversionInfo = `${usedIngredient.quantity} ${usedIngredient.unit}`;
        
        // Try to convert units if they're different
        if (currentIngredient.unit !== usedIngredient.unit) {
          const convertedQuantity = convertUnits(
            usedIngredient.quantity,
            usedIngredient.unit,
            currentIngredient.unit,
            usedIngredient.name
          );
          
          if (convertedQuantity !== null) {
            quantityToSubtract = formatConvertedQuantity(convertedQuantity);
            conversionInfo = `${usedIngredient.quantity} ${usedIngredient.unit} → ${quantityToSubtract} ${currentIngredient.unit}`;
          } else {
            // Log conversion failure but continue with original quantity
            console.warn(`Could not convert ${usedIngredient.quantity} ${usedIngredient.unit} to ${currentIngredient.unit} for ${usedIngredient.name}. Using original quantity.`);
            conversionInfo = `${usedIngredient.quantity} ${usedIngredient.unit} (no conversion available)`;
          }
        }
        
        const newQuantity = Math.max(0, currentIngredient.quantity - quantityToSubtract);
        
        conversionResults.push({
          name: usedIngredient.name,
          originalUsed: `${usedIngredient.quantity} ${usedIngredient.unit}`,
          actualSubtracted: `${quantityToSubtract} ${currentIngredient.unit}`,
          previousQuantity: currentIngredient.quantity,
          newQuantity: newQuantity,
          conversion: conversionInfo
        });
        
        const docRef = doc(db, 'ingredients', currentIngredient.id);
        batch.update(docRef, {
          quantity: newQuantity,
          updatedAt: Timestamp.now()
        });
      } else {
        console.warn(`Ingredient "${usedIngredient.name}" not found in pantry`);
      }
    }
    
    // Commit the batch first
    await batch.commit();
    
    // Then add history entry with detailed conversion info
    try {
      const usedIngredientsList = conversionResults.map(result => 
        result.conversion
      ).join(', ');

      await addHistoryEntry({
        type: 'recipe_cooked',
        action: 'Cooked recipe',
        details: {
          ingredientsUsed: usedIngredients,
          conversionResults: conversionResults,
          totalIngredients: usedIngredients.length
        },
        description: `Used ingredients for cooking: ${usedIngredientsList}`
      });
    } catch (historyError) {
      console.error('Error adding history entry:', historyError);
    }
    
    // Log conversion results for debugging
    console.log('Ingredient conversion results:', conversionResults);
    
    return {
      success: true,
      conversions: conversionResults
    };
  } catch (error) {
    console.error('Error subtracting recipe ingredients:', error);
    throw error;
  }
};

// Update the validateRecipeIngredients function
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
        name: data.name,
        ...data
      };
    });
    
    const validation = {
      canMake: true,
      missingIngredients: [],
      insufficientIngredients: [],
      conversionIssues: []
    };
    
    for (const ingredient of recipeIngredients) {
      const ingredientKey = ingredient.name.toLowerCase();
      const available = availableIngredients[ingredientKey];
      
      if (!available) {
        validation.canMake = false;
        validation.missingIngredients.push(ingredient);
      } else {
        let requiredQuantity = ingredient.quantity;
        let conversionSuccessful = true;
        
        // Try to convert units if different
        if (available.unit !== ingredient.unit) {
          const convertedQuantity = convertUnits(
            ingredient.quantity,
            ingredient.unit,
            available.unit,
            ingredient.name
          );
          
          if (convertedQuantity !== null) {
            requiredQuantity = convertedQuantity;
          } else {
            conversionSuccessful = false;
            validation.conversionIssues.push({
              ...ingredient,
              availableUnit: available.unit,
              message: `Cannot convert ${ingredient.unit} to ${available.unit} for ${ingredient.name}`
            });
          }
        }
        
        if (conversionSuccessful && available.quantity < requiredQuantity) {
          validation.canMake = false;
          validation.insufficientIngredients.push({
            ...ingredient,
            available: available.quantity,
            required: formatConvertedQuantity(requiredQuantity),
            unit: available.unit,
            originalRequired: `${ingredient.quantity} ${ingredient.unit}`,
            converted: available.unit !== ingredient.unit
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

// History tracking functions
export const addHistoryEntry = async (entryData) => {
  try {
    const userId = getCurrentUserId();
    
    const docRef = await addDoc(collection(db, 'history'), {
      ...entryData,
      userId: userId,
      timestamp: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding history entry:', error);
    throw error;
  }
};

export const getHistory = async (limitTo = 50) => {
  try {
    const userId = getCurrentUserId();
    
    const querySnapshot = await getDocs(
      query(
        collection(db, 'history'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitTo)
      )
    );
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting history:', error);
    throw error;
  }
};

export const getHistoryByType = async (type, limitTo = 20) => {
  try {
    const userId = getCurrentUserId();
    
    const querySnapshot = await getDocs(
      query(
        collection(db, 'history'),
        where('userId', '==', userId),
        where('type', '==', type),
        orderBy('timestamp', 'desc'),
        limit(limitTo)
      )
    );
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting history by type:', error);
    throw error;
  }
};

export const getHistoryByDateRange = async (startDate, endDate) => {
  try {
    const userId = getCurrentUserId();
    
    const querySnapshot = await getDocs(
      query(
        collection(db, 'history'),
        where('userId', '==', userId),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate)),
        orderBy('timestamp', 'desc')
      )
    );
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting history by date range:', error);
    throw error;
  }
};