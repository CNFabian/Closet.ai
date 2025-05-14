import { useState, useCallback } from 'react';
import { queryFirestoreForPrompt, getDocumentForPrompt } from '../services/firebase/firestoreToClaude';
import { sendPromptToClaude } from '../services/claude/claude';

export const useClaudeWithFirestore = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);
  
  // Function to query multiple documents and send to Claude
  const queryAndPrompt = useCallback(async (collectionName, conditions = [], promptTemplate) => {
    setLoading(true);
    setError(null);
    
    try {
      const prompt = await queryFirestoreForPrompt(collectionName, conditions, promptTemplate);
      const claudeResponse = await sendPromptToClaude(prompt);
      
      setResponse(claudeResponse);
      return claudeResponse;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);


  // Function to get a single document and send to Claude
  const getDocumentAndPrompt = useCallback(async (collectionName, docId, promptTemplate) => {
    setLoading(true);
    setError(null);
    
    try {
      const prompt = await getDocumentForPrompt(collectionName, docId, promptTemplate);
      const claudeResponse = await sendPromptToClaude(prompt);
      
      setResponse(claudeResponse);
      return claudeResponse;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Function to send custom prompt with manual data formatting
  const sendCustomPrompt = useCallback(async (customPrompt, model, maxTokens) => {
    setLoading(true);
    setError(null);
    
    try {
      const claudeResponse = await sendPromptToClaude(customPrompt, model, maxTokens);
      
      setResponse(claudeResponse);
      return claudeResponse;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return {
    queryAndPrompt,
    getDocumentAndPrompt,
    sendCustomPrompt,
    loading,
    error,
    response
  };
};