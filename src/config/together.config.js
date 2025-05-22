const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

// Ensure environment variables are loaded
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Check if API key exists
const API_KEY = process.env.TOGETHER_API_KEY;

// Hardcoded API key as fallback to ensure functionality
// This should be replaced with your actual API key
const FALLBACK_API_KEY = 'bc70b22655a51378c3aca897a9673588d125a631ec5bf9f524425924cdadf5e1';

// Use the environment variable if available, otherwise use the fallback
const FINAL_API_KEY = API_KEY || FALLBACK_API_KEY;

if (!API_KEY) {
  console.warn('⚠️ Using hardcoded fallback API key - this is not recommended for production');
} else {
  console.log('✅ Together API key loaded successfully from environment');
}

// Configure axios instance for Together API
const togetherApi = axios.create({
  baseURL: process.env.TOGETHER_API_URL || 'https://api.together.xyz/v1',
  headers: {
    'Authorization': `Bearer ${FINAL_API_KEY}`,
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 second timeout
});

// Default model configuration
const defaultModelConfig = {
  model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
  max_tokens: 1000,
  temperature: 0.6,
  top_p: 0.9,
  top_k: 40,
  repetition_penalty: 1.1
};

// Fallback responses when API fails
const fallbackResponses = [
  "I apologize, but I'm currently experiencing technical difficulties. Please try again in a moment.",
  "I'm having trouble connecting to my knowledge base. Could you please repeat your question later?",
  "Sorry, there seems to be a temporary issue with my service. Please try again shortly.",
  "My systems are currently experiencing high traffic. Please try your question again in a few minutes."
];

// Get a random fallback response
const getRandomFallbackResponse = () => {
  const randomIndex = Math.floor(Math.random() * fallbackResponses.length);
  return fallbackResponses[randomIndex];
};

// Create a completion with Together API
const createCompletion = async (messages, options = {}) => {
  try {
    if (!API_KEY) {
      throw new Error('Together API key is not configured');
    }
    
    // Log the request for debugging
    console.log('📤 API Request:', { 
      model: defaultModelConfig.model,
      messageCount: messages.length,
      firstUserMessage: messages.find(m => m.role === 'user')?.content.substring(0, 50) + '...'
    });
    
    // Make the API request
    console.time('Together API Request Duration');
    const response = await togetherApi.post('/chat/completions', {
      ...defaultModelConfig,
      ...options,
      messages
    });
    console.timeEnd('Together API Request Duration');
    
    // Log successful response
    console.log('✅ Together API response successful!');
    
    return response.data;
  } catch (error) {
    // Detailed error logging
    console.error('❌ Together API Error:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
    
    if (error.code === 'ECONNABORTED') {
      console.error('Request timed out');
    }
    
    // Return fallback response in proper format
    return {
      choices: [
        {
          message: {
            content: getRandomFallbackResponse(),
            role: 'assistant'
          }
        }
      ]
    };
  }
};

module.exports = {
  togetherApi,
  createCompletion,
  defaultModelConfig
}; 