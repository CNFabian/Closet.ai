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
    limit 
  } from 'firebase/firestore';
  import { db } from './config';
  
  // Add a document to a collection
  export const addDocument = async (collectionName, data) => {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: new Date()
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