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
} from 'firebase/firestore';
import { db } from './config';
import fs from 'fs';
import path from 'path';

  // Save a collection to a JSON file (Node.js environment)
  export const saveCollectionToJsonFile = async (collectionName, filePath = null) => {
    try {
      // Use the existing getCollection function to get all documents
      const data = await getCollection(collectionName);
      
      // Convert data to a JSON string with pretty formatting
      const jsonString = JSON.stringify(data, null, 2);
      
      // Determine the file path
      const outputPath = filePath || path.join(process.cwd(), `${collectionName}.json`);
      
      // Ensure the directory exists
      const directory = path.dirname(outputPath);
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }
      
      // Write the file
      fs.writeFileSync(outputPath, jsonString);
      
      console.log(`Collection saved to ${outputPath}`);
      return { success: true, filePath: outputPath };
    } catch (error) {
      console.error('Error saving collection to file:', error);
      throw error;
    }
  };

  // Get collection as JSON object without saving to file
export const getCollectionAsJson = async (collectionName) => {
  try {
    // Use the existing getCollection function to get all documents
    const data = await getCollection(collectionName);
    return data;
  } catch (error) {
    console.error('Error getting collection as JSON:', error);
    throw error;
  }
};
  
  // Add a document to a collection
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
  
  // Get a document by ID
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
  
  // Get all documents from a collection
  export const getCollection = async (collectionName) => {
    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      throw error;
    }
  };
  
  // Query documents with filters
  export const queryDocuments = async (collectionName, conditions = [], sortBy = null, limitTo = null) => {
    try {
      let q = collection(db, collectionName);
      
      // Add where conditions
      if (conditions.length > 0) {
        conditions.forEach(condition => {
          q = query(q, where(condition.field, condition.operator, condition.value));
        });
      }
      
      // Add orderBy
      if (sortBy) {
        q = query(q, orderBy(sortBy.field, sortBy.direction || 'asc'));
      }
      
      // Add limit
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
  
  // Update a document
  export const updateDocument = async (collectionName, docId, data) => {
    try {
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date()
      });
      return true;
    } catch (error) {
      throw error;
    }
  };
  
  // Delete a document
  export const deleteDocument = async (collectionName, docId) => {
    try {
      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      throw error;
    }
  };