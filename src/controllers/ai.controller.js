const { createCompletion } = require('../config/together.config');
const Chat = require('../models/chat.model');
const mongoose = require('mongoose');
const { default: axios } = require('axios');

// In-memory storage for chats when DB is not available
const inMemoryChats = new Map();

// API settings
const API_URL = process.env.TOGETHER_API_URL || 'https://api.together.xyz/v1';
const API_KEY = process.env.TOGETHER_API_KEY;

// Function to make responses more concise and readable
const makeResponseConcise = (response) => {
  // If response is already short enough, return as is
  if (response.length < 500) return response;
  
  // Break long responses into bullet points if possible
  if (!response.includes('•') && !response.includes('- ')) {
    const sentences = response.split(/\.\s+/);
    if (sentences.length > 3) {
      // Convert to bullet points
      const bulletPoints = sentences
        .filter(s => s.trim().length > 10) // Filter out very short sentences
        .map(s => `• ${s.trim()}`)
        .join('\n');
      return bulletPoints;
    }
  }
  
  // Truncate very long responses
  if (response.length > 1000) {
    // Find a good breaking point (end of a sentence)
    const truncatePoint = response.substring(0, 1000).lastIndexOf('.');
    if (truncatePoint > 0) {
      return response.substring(0, truncatePoint + 1) + 
        "\n\n(Note: I've provided a concise summary. If you'd like more details on any specific point, please ask.)";
    }
  }
  
  return response;
};

/**
 * Search for laws using Together API
 */
exports.searchLaws = async (req, res, next) => {
  try {
    const { query, category } = req.query;
    
    // Validate input
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide a valid search query (at least 2 characters)'
      });
    }
    
    // Prepare prompt for Together API
    let prompt = `Provide factual information about the following legal topic or law: "${query}"`;
    
    if (category && category !== 'All') {
      prompt += ` in the context of ${category}.`;
    }
    
    prompt += ' Include only verified, factual information, focusing on:';
    prompt += '\n1. Brief, factual definition and purpose of the law';
    prompt += '\n2. Key provisions, rights, or requirements';
    prompt += '\n3. Relevant legal references or citations';
    prompt += '\n4. Any important exceptions or limitations';
    prompt += '\nFormat as a structured search result with title, summary, and content sections. If you cannot find reliable information, state this clearly.';
    
    // Prepare messages for the AI model
    const messages = [
      {
        role: 'system',
        content: 'You are CARA, a Legal Assistant providing factual legal information. You provide direct, concise information about laws and legal topics in a structured format suitable for search results. Always cite legal standards or sources when available. If information is not reliable or available, clearly state this rather than making assumptions.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];
    
    // Get response from AI
    const completion = await createCompletion(messages, {
      temperature: 0.3, // Lower temperature for more factual, consistent responses
      max_tokens: 1200  // Increased token limit for comprehensive search results
    });
    
    // Extract AI response
    const aiResponse = completion.choices[0].message.content;
    
    // Process the response to extract search results
    let searchResults = [];
    try {
      // Check if the response looks like JSON or can be parsed as structured data
      if (aiResponse.includes('{') && aiResponse.includes('}')) {
        // Try to extract JSON-like content if it exists
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonPart = jsonMatch[0];
          searchResults = [JSON.parse(jsonPart)];
        }
      } else {
        // Otherwise, extract title, summary, and content sections
        const sections = aiResponse.split(/\n\n|\r\n\r\n/);
        
        // Find title section (usually the first non-empty line)
        let title = '';
        for (const section of sections) {
          const trimmed = section.trim();
          if (trimmed && !trimmed.startsWith('•') && !trimmed.startsWith('-')) {
            title = trimmed.replace(/^(Title|Topic|Law):?\s*/i, '');
            break;
          }
        }
        
        // Find summary and content
        let summary = '';
        let content = '';
        
        // Look for summary section
        const summaryMatch = aiResponse.match(/Summary:?\s*([\s\S]*?)(?=(Content|Key Provisions|References|Exceptions):?|$)/i);
        if (summaryMatch && summaryMatch[1]) {
          summary = summaryMatch[1].trim();
        }
        
        // Remaining content
        content = aiResponse.replace(title, '').replace(summary, '').trim();
        if (!content && !summary) {
          content = aiResponse;
        }
        
        // Create a search result object
        searchResults = [{
          id: Date.now().toString(),
          title: title || query,
          category: category || 'Legal Information',
          summary: summary || aiResponse.substring(0, 150) + '...',
          content: content || aiResponse
        }];
      }
    } catch (error) {
      console.error('Error processing AI response:', error);
      // If parsing fails, create a simple result with the raw response
      searchResults = [{
        id: Date.now().toString(),
        title: query,
        category: category || 'Legal Information',
        summary: aiResponse.substring(0, 150) + '...',
        content: aiResponse
      }];
    }
    
    // Send response
    res.status(200).json({
      status: 'success',
      results: searchResults.length,
      data: {
        searchResults
      }
    });
  } catch (error) {
    console.error('Law Search Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while searching for laws'
    });
  }
};

/**
 * Get news about laws using Together API
 */
exports.getLawsNews = async (req, res, next) => {
  try {
    const { category } = req.query;
    
    // Prepare prompt for Together API
    let prompt = `Provide the latest news and updates about laws and legal developments`;
    
    if (category && category !== 'All') {
      prompt += ` related to ${category}`;
    }
    
    prompt += '. Include information about recent legislative changes, court decisions, or legal trends. For each news item, provide:';
    prompt += '\n1. A descriptive title';
    prompt += '\n2. Approximate date of the development';
    prompt += '\n3. A brief summary (2-3 sentences)';
    prompt += '\nLimit to 3-5 most relevant and recent items. If you cannot find reliable recent information, state this clearly.';
    
    // Prepare messages for the AI model
    const messages = [
      {
        role: 'system',
        content: 'You are CARA, a Legal Assistant providing factual legal information. You provide recent, factual news about laws and legal developments. Always include approximate dates when possible. If recent information is not available, clearly state this rather than making up details.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];
    
    // Get response from AI
    const completion = await createCompletion(messages, {
      temperature: 0.3, // Lower temperature for more factual, consistent responses
      max_tokens: 1000  // Appropriate token limit for news summary
    });
    
    // Extract AI response
    const aiResponse = completion.choices[0].message.content;
    
    // Process the response to extract news items
    let newsItems = [];
    try {
      // Split the response into sections (each news item)
      const sections = aiResponse.split(/\n\n|\r\n\r\n/);
      
      for (const section of sections) {
        if (section.trim().length < 10) continue;
        
        // Extract title, date, and summary
        const lines = section.split('\n');
        let title = '';
        let date = '';
        let summary = '';
        
        // First line is usually the title, possibly with a date
        if (lines.length > 0) {
          const firstLine = lines[0].trim();
          const dateMatch = firstLine.match(/\(([^)]+)\)$|(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{2,4}|[A-Za-z]+\s+\d{1,2},\s+\d{2,4})/);
          
          if (dateMatch) {
            date = dateMatch[0].replace(/[()]/g, '').trim();
            title = firstLine.replace(dateMatch[0], '').trim();
          } else {
            title = firstLine;
          }
          
          // Look for date in second line if not found in title
          if (!date && lines.length > 1) {
            const secondLine = lines[1].trim();
            const dateMatch2 = secondLine.match(/Date:?\s*(.+)|(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{2,4}|[A-Za-z]+\s+\d{1,2},\s+\d{2,4})/);
            if (dateMatch2) {
              date = dateMatch2[1] || dateMatch2[2] || dateMatch2[0];
              // Remove this line from further processing
              lines.splice(1, 1);
            }
          }
          
          // Remaining lines form the summary
          summary = lines.slice(1).join('\n').trim();
        }
        
        // Add to news items if we have enough information
        if (title) {
          newsItems.push({
            id: Date.now().toString() + newsItems.length,
            title,
            date: date || 'Recent',
            summary: summary || 'No additional details available.'
          });
        }
      }
      
      // If no structured news items could be extracted, create one from the raw response
      if (newsItems.length === 0) {
        newsItems = [{
          id: Date.now().toString(),
          title: category ? `Recent ${category} Updates` : 'Recent Legal Updates',
          date: 'Recent',
          summary: aiResponse
        }];
      }
    } catch (error) {
      console.error('Error processing AI news response:', error);
      // If parsing fails, create a simple result with the raw response
      newsItems = [{
        id: Date.now().toString(),
        title: category ? `Recent ${category} Updates` : 'Recent Legal Updates',
        date: 'Recent',
        summary: aiResponse
      }];
    }
    
    // Send response
    res.status(200).json({
      status: 'success',
      results: newsItems.length,
      data: {
        newsItems
      }
    });
  } catch (error) {
    console.error('Laws News Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching law news'
    });
  }
};

/**
 * Chat with the AI assistant
 */
exports.chatWithAI = async (req, res, next) => {
  try {
    const { message, chatId } = req.body;
    const userId = req.user ? req.user._id : 'anonymous-user';
    
    // Validate input
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        status: 'fail',
        message: 'Message is required and must be a string'
      });
    }
    
    let chat;
    let useInMemoryStorage = false;
    let validChatId = chatId;
    
    // Validate chatId is a valid ObjectId if provided
    if (chatId && !mongoose.isValidObjectId(chatId)) {
      console.warn(`Invalid chatId format: ${chatId}. Using in-memory storage.`);
      useInMemoryStorage = true;
      validChatId = null; // Don't use the invalid ID
    }
    
    // Check if MongoDB is available by checking mongoose connection state
    if (!Chat.db || !Chat.db.readyState || Chat.db.readyState !== 1) {
      console.warn('⚠️ MongoDB not connected, using in-memory storage for chat');
      useInMemoryStorage = true;
    }
    
    // Always use in-memory storage for dummy/test users to avoid ObjectId casting errors
    if (userId === 'dummy-user-id' || userId === 'anonymous-user' || !mongoose.isValidObjectId(userId)) {
      console.warn('⚠️ Using in-memory storage for test/dummy user');
      useInMemoryStorage = true;
    }
    
    if (useInMemoryStorage) {
      // Use in-memory storage instead of MongoDB
      if (validChatId && inMemoryChats.has(validChatId)) {
        chat = inMemoryChats.get(validChatId);
      } else {
        // Create new in-memory chat
        const newChatId = Date.now().toString();
        chat = {
          _id: newChatId,
          userId: userId,
          title: message.slice(0, 30) + '...',
          messages: []
        };
        inMemoryChats.set(newChatId, chat);
      }
    } else {
      // Use MongoDB for storage
      // If chatId is provided, find the existing chat
      if (validChatId) {
        chat = await Chat.findOne({ _id: validChatId, userId });
        
        if (!chat) {
          return res.status(404).json({
            status: 'fail',
            message: 'Chat not found'
          });
        }
      } else {
        // Create a new chat
        chat = await Chat.create({
          userId,
          title: message.slice(0, 30) + '...',
          messages: []
        });
      }
    }
    
    // Add user message to chat
    chat.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
    // Prepare messages for the AI model
    const formatMessages = [...chat.messages.map(msg => {
      // For user messages, append a reminder for concise responses
      if (msg.role === 'user') {
        return {
          role: msg.role,
          content: msg.content + "\n\nPlease keep your response brief and to the point."
        };
      }
      return {
        role: msg.role,
        content: msg.content
      };
    })];
    
    // Ensure the system message is at the beginning
    if (!formatMessages.some(msg => msg.role === 'system')) {
      formatMessages.unshift({
        role: 'system',
        content: 'You are CARA, a helpful Legal Assistant. Provide information about legal matters clearly and concisely. IMPORTANT: Keep your responses short and to the point - use 2-3 sentences for each point and avoid long explanations. Use simple language and break information into bullet points when appropriate. While you can help with understanding legal documents and concepts, clarify that you do not provide legal advice and users should consult with a qualified attorney for specific legal advice.'
      });
    }
    
    // Get response from AI with timeout handling
    const completionPromise = createCompletion(formatMessages);
    
    // Set a timeout for the AI response (30 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('AI response timeout'));
      }, 30000);
    });
    
    // Use Promise.race to implement timeout
    const completion = await Promise.race([completionPromise, timeoutPromise])
      .catch(error => {
        console.error('AI response error:', error);
        // Return a default response object in case of error
        return {
          choices: [
            {
              message: {
                content: "I apologize, but I'm having some trouble processing your request right now. Please try again shortly.",
                role: 'assistant'
              }
            }
          ]
        };
      });
    
    // Extract AI response
    let aiResponse = completion.choices[0].message.content;
    
    // Post-process to make responses more concise
    aiResponse = makeResponseConcise(aiResponse);
    
    // Add AI response to chat
    chat.messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    });
    
    if (useInMemoryStorage) {
      // Update in-memory chat storage
      inMemoryChats.set(chat._id, chat);
    } else {
      // Save chat to MongoDB and handle potential errors
      try {
        await chat.save();
      } catch (saveError) {
        console.error('Error saving chat to MongoDB:', saveError);
        // Continue processing even if save fails
      }
    }
    
    // Send response
    res.status(200).json({
      status: 'success',
      data: {
        chatId: chat._id,
        message: aiResponse
      }
    });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while processing your request'
    });
  }
};

/**
 * Get all chats for a user
 */
exports.getUserChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .select('title createdAt updatedAt');
    
    res.status(200).json({
      status: 'success',
      results: chats.length,
      chats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single chat by ID
 */
exports.getChatById = async (req, res, next) => {
  try {
    const chatId = req.params.id;
    
    // Validate that the ID is a valid ObjectId
    if (!mongoose.isValidObjectId(chatId)) {
      console.warn(`Invalid chatId format requested: ${chatId}`);
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid chat ID format'
      });
    }
    
    const chat = await Chat.findOne({ 
      _id: chatId,
      userId: req.user._id
    });
    
    if (!chat) {
      return res.status(404).json({
        status: 'fail',
        message: 'Chat not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      chat
    });
  } catch (error) {
    console.error('Error getting chat by ID:', error);
    next(error);
  }
};

/**
 * Delete a chat
 */
exports.deleteChat = async (req, res, next) => {
  try {
    const chatId = req.params.id;
    
    // Validate that the ID is a valid ObjectId
    if (!mongoose.isValidObjectId(chatId)) {
      console.warn(`Invalid chatId format for deletion: ${chatId}`);
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid chat ID format'
      });
    }
    
    const chat = await Chat.findOneAndDelete({
      _id: chatId,
      userId: req.user._id
    });
    
    if (!chat) {
      return res.status(404).json({
        status: 'fail',
        message: 'Chat not found'
      });
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    console.error('Error deleting chat:', error);
    next(error);
  }
}; 