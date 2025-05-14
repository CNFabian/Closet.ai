import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './config';
import { sendPromptToClaude } from '../services/claude/claude';

/**
 * Sets up a real-time listener for Firestore data and streams updates to Claude
 * @param {string} collectionPath - Firestore collection path 
 * @param {Array} whereConditions - Array of conditions for filtering
 * @param {Function} promptFormatter - Function to format data as a prompt
 * @param {Function} onClaudeResponse - Callback for Claude responses
 * @returns {Function} - Unsubscribe function to stop the listener
 */
export const setupRealtimeClaudeIntegration = (
  collectionPath,
  whereConditions = [],
  promptFormatter,
  onClaudeResponse
) => {
  // Create a query reference
  let collectionRef = collection(db, collectionPath);
  
  // Apply where conditions if provided
  if (whereConditions.length > 0) {
    const constraints = whereConditions.map(condition => 
      where(condition.field, condition.operator, condition.value)
    );
    
    collectionRef = query(collectionRef, ...constraints);
  }
  
  // Set up the real-time listener
  const unsubscribe = onSnapshot(
    collectionRef,
    async (snapshot) => {
      // Convert the snapshot to an array of documents
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (documents.length > 0) {
        try {
          // Format the data as a prompt
          const prompt = promptFormatter(documents);
          
          // Send the prompt to Claude
          const claudeResponse = await sendPromptToClaude(prompt);
          
          // Call the callback with the response
          if (onClaudeResponse) {
            onClaudeResponse(claudeResponse, documents);
          }
        } catch (error) {
          console.error('Error in real-time Claude integration:', error);
        }
      }
    },
    (error) => {
      console.error('Error setting up Firestore listener:', error);
    }
  );
  
  // Return the unsubscribe function
  return unsubscribe;
};