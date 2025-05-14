import React, { useState, useEffect } from 'react';
//import { queryFirestoreForPrompt } from '../services/firebase/firestoreToClaude';
//import { sendPromptToClaude } from '../services/claude/claude';

const ClaudeWithFirestore = ({ collection, conditions = [], promptTemplate, onResponse }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);

  useEffect(() => {
    const fetchDataAndQueryClaude = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Step 1: Query Firestore and format data as a prompt
        const prompt = await queryFirestoreForPrompt(collection, conditions, promptTemplate);
        
        // Step 2: Send the formatted prompt to Claude API
        const claudeResponse = await sendPromptToClaude(prompt);
        
        // Step 3: Handle the response
        setResponse(claudeResponse);
        if (onResponse) {
          onResponse(claudeResponse);
        }
      } catch (err) {
        console.error('Error in Claude with Firestore flow:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDataAndQueryClaude();
  }, [collection, conditions, promptTemplate, onResponse]);
  
  return (
    <div className="claude-firestore-container">
      {loading && <div className="loading">Loading...</div>}
      {error && <div className="error">Error: {error}</div>}
      {response && (
        <div className="response">
          <h3>Claude Response:</h3>
          <div className="response-content">{response}</div>
        </div>
      )}
    </div>
  );
};

export default ClaudeWithFirestore;