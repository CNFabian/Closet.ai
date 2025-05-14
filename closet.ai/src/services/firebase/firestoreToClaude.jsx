import { getCollection, getDocument, queryDocuments } from './firestore';

/**
 * Query Firestore documents and format them as a Claude prompt
 * @param {string} collectionName - Firestore collection to query
 * @param {Array} conditions - Query conditions (optional)
 * @param {Object} promptTemplate - Template with placeholders for formatting the prompt
 * @returns {string} - Formatted prompt for Claude API
 */
export const queryFirestoreForPrompt = async (collectionName, conditions = [], promptTemplate) => {
  try {
    // Query documents from Firestore
    const documents = await queryDocuments(collectionName, conditions);
    
    if (!documents || documents.length === 0) {
      throw new Error(`No documents found in ${collectionName} with the given conditions`);
    }
    
    // Format the documents as a prompt based on the template
    return formatDocumentsAsPrompt(documents, promptTemplate);
  } catch (error) {
    console.error('Error querying Firestore for prompt:', error);
    throw error;
  }
};

/**
 * Get a single document and format it as a Claude prompt
 * @param {string} collectionName - Firestore collection
 * @param {string} docId - Document ID
 * @param {Object} promptTemplate - Template with placeholders
 * @returns {string} - Formatted prompt for Claude API
 */
export const getDocumentForPrompt = async (collectionName, docId, promptTemplate) => {
  try {
    // Get the document from Firestore
    const document = await getDocument(collectionName, docId);
    
    if (!document) {
      throw new Error(`Document with ID ${docId} not found in ${collectionName}`);
    }
    
    // Format the document as a prompt
    return formatDocumentAsPrompt(document, promptTemplate);
  } catch (error) {
    console.error('Error getting document for prompt:', error);
    throw error;
  }
};

/**
 * Format a single document as a Claude prompt
 * @param {Object} document - Firestore document
 * @param {Object} template - Template object with placeholders
 * @returns {string} - Formatted prompt
 */
const formatDocumentAsPrompt = (document, template) => {
  if (!template || !template.text) {
    return JSON.stringify(document, null, 2);
  }
  
  let promptText = template.text;
  
  // Replace placeholders in the template with document values
  Object.keys(document).forEach(key => {
    const placeholder = `{{${key}}}`;
    
    if (promptText.includes(placeholder)) {
      let value = document[key];
      
      // Format value based on type if needed
      if (value instanceof Date) {
        value = value.toISOString();
      } else if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      
      // Replace all occurrences of the placeholder
      promptText = promptText.replace(new RegExp(placeholder, 'g'), value);
    }
  });
  
  return promptText;
};

/**
 * Format multiple documents as a Claude prompt
 * @param {Array} documents - Array of Firestore documents
 * @param {Object} template - Template object with placeholders
 * @returns {string} - Formatted prompt
 */
const formatDocumentsAsPrompt = (documents, template) => {
  if (!template) {
    // Default JSON formatting if no template provided
    return JSON.stringify(documents, null, 2);
  }
  
  if (template.format === 'json') {
    return JSON.stringify(documents, null, 2);
  }
  
  if (template.format === 'csv') {
    // Extract headers from first document
    const headers = Object.keys(documents[0]);
    const csvRows = [headers.join(',')];
    
    // Add document rows
    documents.forEach(doc => {
      const values = headers.map(header => {
        let value = doc[header];
        // Format dates and objects
        if (value instanceof Date) {
          return value.toISOString();
        } else if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value);
        }
        return value;
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  }
  
  if (template.format === 'custom' && template.text) {
    let promptText = template.text;
    
    // Replace document list placeholder
    if (promptText.includes('{{documents}}')) {
      const documentsText = documents.map((doc, index) => {
        return `Document ${index + 1}:\n${JSON.stringify(doc, null, 2)}`;
      }).join('\n\n');
      
      promptText = promptText.replace('{{documents}}', documentsText);
    }
    
    // Replace specific field placeholders for all documents
    if (promptText.includes('{{each:')) {
      const regex = /{{each:(.*?)}}/g;
      const matches = [...promptText.matchAll(regex)];
      
      matches.forEach(match => {
        const placeholder = match[0];
        const field = match[1].trim();
        
        const fieldValues = documents.map(doc => doc[field]).filter(Boolean);
        promptText = promptText.replace(placeholder, fieldValues.join('\n'));
      });
    }
    
    return promptText;
  }
  
  // Fallback to simple format
  return `I have the following data from my database:\n\n${JSON.stringify(documents, null, 2)}\n\n`;
};