import axios from 'axios';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Send a prompt to Claude API and get a response
 * @param {string} prompt - The prompt to send to Claude
 * @param {string} model - Claude model to use (default: claude-3-sonnet-20240229)
 * @param {number} maxTokens - Maximum tokens in response (default: 1024)
 * @returns {Promise} - Claude API response
 */
export const sendPromptToClaude = async (prompt, model = 'claude-3-sonnet-20240229', maxTokens = 1024) => {
  try {
    // Claude API requires an API key for authentication
    const apiKey = process.env.REACT_APP_CLAUDE_API_KEY;
    
    if (!apiKey) {
      throw new Error('Claude API key is not configured');
    }

    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: model,
        max_tokens: maxTokens,
        messages: [
          { role: 'user', content: prompt }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    return response.data.content[0].text;
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
};
