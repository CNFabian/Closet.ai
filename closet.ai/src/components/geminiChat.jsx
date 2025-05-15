import React, { useState } from 'react';
import { geminiService } from '../services/gemini/gemini';

function GeminiChat() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setLoading(true);
    try {
      const result = await geminiService.generateContent(prompt);
      setResponse(result);
    } catch (error) {
      console.error('Error generating content:', error);
      setResponse('An error occurred while generating content.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gemini-chat">
      <h1>Gemini AI Chat</h1>
      
      <form onSubmit={handleSubmit}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask Gemini something..."
          rows={4}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </form>
      
      {response && (
        <div className="response">
          <h2>Gemini's Response:</h2>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
}

export default GeminiChat;