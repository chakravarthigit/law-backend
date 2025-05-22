const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Get API key from environment
const API_KEY = process.env.TOGETHER_API_KEY;
const API_URL = process.env.TOGETHER_API_URL || 'https://api.together.xyz/v1';

if (!API_KEY) {
  console.error('Error: TOGETHER_API_KEY environment variable is not set');
  process.exit(1);
}

// Configure axios instance for Together API
const togetherApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Default model configuration
const defaultModelConfig = {
  model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
  max_tokens: 1000,
  temperature: 0.7,
  top_p: 0.9
};

// Test chat functionality
async function testChat() {
  console.log('\n📝 Testing chat functionality...');
  
  const messages = [
    {
      role: 'system',
      content: 'You are CARA, a helpful Legal Assistant.'
    },
    {
      role: 'user',
      content: 'What is a legal contract?'
    }
  ];
  
  try {
    console.log('Sending chat request to Together API...');
    
    const response = await togetherApi.post('/chat/completions', {
      ...defaultModelConfig,
      messages
    });
    
    console.log('✅ Chat API request successful!');
    console.log('\nSample response:');
    console.log('-------------------------');
    console.log(response.data.choices[0].message.content.substring(0, 300) + '...');
    console.log('-------------------------');
    
    return true;
  } catch (error) {
    console.error('❌ Chat API request failed:', error.response?.data || error.message);
    return false;
  }
}

// Test document analysis functionality
async function testDocumentAnalysis() {
  console.log('\n📄 Testing document analysis functionality...');
  
  // Create a sample document for testing
  const sampleDocument = `
STANDARD EMPLOYMENT AGREEMENT

This Employment Agreement ("Agreement") is made and effective as of [Date], by and between [Company Name] ("Employer") and [Employee Name] ("Employee").

1. EMPLOYMENT. Employer agrees to employ Employee and Employee agrees to accept employment with Employer upon the terms and conditions set forth herein.

2. TERM. The term of this Agreement shall be for a period of [Term Length], commencing on [Start Date] and terminating on [End Date], unless earlier terminated as provided herein.

3. DUTIES. Employee shall serve as [Position Title] and shall perform all duties assigned by Employer.

4. COMPENSATION. Employer shall pay Employee a base salary of [Annual Salary] per annum, payable in equal installments according to Employer's regular payroll schedule.

5. CONFIDENTIALITY. Employee agrees to maintain the confidentiality of all proprietary information of Employer.

6. GOVERNING LAW. This Agreement shall be governed by the laws of the state of [State].
`;
  
  const messages = [
    {
      role: 'system',
      content: 'You are CARA, a helpful Legal Assistant. Analyze the following document and provide insights about its legal implications.'
    },
    {
      role: 'user',
      content: `Please analyze this employment contract:\n\n${sampleDocument}`
    }
  ];
  
  try {
    console.log('Sending document analysis request to Together API...');
    
    const response = await togetherApi.post('/chat/completions', {
      ...defaultModelConfig,
      max_tokens: 1500, // Increase token limit for document analysis
      temperature: 0.5, // Lower temperature for more factual responses
      messages
    });
    
    console.log('✅ Document analysis API request successful!');
    console.log('\nSample analysis:');
    console.log('-------------------------');
    console.log(response.data.choices[0].message.content.substring(0, 300) + '...');
    console.log('-------------------------');
    
    return true;
  } catch (error) {
    console.error('❌ Document analysis API request failed:', error.response?.data || error.message);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('🧪 Testing Together API with key:', API_KEY.substring(0, 5) + '***' + API_KEY.substring(API_KEY.length - 4));
  
  try {
    const chatSuccess = await testChat();
    const docAnalysisSuccess = await testDocumentAnalysis();
    
    if (chatSuccess && docAnalysisSuccess) {
      console.log('\n✅ All Together API tests passed successfully!');
      console.log('Your API key is valid and working properly for both chat and document analysis.');
    } else {
      console.log('\n❌ Some Together API tests failed. Please check the error messages above.');
    }
  } catch (error) {
    console.error('\n❌ Tests failed with an unexpected error:', error);
  }
}

// Execute the tests
runTests(); 