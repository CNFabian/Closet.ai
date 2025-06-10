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

// Update ingredient with automatic trash handling
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

    // Handle trash status based on quantity
    if (updateData.quantity <= 0) {
      updateData.inTrash = true;
      updateData.trashedAt = updateData.trashedAt || Timestamp.now();
    } else {
      updateData.inTrash = false;
      updateData.trashedAt = null;
    }

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
      let historyType = 'ingredient_updated';
      let description = `Updated ${ingredientData.name}: ${changes.join(', ')}`;
      
      if (updateData.quantity <= 0 && !oldData.inTrash) {
        historyType = 'ingredient_trashed';
        description = `${description} (moved to trash - quantity reached 0)`;
      } else if (updateData.quantity > 0 && oldData.inTrash) {
        historyType = 'ingredient_restored';
        description = `${description} (restored from trash)`;
      }

      await addHistoryEntry({
        type: historyType,
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
          changes: changes,
          movedToTrash: updateData.quantity <= 0 && !oldData.inTrash,
          restoredFromTrash: updateData.quantity > 0 && oldData.inTrash
        },
        description: description
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

// Add ingredient with duplicate checking and trash cleanup
export const addIngredient = async (ingredientData) => {
  try {
    const userId = getCurrentUserId();
    
    // Check for duplicates
    const duplicateCheck = await checkForDuplicateIngredient(ingredientData.name);
    
    if (duplicateCheck.hasActive) {
      throw new Error('DUPLICATE_ACTIVE');
    }
    
    // If there are trashed ingredients with the same name, delete them
    if (duplicateCheck.hasTrashed) {
      const batch = writeBatch(db);
      duplicateCheck.trashedIngredients.forEach(trashedItem => {
        batch.delete(doc(db, 'ingredients', trashedItem.id));
      });
      await batch.commit();
    }
    
    const docRef = await addDoc(collection(db, 'ingredients'), {
      name: ingredientData.name,
      quantity: parseFloat(ingredientData.quantity) || 0,
      unit: ingredientData.unit || '',
      category: ingredientData.category || 'Other',
      expirationDate: ingredientData.expirationDate || null,
      userId: userId,
      inTrash: false,
      trashedAt: null,
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
        
        // If quantity reaches 0, move to trash automatically
        if (newQuantity <= 0) {
          batch.update(docRef, {
            quantity: newQuantity,
            inTrash: true,
            trashedAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
        } else {
          batch.update(docRef, {
            quantity: newQuantity,
            updatedAt: Timestamp.now()
          });
        }
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

      const trashedItems = conversionResults.filter(result => result.newQuantity <= 0);
      let description = `Used ingredients for cooking: ${usedIngredientsList}`;
      
      if (trashedItems.length > 0) {
        const trashedNames = trashedItems.map(item => item.name).join(', ');
        description += `. Moved ${trashedItems.length} item${trashedItems.length === 1 ? '' : 's'} to trash: ${trashedNames}`;
      }

      await addHistoryEntry({
        type: 'recipe_cooked',
        action: 'Cooked recipe',
        details: {
          ingredientsUsed: usedIngredients,
          conversionResults: conversionResults,
          totalIngredients: usedIngredients.length,
          itemsMovedToTrash: trashedItems.length,
          trashedItems: trashedItems.map(item => item.name)
        },
        description: description
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

// Updated getCollection to handle missing inTrash field
export const getCollection = async (collectionName, userIdOverride = null, includeTrash = false) => {
  const array = [];
  try {
    const userId = userIdOverride || getCurrentUserId();
    
    let q = query(
      collection(db, collectionName),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // For ingredients collection, filter based on trash status
      if (collectionName === 'ingredients') {
        // If includeTrash is false, only include items that are not in trash
        // This handles both inTrash: false and missing inTrash field
        if (!includeTrash && data.inTrash === true) {
          return; // Skip items that are explicitly in trash
        }
        // If includeTrash is true, include everything
        // If inTrash field is missing, treat as not in trash (for backward compatibility)
      }
      
      array.push({ id: doc.id, ...data });
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

// Trash-related functions
export const moveToTrash = async (ingredientId) => {
  try {
    const userId = getCurrentUserId();
    const docRef = doc(db, 'ingredients', ingredientId);
    
    // First check if the ingredient belongs to the current user
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().userId !== userId) {
      throw new Error('Ingredient not found or access denied');
    }
    
    const ingredientData = docSnap.data();
    
    await updateDoc(docRef, {
      inTrash: true,
      trashedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    // Add history entry
    await addHistoryEntry({
      type: 'ingredient_trashed',
      action: 'Moved ingredient to trash',
      details: {
        ingredientName: ingredientData.name,
        quantity: ingredientData.quantity,
        unit: ingredientData.unit
      },
      description: `Moved ${ingredientData.name} to trash (quantity reached 0)`
    });

    return true;
  } catch (error) {
    console.error('Error moving ingredient to trash:', error);
    throw error;
  }
};

export const restoreFromTrash = async (ingredientId) => {
  try {
    const userId = getCurrentUserId();
    const docRef = doc(db, 'ingredients', ingredientId);
    
    // First check if the ingredient belongs to the current user
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().userId !== userId) {
      throw new Error('Ingredient not found or access denied');
    }
    
    const ingredientData = docSnap.data();
    
    await updateDoc(docRef, {
      inTrash: false,
      trashedAt: null,
      updatedAt: Timestamp.now()
    });

    // Add history entry
    await addHistoryEntry({
      type: 'ingredient_restored',
      action: 'Restored ingredient from trash',
      details: {
        ingredientName: ingredientData.name,
        quantity: ingredientData.quantity,
        unit: ingredientData.unit
      },
      description: `Restored ${ingredientData.name} from trash`
    });

    return true;
  } catch (error) {
    console.error('Error restoring ingredient from trash:', error);
    throw error;
  }
};

export const permanentlyDeleteIngredient = async (ingredientId) => {
  try {
    const userId = getCurrentUserId();
    const docRef = doc(db, 'ingredients', ingredientId);
    
    // First check if the ingredient belongs to the current user
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().userId !== userId) {
      throw new Error('Ingredient not found or access denied');
    }
    
    const ingredientData = docSnap.data();
    
    await deleteDoc(docRef);

    // Add history entry
    await addHistoryEntry({
      type: 'ingredient_deleted',
      action: 'Permanently deleted ingredient',
      details: {
        ingredientName: ingredientData.name,
        quantity: ingredientData.quantity,
        unit: ingredientData.unit
      },
      description: `Permanently deleted ${ingredientData.name}`
    });

    return true;
  } catch (error) {
    console.error('Error permanently deleting ingredient:', error);
    throw error;
  }
};

export const getTrashIngredients = async () => {
  try {
    const userId = getCurrentUserId();
    
    const querySnapshot = await getDocs(
      query(
        collection(db, 'ingredients'),
        where('userId', '==', userId),
        where('inTrash', '==', true),
        orderBy('trashedAt', 'desc')
      )
    );
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting trash ingredients:', error);
    throw error;
  }
};

export const cleanupOldTrashItems = async () => {
  try {
    const userId = getCurrentUserId();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const querySnapshot = await getDocs(
      query(
        collection(db, 'ingredients'),
        where('userId', '==', userId),
        where('inTrash', '==', true),
        where('trashedAt', '<=', Timestamp.fromDate(twentyFourHoursAgo))
      )
    );
    
    const batch = writeBatch(db);
    querySnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    if (querySnapshot.docs.length > 0) {
      await batch.commit();
      console.log(`Cleaned up ${querySnapshot.docs.length} old trash items`);
    }
    
    return querySnapshot.docs.length;
  } catch (error) {
    console.error('Error cleaning up trash items:', error);
    throw error;
  }
};

// Clean up old history entries (older than 7 days)
export const cleanupOldHistoryEntries = async () => {
  try {
    const userId = getCurrentUserId();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const querySnapshot = await getDocs(
      query(
        collection(db, 'history'),
        where('userId', '==', userId),
        where('timestamp', '<=', Timestamp.fromDate(sevenDaysAgo))
      )
    );
    
    const batch = writeBatch(db);
    querySnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    if (querySnapshot.docs.length > 0) {
      await batch.commit();
      console.log(`Cleaned up ${querySnapshot.docs.length} old history entries`);
    }
    
    return querySnapshot.docs.length;
  } catch (error) {
    console.error('Error cleaning up history entries:', error);
    throw error;
  }
};

export const checkForDuplicateIngredient = async (ingredientName) => {
  try {
    const userId = getCurrentUserId();
    
    // Check for active ingredients (not in trash)
    const activeQuery = query(
      collection(db, 'ingredients'),
      where('userId', '==', userId),
      where('name', '==', ingredientName.trim())
    );
    
    const activeSnapshot = await getDocs(activeQuery);
    const activeIngredients = activeSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(ing => !ing.inTrash);
    
    // Check for trashed ingredients
    const trashedIngredients = activeSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(ing => ing.inTrash);
    
    return {
      hasActive: activeIngredients.length > 0,
      hasTrashed: trashedIngredients.length > 0,
      activeIngredient: activeIngredients[0] || null,
      trashedIngredients: trashedIngredients
    };
  } catch (error) {
    console.error('Error checking for duplicate ingredient:', error);
    throw error;
  }
};

// Notification functions
export const addNotification = async (notificationData) => {
  try {
    const userId = getCurrentUserId();
    
    const docRef = await addDoc(collection(db, 'notifications'), {
      ...notificationData,
      userId: userId,
      read: false,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding notification:', error);
    throw error;
  }
};

export const getNotifications = async (limitTo = 20) => {
  try {
    const userId = getCurrentUserId();
    
    const querySnapshot = await getDocs(
      query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitTo)
      )
    );
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting notifications:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    const userId = getCurrentUserId();
    const docRef = doc(db, 'notifications', notificationId);
    
    // First check if the notification belongs to the current user
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().userId !== userId) {
      throw new Error('Notification not found or access denied');
    }
    
    await updateDoc(docRef, {
      read: true,
      readAt: Timestamp.now()
    });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

export const markAllNotificationsAsRead = async () => {
  try {
    const userId = getCurrentUserId();
    
    const querySnapshot = await getDocs(
      query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      )
    );
    
    const batch = writeBatch(db);
    querySnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        read: true,
        readAt: Timestamp.now()
      });
    });
    
    if (querySnapshot.docs.length > 0) {
      await batch.commit();
    }
    
    return querySnapshot.docs.length;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

export const cleanupOldNotifications = async () => {
  try {
    const userId = getCurrentUserId();
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const querySnapshot = await getDocs(
      query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('createdAt', '<=', Timestamp.fromDate(oneWeekAgo))
      )
    );
    
    const batch = writeBatch(db);
    querySnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    if (querySnapshot.docs.length > 0) {
      await batch.commit();
      console.log(`Cleaned up ${querySnapshot.docs.length} old notifications`);
    }
    
    return querySnapshot.docs.length;
  } catch (error) {
    console.error('Error cleaning up notifications:', error);
    throw error;
  }
};

export const checkExpiringIngredients = async () => {
  try {
    const userId = getCurrentUserId();
    const today = new Date();
    const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    
    // Get all active ingredients with expiration dates
    const querySnapshot = await getDocs(
      query(
        collection(db, 'ingredients'),
        where('userId', '==', userId),
        where('inTrash', '!=', true)
      )
    );
    
    const expiringIngredients = [];
    
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.expirationDate) {
        const expDate = data.expirationDate.toDate ? data.expirationDate.toDate() : new Date(data.expirationDate);
        const daysUntilExpiration = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiration >= 0 && daysUntilExpiration <= 3) {
          expiringIngredients.push({
            id: doc.id,
            ...data,
            daysUntilExpiration,
            expirationDate: expDate
          });
        }
      }
    });
    
    // Create notifications for expiring ingredients
    for (const ingredient of expiringIngredients) {
      let urgencyLevel = 'low';
      let message = '';
      
      if (ingredient.daysUntilExpiration === 0) {
        urgencyLevel = 'high';
        message = `${ingredient.name} expires today!`;
      } else if (ingredient.daysUntilExpiration === 1) {
        urgencyLevel = 'high';
        message = `${ingredient.name} expires tomorrow!`;
      } else if (ingredient.daysUntilExpiration === 2) {
        urgencyLevel = 'medium';
        message = `${ingredient.name} expires in 2 days`;
      } else if (ingredient.daysUntilExpiration === 3) {
        urgencyLevel = 'low';
        message = `${ingredient.name} expires in 3 days`;
      }
      
      // Check if we already have a notification for this ingredient today
      const existingNotifications = await getDocs(
        query(
          collection(db, 'notifications'),
          where('userId', '==', userId),
          where('type', '==', 'expiration_alert'),
          where('ingredientId', '==', ingredient.id),
          where('createdAt', '>=', Timestamp.fromDate(new Date(today.setHours(0, 0, 0, 0))))
        )
      );
      
      if (existingNotifications.docs.length === 0) {
        await addNotification({
          type: 'expiration_alert',
          title: 'Ingredient Expiring Soon',
          message: message,
          urgencyLevel: urgencyLevel,
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          expirationDate: Timestamp.fromDate(ingredient.expirationDate),
          daysUntilExpiration: ingredient.daysUntilExpiration
        });
      }
    }
    
    return expiringIngredients;
  } catch (error) {
    console.error('Error checking expiring ingredients:', error);
    throw error;
  }
};